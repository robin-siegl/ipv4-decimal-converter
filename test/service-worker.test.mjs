import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, cp, mkdtemp, appendFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, afterAll, test } from 'vitest';
import vm from 'node:vm';
import { prepareOfflineCache } from '../scripts/prepare-offline-cache.mjs';

const root = new URL('../', import.meta.url);
let suiteDirectory;
let workerSource;
const styleAsset = 'main.123.css';

beforeAll(async () => {
  suiteDirectory = await mkdtemp(path.join(tmpdir(), 'ipv4-worker-suite-'));
  await mkdir(path.join(suiteDirectory, 'assets'));
  await Promise.all([
    writeFile(path.join(suiteDirectory, 'index.html'), '<html><head><title>IPv4 ↔ Decimal</title><link rel="stylesheet" href="./assets/main.123.css"><link rel="icon" href="./favicon.svg"></head><body><div id="root"></div><script type="module" src="./assets/main.123.js"></script></body></html>'),
    writeFile(path.join(suiteDirectory, 'assets/main.123.js'), 'export const app = "converter";'),
    writeFile(path.join(suiteDirectory, 'assets/main.123.css'), 'body { color: #242424; }'),
    writeFile(path.join(suiteDirectory, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>'),
  ]);
  await prepareOfflineCache(suiteDirectory);
  workerSource = await readFile(path.join(suiteDirectory, 'sw.js'), 'utf8');
});

afterAll(async () => {
  if (suiteDirectory) await rm(suiteDirectory, { recursive: true, force: true });
});
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
    const content = await readFile(path.join(suiteDirectory, filename));
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
  assert.match(html, /id="root"/);
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
  assert.ok([...dependencies].some((name) => name.startsWith('assets/') && name.endsWith('.js')));
  assert.ok([...dependencies].some((name) => name.startsWith('assets/') && name.endsWith('.css')));
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
  worker.state.failedAsset = `/tool/assets/${styleAsset}`;
  await assert.rejects(worker.lifecycle('install'), /Precache failed/);
  assert.deepEqual(await worker.storage.keys(), ['ipv4-decimal-previous']);
  assert.equal(worker.state.skipped, 0);
  assert.equal(worker.state.claimed, 0);
});

test('asset changes automatically produce a new cache revision', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ipv4-offline-'));
  try {
    await cp(new URL('scripts/', root), path.join(directory, 'scripts'), { recursive: true });
    await cp(suiteDirectory, path.join(directory, 'dist'), { recursive: true });
    const script = path.join(directory, 'scripts/prepare-offline-cache.mjs');
    execFileSync(process.execPath, [script]);
    const before = await readFile(path.join(directory, 'dist/sw.js'), 'utf8');
    assert.equal(before, workerSource);
    await appendFile(path.join(directory, 'dist/assets', styleAsset), '\n/* Updated design. */\n');
    execFileSync(process.execPath, [script]);
    const after = await readFile(path.join(directory, 'dist/sw.js'), 'utf8');
    assert.notEqual(after.match(/const CACHE_NAME = '([^']+)'/)[1], before.match(/const CACHE_NAME = '([^']+)'/)[1]);
    execFileSync(process.execPath, [script]);
    assert.equal(await readFile(path.join(directory, 'dist/sw.js'), 'utf8'), after);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
