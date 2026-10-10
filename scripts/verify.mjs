import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const base = new URL('../', import.meta.url);
const html=fs.readFileSync(new URL('public/index.html',base),'utf8');
const worker=fs.readFileSync(new URL('worker.js',base),'utf8');
const backend=fs.readFileSync(new URL('backend.js',base),'utf8');
const cfg=JSON.parse(fs.readFileSync(new URL('wrangler.jsonc',base),'utf8'));
assert.equal(cfg.name,'sbml42');
assert.equal(cfg.main,'./worker.js');
assert.equal(cfg.keep_vars,true);
assert.ok(html.includes('Dashboard Monitoring SBML Kementerian/Lembaga'));
assert.ok(html.includes('logo-kemenkeu-transparent.png'));
const head=html.match(/<thead><tr>(.*?)<\/tr><\/thead>/s)?.[1]??'';
assert.equal((head.match(/<th\b/g)||[]).length,9,'Tabel harus memiliki sembilan kolom');
assert.ok(head.includes('<th>Keterangan</th>'));
assert.ok(!head.includes('Karakteristik K/L'));
for(const forbidden of ['<th class="row-actions">Aksi</th>','id="exportCsv"','id="exportJson"','id="print"','function exportCSV','function exportJSON','function csvCell','localStorage','id="importFile"','Data Lokal','Impor Data']){
  assert.ok(!html.includes(forbidden),`Komponen yang harus dihapus masih ada: ${forbidden}`);
}
for(const required of ['id="refresh"','id="openSheet"','id="addRecord"','id="search"','id="yearFilter"','id="klFilter"','id="typeFilter"','id="pie"','id="tbody"']){
  assert.ok(html.includes(required),`Fitur yang harus tetap ada hilang: ${required}`);
}
assert.ok(html.includes("keterangan:get('keterangan','karakteristik_kl','karakteristik k/l')"));
assert.ok(backend.includes("keterangan:['keterangan','karakteristik_kl','karakteristik_k_l']"));
assert.ok(worker.includes(JSON.stringify(html)),'worker.js belum dibangun dari HTML baru');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
console.log('PASS tampilan: 9 kolom, Keterangan, tanpa Aksi dan tombol ekspor/cetak');
const {default:app}=await import(new URL('worker.js',base));
const url='https://sbml42.example.workers.dev';
let res=await app.fetch(new Request(url+'/'),{});
assert.equal(res.status,200);
assert.ok((await res.text()).includes('Keterangan'));
res=await app.fetch(new Request(url+'/logo-kemenkeu-transparent.png'),{});
assert.equal(res.status,200);
assert.equal(res.headers.get('Content-Type'),'image/png');
const bytes=new Uint8Array(await res.arrayBuffer());
assert.deepEqual(Array.from(bytes.slice(0,4)),[137,80,78,71]);
res=await app.fetch(new Request(url+'/api/sbml'),{});
assert.equal(res.status,503);
console.log('PASS backend: dashboard, logo, API ketika belum terkonfigurasi');
const keys=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const raw=await webcrypto.subtle.exportKey('pkcs8',keys.privateKey);
const key='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(raw).toString('base64').match(/.{1,64}/g).join('\n')+'\n-----END PRIVATE KEY-----';
const env={SHEET_ID:'test-sheet',GOOGLE_CLIENT_EMAIL:'test@example.iam.gserviceaccount.com',GOOGLE_PRIVATE_KEY:key,SHEET_RANGE:'SBML!A:I'};
const cases=[
  ['Karakteristik K/L','Satuan K/L lama'],
  ['Keterangan','Keterangan baru']
];
const original=globalThis.fetch;
try{
  for(const [header,value] of cases){
    globalThis.fetch=async input=>{
      const requestUrl=String(input);
      if(requestUrl.includes('oauth2.googleapis.com')) return Response.json({access_token:'fake-token'});
      if(requestUrl.includes('sheets.googleapis.com')) return Response.json({values:[
        ['No','Nama KL','Tahun','No Surat / Tgl','Perihal','Surat Menkeu / Tgl',header,'Jenis SBML','Status'],
        ['1','Kementerian A','2026','S-1','Usulan A','S-2',value,'Honorarium','Disetujui'],
        ['2','Kementerian B','2025','S-3','Usulan B','S-4','Catatan lain','Transportasi','Ditolak']
      ]});
      throw new Error('URL tak diduga: '+requestUrl);
    };
    const response=await app.fetch(new Request(url+'/api/sbml'),env);
    assert.equal(response.status,200);
    const json=await response.json();
    assert.equal(json.source,'Google Sheets');
    assert.equal(json.data.length,2);
    assert.equal(json.data[0].keterangan,value,`Gagal mendukung header ${header}`);
    assert.equal(json.data[1].status,'Ditolak');
    assert.equal(Object.keys(json.data[0]).length,9);
    console.log('PASS API membaca header: '+header);
  }
}finally{globalThis.fetch=original}
console.log('Semua pengujian berhasil');
