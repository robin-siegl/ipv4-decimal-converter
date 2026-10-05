import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function prepareOfflineCache(directory = fileURLToPath(new URL('../dist/', import.meta.url))) {
  const assets = [];
  async function collect(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await collect(file);
      else if (entry.isFile() && entry.name !== 'sw.js' && !entry.name.endsWith('.map')) {
        assets.push(path.relative(directory, file).split(path.sep).join('/'));
      }
    }
  }
  await collect(directory);
  assets.sort();
  if (!assets.includes('index.html')) throw new Error('Build the app before generating its offline cache.');
  const template = await readFile(new URL('./service-worker.template.js', import.meta.url), 'utf8');
  const hash = createHash('sha256').update(template);
  for (const asset of assets) {
    hash.update(`\0${asset}\0`);
    hash.update(await readFile(path.join(directory, asset)));
  }
  const revision = hash.digest('hex').slice(0, 16);
  const worker = template
    .replace('__CACHE_REVISION__', revision)
    .replace('__PRECACHE_ASSETS__', JSON.stringify(assets.map((asset) => `./${asset}`), null, 2));
  await writeFile(path.join(directory, 'sw.js'), worker);
  return { revision, assets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { revision } = await prepareOfflineCache();
  console.log(`Prepared offline cache ${revision}.`);
}
