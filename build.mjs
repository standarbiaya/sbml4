import fs from 'node:fs';
const html=fs.readFileSync(new URL('./public/index.html',import.meta.url),'utf8');
const backend=fs.readFileSync(new URL('./backend.js',import.meta.url),'utf8');
fs.writeFileSync(new URL('./worker.js',import.meta.url),'// Generated from public/index.html and backend.js. Edit the HTML and run: npm run build\nconst DASHBOARD_HTML = '+JSON.stringify(html)+';\n'+backend);
console.log('Worker berhasil dibuat dari desain dashboard dan backend Google Sheets.');
