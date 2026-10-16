/* Offline smoke tests for Worker readiness (no Cloudflare credentials needed). */
const {execSync}=require('node:child_process');
const ts=(()=>{try{return require('typescript')}catch{return require(require('node:path').join(execSync('npm root -g',{encoding:'utf8'}).trim(),'typescript'))}})();
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const source=fs.readFileSync(path.resolve(__dirname,'../worker/index.ts'),'utf8');
const out=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
if(out.diagnostics.length)throw new Error(out.diagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; '));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sb-worker-'));
const compiled=path.join(dir,'worker.mjs');
fs.writeFileSync(compiled,out.outputText);
async function invoke(worker,path,env){return worker.fetch(new Request('https://sb.example'+path),env)}
(async()=>{
 const worker=(await import(pathToFileURL(compiled).href)).default;
 const missingTables={prepare(query){assert.ok(query.includes('sqlite_master'));return{async all(){return{results:[{name:'_cf_KV'}]}}}}};
 const readyTables=['settings','publications','items','rates','regulations','item_regulations','documents','faqs','sync_logs'];
 const ready={prepare(query){if(query.includes('sqlite_master'))return {async all(){return {results:readyTables.map(name=>({name}))}}};if(query.includes('FROM settings'))return {async first(){return null}};throw new Error('Unexpected '+query)}};
 let r=await invoke(worker,'/api/health',{});assert.equal(r.status,200);assert.equal((await r.json()).status,'ok');
 r=await invoke(worker,'/api/setup-status',{});assert.equal((await r.json()).database,'binding_missing');
 r=await invoke(worker,'/api/setup-status',{DB:missingTables});assert.equal((await r.json()).database,'schema_missing');
 r=await invoke(worker,'/api/summary',{DB:missingTables});assert.equal(r.status,200);assert.equal((await r.json()).setupRequired,true);
 r=await invoke(worker,'/api/items',{DB:missingTables});assert.equal(r.status,200);assert.deepEqual((await r.json()).data,[]);
 r=await invoke(worker,'/api/setup-status',{DB:ready});assert.equal((await r.json()).database,'ready');
 r=await invoke(worker,'/api/summary',{DB:ready});assert.equal(r.status,200);assert.equal((await r.json()).data.itemCount,0);
 fs.rmSync(dir,{recursive:true,force:true});
 console.log('PASS: health, DB missing binding, schema missing, empty API, DB ready paths (7 tests).');
})().catch(error=>{console.error(error);process.exitCode=1});
