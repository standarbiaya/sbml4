import fs from 'node:fs';
const html=fs.readFileSync(new URL('./public/index.html',import.meta.url),'utf8');
const backend=fs.readFileSync(new URL('./backend.js',import.meta.url),'utf8');
const logoBase64=fs.readFileSync(new URL('./public/logo-kemenkeu-transparent.png',import.meta.url)).toString('base64');
fs.writeFileSync(new URL('./worker.js',import.meta.url),
  '// Generated from public/index.html, logo image and backend.js. Edit HTML and run npm run build\n'+
  'const DASHBOARD_HTML = '+JSON.stringify(html)+';\n'+
  'const LOGO_KEMENKEU_B64 = '+JSON.stringify(logoBase64)+';\n'+backend);
console.log('Worker siap: dashboard dan logo Kemenkeu terintegrasi, tanpa folder public pada runtime.');
