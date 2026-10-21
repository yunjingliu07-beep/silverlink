import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const file of ['dist/index.html','dist/style.css','dist/app.js','dist/domain.js','dist/favicon.svg','dist/i18n.js','dist/i18n-en.js','dist/i18n-data.js','dist/community.js','dist/i18n-extra.js','dist/i18n-locales.js','dist/reader.js']) {
 if (!existsSync(file)) throw new Error(`Missing ${file}`);
 if (!readFileSync(file,'utf8').trim()) throw new Error(`Empty ${file}`);
}
for (const file of ['dist/app.js','dist/domain.js','dist/i18n.js','dist/i18n-en.js','dist/i18n-data.js','dist/community.js','dist/i18n-extra.js','dist/i18n-locales.js','dist/reader.js']) execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
console.log('Static site validation passed. Deploy the dist/ directory.');

if (!existsSync('dist/assets/community-help.png')) throw new Error('Missing generated community photo');
