import fs from 'node:fs';
import path from 'node:path';
const configName = 'wrangler.sbml.jsonc';
const cfg = JSON.parse(fs.readFileSync(configName, 'utf8'));
for (const name of ['worker.js','package.json','wrangler.sbml.jsonc']) {
  if (!fs.existsSync(path.resolve(name))) throw new Error('File wajib tidak ditemukan: '+name);
}
if (cfg.assets || JSON.stringify(cfg).includes('public')) throw new Error('Konfigurasi tidak boleh menggunakan assets.directory atau public');
if (cfg.main !== './worker.js') throw new Error('File entry-point harus ./worker.js');
const source = fs.readFileSync('worker.js','utf8');
if (!source.includes('Dashboard SBML') || !source.includes('/api/sbml')) throw new Error('Worker tidak memuat dashboard atau API');
console.log('LULUS: worker.js tersedia dan konfigurasi unik tanpa assets.directory.');
console.log('Deploy command wajib: npx wrangler deploy --config wrangler.sbml.jsonc');
