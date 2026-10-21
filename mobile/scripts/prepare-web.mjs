import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const target = resolve(root, 'www');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(resolve(root, '../dist'), target, { recursive: true });
const index = await readFile(resolve(target, 'index.html'), 'utf8');
await writeFile(
  resolve(target, 'index.html'),
  index.replace('<script type="module" src="./app.js"></script>',
    '<script type="module" src="./mobile.js"></script>'),
);
await build({
  entryPoints: [resolve(root, 'src/mobile.js')],
  outfile: resolve(target, 'mobile.js'),
  bundle: true,
  format: 'esm',
  external: ['./app.js'],
  target: 'chrome105',
  minify: true,
});
console.log('Prepared offline Android assets; website sources are unchanged.');
