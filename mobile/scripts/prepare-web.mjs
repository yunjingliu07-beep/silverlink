import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const target = resolve(root, 'www');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(resolve(root, '../dist'), target, { recursive: true });
// Capacitor serves extensionless paths as the root index, unlike a web server.
// Use the explicit second HTML entry point for in-app perspective navigation.
const application = resolve(target, 'app.js');
await writeFile(application, (await readFile(application, 'utf8'))
  .replaceAll('./manage/#', './manage/index.html#'));
// Each document needs its own bridge before loading the unchanged website UI.
for (const entry of ['index.html', 'manage/index.html']) {
  const path = resolve(target, entry);
  const index = await readFile(path, 'utf8');
  const script = '<script type="module" src="./app.js"></script>';
  if (!index.includes(script)) throw new Error(`Missing application entry in ${entry}`);
  await writeFile(path, index.replace(script,
    `<script type="module" src="${entry.startsWith('manage/') ? '../' : './'}mobile.js"></script>`));
}
await build({
  entryPoints: [resolve(root, 'src/mobile.js')],
  outfile: resolve(target, 'mobile.js'),
  bundle: true,
  format: 'esm',
  external: ['./app.js', './manage/app.js'],
  target: 'chrome105',
  minify: true,
});
console.log('Prepared offline Android assets; website sources are unchanged.');
