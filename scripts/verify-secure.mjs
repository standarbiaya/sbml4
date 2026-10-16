import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pbkdf2Sync, randomBytes, webcrypto } from 'node:crypto';
import vm from 'node:vm';

const base = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, base), 'utf8');
const dashboard = read('public/index.html');
const login = read('public/login.html');
const backend = read('backend.js');
const workerText = read('worker.js');
const config = JSON.parse(read('wrangler.jsonc'));
assert.equal(config.name, 'sbml42');
assert.equal(config.keep_vars, true);
assert.equal(config.main, './worker.js');
assert.ok(dashboard.includes('Keterangan'));
assert.ok(dashboard.includes('id="legendOther"'));
assert.ok(dashboard.includes("const counts=[accepted,rejected,other]"));
assert.ok(dashboard.includes('Proses/Status Lain'));
assert.equal((dashboard.match(/<th\b/g) || []).length, 9);
assert.ok(!dashboard.includes('id="exportCsv"'));
assert.ok(!dashboard.includes('id="exportJson"'));
assert.ok(!dashboard.includes('id="print"'));
assert.ok(!dashboard.includes('id="importFile"'));
assert.ok(!dashboard.includes('localStorage'));
assert.ok(dashboard.includes('id="logout"'));
assert.ok(login.includes('id="loginForm"'));
assert.ok(read('public/login.js').includes('PROD_HOST'));
assert.ok(read('public/login.js').includes("type.includes('application/json')"));
assert.ok(workerText.includes(JSON.stringify(dashboard)));
assert.ok(workerText.includes(JSON.stringify(login)));
new vm.Script(dashboard.match(/<script>([\s\S]*?)<\/script>/)[1]);
console.log('PASS: struktur dashboard dan halaman login');

const { default: app } = await import(new URL('worker.js', base));
const host = 'https://sbml42.example.workers.dev';
const cookieHeaders = { Origin: host, 'Content-Type': 'application/json' };
const password = 'UjiPasswordKU!2026Panjang';
const salt = randomBytes(24);
const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
const env = {
  LOGIN_USERNAME: 'admin_sbml',
  LOGIN_PASSWORD_HASH: 'pbkdf2_sha256$100000$' + salt.toString('base64url') + '$' + hash.toString('base64url'),
  SESSION_SECRET: randomBytes(48).toString('base64url'),
  SHEET_ID: 'data-000', GOOGLE_CLIENT_EMAIL: 'reader@example.iam.gserviceaccount.com', SHEET_RANGE: 'SBML!A:I'
};
let response = await app.fetch(new Request(host + '/'), env);
assert.equal(response.status, 302);
assert.equal(response.headers.get('Location'), '/login');
response = await app.fetch(new Request(host + '/api/sbml'), env);
assert.equal(response.status, 401);
assert.equal(response.headers.get('Cache-Control'), 'no-store, private');
response = await app.fetch(new Request(host + '/api/config-check'), env);
assert.equal(response.status, 401);
response = await app.fetch(new Request(host + '/'), {});
assert.equal(response.status, 302, 'fail closed when no credentials');
response = await app.fetch(new Request(host + '/login'), env);
assert.equal(response.status, 200);
assert.ok((await response.text()).includes('Masuk ke Dashboard'));
response = await app.fetch(new Request(host + '/api/health'), {});
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { service: 'Dashboard SBML', version: '4.4.0', api: 'online', login: '/api/login', loginConfiguration: { configured: false, missingOrInvalid: ['LOGIN_USERNAME','LOGIN_PASSWORD_HASH','SESSION_SECRET'] } });
response = await app.fetch(new Request(host + '/api/login'), {});
assert.equal(response.status, 405);
assert.equal(response.headers.get('content-type')?.includes('application/json'), true);
assert.equal((await response.json()).version, '4.4.0');
response = await app.fetch(new Request(host + '/login.js'), env);
assert.equal(response.status, 200);
response = await app.fetch(new Request(host + '/logo-kemenkeu-transparent.png'), {});
assert.equal(response.status, 200);
console.log('PASS: proteksi server-side HTML, API, halaman login dan logo');
response = await app.fetch(new Request(host + '/api/health'), env);
const health = await response.json();
assert.equal(health.version, '4.4.0');
assert.equal(health.loginConfiguration.configured, true);
assert.deepEqual(health.loginConfiguration.missingOrInvalid, []);
console.log('PASS: pemeriksaan konfigurasi login tanpa mengungkap rahasia');

// Regression: old 210,000-iteration hash must be diagnosed as incompatible before WebCrypto.
const oldHash = 'pbkdf2_sha256$210000$' + salt.toString('base64url') + '$' + pbkdf2Sync(password, salt, 210000, 32, 'sha256').toString('base64url');
const oldEnv = { ...env, LOGIN_PASSWORD_HASH: oldHash };
const oldHealth = await (await app.fetch(new Request(host + '/api/health'), oldEnv)).json();
assert.equal(oldHealth.loginConfiguration.configured, false);
assert.deepEqual(oldHealth.loginConfiguration.missingOrInvalid, ['LOGIN_PASSWORD_HASH']);
let oldLogin = await app.fetch(new Request(host + '/api/login', { method: 'POST', headers: cookieHeaders, body: JSON.stringify({ username: env.LOGIN_USERNAME, password }) }), oldEnv);
assert.equal(oldLogin.status, 503, 'old hash should receive explanatory config error rather than HTTP 500');
console.log('PASS: hash lama 210k terdeteksi tanpa kesalahan 500');
const loginRequest = (username, pass, headers = cookieHeaders) => new Request(host + '/api/login', { method: 'POST', headers, body: JSON.stringify({ username, password: pass }) });
response = await app.fetch(loginRequest('admin_sbml', password, { 'Content-Type': 'application/json' }), env);
assert.equal(response.status, 403, 'Origin is required for login POST');
response = await app.fetch(loginRequest('admin_sbml', 'SalahPassword-2026'), env);
assert.equal(response.status, 401);
response = await app.fetch(loginRequest('nama-salah', password), env);
assert.equal(response.status, 401);
response = await app.fetch(loginRequest('admin_sbml', password), {});
assert.equal(response.status, 503);
response = await app.fetch(loginRequest('admin_sbml', password), env);
assert.equal(response.status, 200);
const setCookie = response.headers.get('Set-Cookie');
assert.ok(setCookie.includes('__Host-sbml_session='));
for (const attr of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=28800']) assert.ok(setCookie.includes(attr));
const cookie = setCookie.split(';')[0];
const authHeaders = { Cookie: cookie };
response = await app.fetch(new Request(host + '/', { headers: authHeaders }), env);
assert.equal(response.status, 200);
let html = await response.text();
assert.ok(html.includes('Matriks Inventarisasi SBML'));
assert.ok(html.includes('⇥ Keluar'));
const csp = response.headers.get('Content-Security-Policy');
assert.ok(csp.includes("script-src 'sha256-"));
assert.ok(!csp.includes("script-src 'unsafe-inline'"));
response = await app.fetch(new Request(host + '/login', { headers: authHeaders }), env);
assert.equal(response.status, 302);
let forged = cookie.slice(0, -3) + 'ABC';
response = await app.fetch(new Request(host + '/api/sbml', { headers: { Cookie: forged } }), env);
assert.equal(response.status, 401);
response = await app.fetch(new Request(host + '/api/sbml', { headers: authHeaders }), { ...env, SESSION_SECRET: randomBytes(48).toString('base64url') });
assert.equal(response.status, 401, 'rotating session secret revokes old sessions');
console.log('PASS: login, hash PBKDF2, signed Secure HttpOnly cookie, tamper check, session rotation');

const googleKeys = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const pemRaw = await webcrypto.subtle.exportKey('pkcs8', googleKeys.privateKey);
const pem = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(pemRaw).toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----';
const authorizedEnv = { ...env, GOOGLE_PRIVATE_KEY: pem };
const fetchOld = globalThis.fetch;
try {
  globalThis.fetch = async input => {
    if (String(input).includes('oauth2.googleapis.com/token')) return Response.json({ access_token: 'test-token' });
    if (String(input).includes('sheets.googleapis.com')) return Response.json({ values: [
      ['No', 'Nama KL', 'Tahun', 'No Surat / Tgl', 'Perihal', 'Surat Menkeu / Tgl', 'Karakteristik K/L', 'Jenis SBML', 'Status'],
      ['1', 'Kementerian A', '2026', 'S-1', 'Uji SBML', 'S-2', 'Keterangan lama', 'Honorarium', 'Disetujui'],
      ['2', 'Kementerian B', '2025', 'S-3', 'Uji SBML 2', 'S-4', 'Keterangan lainnya', 'Transportasi', 'Ditolak']
    ] });
    throw Error('fetch URL unexpected ' + input);
  };
  response = await app.fetch(new Request(host + '/api/sbml', { headers: authHeaders }), authorizedEnv);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.data.length, 2);
  assert.equal(result.data[0].keterangan, 'Keterangan lama');
  assert.equal(result.data[0].status, 'Disetujui');
  assert.equal(result.source, 'Google Sheets');
  assert.equal(Object.keys(result.data[0]).length, 9);
} finally { globalThis.fetch = fetchOld; }
console.log('PASS: authenticated Google Sheets API, nine columns, legacy header supported');

response = await app.fetch(new Request(host + '/api/logout', { method: 'POST', headers: { ...authHeaders, Origin: host } }), env);
assert.equal(response.status, 200);
assert.ok(response.headers.get('Set-Cookie').includes('Max-Age=0'));
response = await app.fetch(new Request(host + '/api/logout', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://evil.example' } }), env);
assert.equal(response.status, 403);
console.log('PASS: logout and CSRF origin check');
console.log('SEMUA TES BERHASIL');
