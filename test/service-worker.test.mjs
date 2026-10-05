import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, cp, mkdtemp, appendFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const workerSource = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
const registrationSource = await readFile(new URL('../dist/offline.mjs', import.meta.url), 'utf8');
const origin = 'https://example.test';
const base = `${origin}/tool/`;

function createWorker() {
  const handlers = new Map();
  const stores = new Map();
  const state = { offline: false, failedAsset: null, skipped: 0, claimed: 0, requests: [] };
  async function network(request) {
    if (state.offline) throw new TypeError('Offline');
    const url = new URL(typeof request === 'string' ? request : request.url);
    if (url.pathname === state.failedAsset) return new Response('Unavailable', { status: 503 });
    state.requests.push(request);
    const filename = url.pathname.slice('/tool/'.length) || 'index.html';
    const content = await readFile(new URL(`dist/${filename}`, root));
    return new Response(content);
  }
  const storage = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(requests) {
          const responses = await Promise.all(requests.map(network));
          if (responses.some((response) => !response.ok)) throw new TypeError('Precache failed');
          requests.forEach((request, index) => entries.set(request.url, responses[index]));
        },
        async match(url) { return entries.get(typeof url === 'string' ? url : url.url)?.clone(); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  vm.runInNewContext(workerSource, {
    URL, Request,
    caches: storage,
    fetch: network,
    self: {
      location: { href: `${base}sw.js` },
      addEventListener(name, handler) { handlers.set(name, handler); },
      async skipWaiting() { state.skipped += 1; },
      clients: { async claim() { state.claimed += 1; } },
    },
  });
  return {
    state, storage, stores,
    async lifecycle(name) {
      let work;
      handlers.get(name)({ waitUntil(promise) { work = promise; } });
      await work;
    },
    fetch(url, options = {}) {
      let response;
      handlers.get('fetch')({
        request: { url, method: 'GET', mode: 'cors', ...options },
        respondWith(promise) { response = promise; },
      });
      return response;
    },
  };
}

test('loads the page and its full local dependency graph with the network offline', async () => {
  const worker = createWorker();
  await worker.lifecycle('install');
  await worker.lifecycle('activate');
  worker.state.offline = true;
  const response = await worker.fetch(`${base}?example=127.0.0.1`, { mode: 'navigate' });
  const html = await response.text();
  assert.match(html, /<title>IPv4 ↔ Decimal<\/title>/);
  assert.match(html, /id="ipv4"/);
  const dependencies = new Set([...html.matchAll(/(?:href|src)="\.\/([^"]+)"/g)].map((match) => match[1]));
  for (const dependency of dependencies) {
    const content = await (await worker.fetch(`${base}${dependency}?v=test`)).text();
    assert.ok(content.length > 0, dependency);
    if (dependency.endsWith('.mjs')) {
      for (const match of content.matchAll(/from ['"]\.\/([^'"]+)['"]/g)) {
        dependencies.add(match[1]);
      }
    }
  }
  assert.ok(dependencies.has('conversion.mjs'));
  assert.ok(dependencies.has('offline.mjs'));
  const explicitIndex = await worker.fetch(`${base}index.html`, { mode: 'navigate' });
  assert.equal(await explicitIndex.text(), html);
  assert.equal(worker.state.skipped, 1);
  assert.equal(worker.state.claimed, 1);
});

test('does not intercept external URLs, unknown routes, or non-GET requests', async () => {
  const worker = createWorker();
  assert.equal(worker.fetch('https://other.test/style.css'), void 0);
  assert.equal(worker.fetch(`${origin}/other/index.html`, { mode: 'navigate' }), void 0);
  assert.equal(worker.fetch(`${base}login`, { mode: 'navigate' }), void 0);
  assert.equal(worker.fetch(`${base}sw.js`), void 0);
  assert.equal(worker.fetch(`${base}app.mjs`, { method: 'POST' }), void 0);
});

test('activation removes only previous caches for this converter', async () => {
  const worker = createWorker();
  await worker.storage.open('ipv4-decimal-previous');
  await worker.storage.open('another-app-cache');
  await worker.lifecycle('install');
  await worker.lifecycle('activate');
  const names = await worker.storage.keys();
  assert.equal(names.includes('ipv4-decimal-previous'), false);
  assert.equal(names.includes('another-app-cache'), true);
  assert.equal(names.filter((name) => name.startsWith('ipv4-decimal-')).length, 1);
});

test('a failed install preserves a working older cache and never activates', async () => {
  const worker = createWorker();
  await worker.storage.open('ipv4-decimal-previous');
  worker.state.failedAsset = '/tool/style.css';
  await assert.rejects(worker.lifecycle('install'), /Precache failed/);
  assert.deepEqual(await worker.storage.keys(), ['ipv4-decimal-previous']);
  assert.equal(worker.state.skipped, 0);
  assert.equal(worker.state.claimed, 0);
});

test('asset changes automatically produce a new cache revision', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ipv4-offline-'));
  try {
    await cp(new URL('scripts/', root), path.join(directory, 'scripts'), { recursive: true });
    await cp(new URL('dist/', root), path.join(directory, 'dist'), { recursive: true });
    const script = path.join(directory, 'scripts/prepare-offline-cache.mjs');
    execFileSync(process.execPath, [script]);
    const before = await readFile(path.join(directory, 'dist/sw.js'), 'utf8');
    assert.equal(before, workerSource);
    await appendFile(path.join(directory, 'dist/style.css'), '\n/* Updated design. */\n');
    execFileSync(process.execPath, [script]);
    const after = await readFile(path.join(directory, 'dist/sw.js'), 'utf8');
    assert.notEqual(after.match(/const CACHE_NAME = '([^']+)'/)[1], before.match(/const CACHE_NAME = '([^']+)'/)[1]);
    execFileSync(process.execPath, [script]);
    assert.equal(await readFile(path.join(directory, 'dist/sw.js'), 'utf8'), after);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('offline status waits until registration and installation finish', async () => {
  const status = { textContent: '' };
  let load;
  let registered = false;
  let finishInstall;
  const ready = new Promise((resolve) => { finishInstall = resolve; });
  vm.runInNewContext(registrationSource, {
    navigator: { serviceWorker: {
      async register(url, options) {
        assert.equal(url, './sw.js');
        assert.equal(options.scope, './');
        assert.equal(options.updateViaCache, 'none');
        registered = true;
      },
      ready,
    } },
    document: { readyState: 'interactive', getElementById: () => status },
    window: { addEventListener(name, callback) { assert.equal(name, 'load'); load = callback; } },
  });
  assert.equal(registered, false);
  const installing = load();
  await Promise.resolve();
  assert.equal(registered, true);
  assert.equal(status.textContent, '');
  finishInstall();
  await installing;
  assert.equal(status.textContent, ' Available offline.');
});

test('unsupported or rejected registration leaves normal online use available', async () => {
  for (const navigator of [{}, { serviceWorker: { async register() { throw new Error('Storage blocked'); } } }]) {
    let load;
    const status = { textContent: '' };
    vm.runInNewContext(registrationSource, {
      navigator,
      document: { readyState: 'interactive', getElementById: () => status },
      window: { addEventListener(name, callback) { load = callback; } },
    });
    if (load) await load();
    assert.equal(status.textContent, '');
  }
});
