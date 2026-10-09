import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const missing=['wrangler.jsonc','worker.js','package.json','public/index.html'].filter(x=>!fs.existsSync(path.join(root,x)));
console.log('Folder deployment:',root);
if(missing.length){console.error('GAGAL: File tidak ada pada Root directory:',missing.join(', ')); console.error('Unggah ISI file ZIP ke root repository GitHub dan set Cloudflare Root directory ke root repository.');process.exit(1)}
const cfg=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
if(!cfg.main||!fs.existsSync(path.join(root,cfg.main))||cfg.assets){console.error('Konfigurasi Wrangler tidak benar: main harus valid dan assets tidak digunakan.');process.exit(1)}
const worker=fs.readFileSync(path.join(root,'worker.js'),'utf8');
if(!worker.includes('/api/sbml')||!worker.includes('DASHBOARD_HTML')){console.error('Kode Worker tidak lengkap');process.exit(1)}
console.log('OK: file deployment tersedia, Worker utama valid, tidak ada assets.directory.');
