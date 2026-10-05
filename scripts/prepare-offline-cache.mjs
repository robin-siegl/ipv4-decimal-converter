import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const assets = ['index.html', 'style.css', 'app.mjs', 'conversion.mjs', 'offline.mjs', 'favicon.svg'];
const template = await readFile(new URL('./service-worker.template.js', import.meta.url), 'utf8');
const hash = createHash('sha256').update(template);
for (const asset of assets) {
  hash.update(`\0${asset}\0`);
  hash.update(await readFile(new URL(`../dist/${asset}`, import.meta.url)));
}
const revision = hash.digest('hex').slice(0, 16);
const worker = template
  .replace('__CACHE_REVISION__', revision)
  .replace('__PRECACHE_ASSETS__', JSON.stringify(assets.map((asset) => `./${asset}`), null, 2));
await writeFile(new URL('../dist/sw.js', import.meta.url), worker);
console.log(`Prepared offline cache ${revision}.`);
