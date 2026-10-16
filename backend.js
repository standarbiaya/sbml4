// Dashboard SBML - Cloudflare Workers, authenticated read-only Google Sheets.
// Never expose Google credentials, login password hashes or session signing keys to the browser.

const FIELDS = ['no','nama_kl','tahun','no_surat_tgl','perihal','surat_menkeu_tgl','keterangan','jenis_sbml','status'];
const COOKIE = '__Host-sbml_session';
const SESSION_SECONDS = 8 * 60 * 60;
// Best-effort local throttle. Also enable Cloudflare WAF/Access for distributed rate limiting.
const failedAttempts = new Map();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 8;
function loginAttemptBucket(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  let item = failedAttempts.get(ip);
  if (item && now - item.since >= ATTEMPT_WINDOW_MS) { failedAttempts.delete(ip); item = undefined; }
  if (failedAttempts.size > 3000) failedAttempts.delete(failedAttempts.keys().next().value);
  return { ip, item };
}
function registerLoginFailure(ip, prior) {
  failedAttempts.set(ip, { count: (prior?.count || 0) + 1, since: prior?.since || Date.now() });
}
const encoder = new TextEncoder();

function b64url(data) {
  const bytes = typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function from64url(str) {
  if (typeof str !== 'string' || !/^[A-Za-z0-9_-]+$/.test(str)) throw Error('Base64 tidak valid');
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - str.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
function decode64url(str) { return new TextDecoder('utf-8', { fatal: true }).decode(from64url(str)); }
const securityHeaders = {
  'Cache-Control': 'no-store, private',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Vary': 'Cookie'
};
function json(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: { ...securityHeaders, ...extra } });
}
function loginConfigured(env) {
  return typeof env.LOGIN_USERNAME === 'string' && env.LOGIN_USERNAME.trim().length >= 2 &&
    typeof env.LOGIN_PASSWORD_HASH === 'string' && env.LOGIN_PASSWORD_HASH.startsWith('pbkdf2_sha256$') &&
    typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 43;
}
function cookieValue(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}
async function signingKey(env) {
  return crypto.subtle.importKey('raw', encoder.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function createSession(username, env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ v: 1, sub: username, iat: now, exp: now + SESSION_SECONDS }));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(payload));
  return payload + '.' + b64url(signature);
}
async function validSession(request, env) {
  if (!loginConfigured(env)) return false; // Fail closed, including API access.
  const raw = cookieValue(request, COOKIE);
  if (!raw || raw.length > 2048) return false;
  const parts = raw.split('.');
  if (parts.length !== 2) return false;
  try {
    const payload = parts[0], signature = from64url(parts[1]);
    if (payload.length > 1000 || signature.length !== 32) return false;
    const valid = await crypto.subtle.verify('HMAC', await signingKey(env), signature, encoder.encode(payload));
    if (!valid) return false;
    const decoded = JSON.parse(decode64url(payload));
    const now = Math.floor(Date.now() / 1000);
    return decoded.v === 1 && decoded.sub === env.LOGIN_USERNAME && Number.isInteger(decoded.iat) &&
      Number.isInteger(decoded.exp) && decoded.iat <= now + 60 && decoded.exp > now && decoded.exp - decoded.iat <= SESSION_SECONDS;
  } catch { return false; }
}
function cookieHeader(token) {
  return COOKIE + '=' + token + '; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=' + SESSION_SECONDS;
}
function clearCookie() {
  return COOKIE + '=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0';
}
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  // Browser fetch/POST always supplies Origin; do not allow origin-less POST.
  return origin != null && origin === new URL(request.url).origin;
}
async function verifyPassword(password, formattedHash) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 256) return false;
  const parts = formattedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
  const iterations = Number(parts[1]);
  if (!Number.isSafeInteger(iterations) || iterations < 150000 || iterations > 800000) return false;
  let salt, expected;
  try {
    salt = from64url(parts[2]);
    expected = from64url(parts[3]);
  } catch { return false; }
  if (salt.length !== 24 || expected.length !== 32) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256));
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
function htmlResponse(html, contentSecurityPolicy) {
  return new Response(html, {
    headers: {
      ...securityHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': contentSecurityPolicy
    }
  });
}
function redirect(location) {
  return new Response(null, { status: 302, headers: { ...securityHeaders, Location: location } });
}
async function tokenFor(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: env.GOOGLE_CLIENT_EMAIL, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const unsigned = header + '.' + payload;
  const pem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), v => v.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned));
  const jwt = unsigned + '.' + b64url(sig);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  if (!response.ok) throw new Error('Gagal autentikasi Google (' + response.status + ')');
  const json = await response.json();
  if (!json.access_token) throw new Error('Google tidak memberikan token');
  return json.access_token;
}
async function sheetData(env) {
  if (!env.SHEET_ID || !env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY)
    return json({ error: 'Google Sheets belum dikonfigurasi' }, 503);
  try {
    const accessToken = await tokenFor(env);
    const range = env.SHEET_RANGE || 'SBML!A:I';
    const endpoint = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(env.SHEET_ID) + '/values/' + encodeURIComponent(range);
    const response = await fetch(endpoint, { headers: { Authorization: 'Bearer ' + accessToken } });
    if (!response.ok) throw new Error('Gagal membaca Google Sheets (' + response.status + ')');
    const payload = await response.json();
    const records = payload.values || [];
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(env.SHEET_ID) + '/edit';
    if (!records.length) return json({ data: [], source: 'Google Sheets', sheetUrl });
    const header = records[0].map(v => String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    if (!header.includes('nama_kl') || !header.includes('status')) throw new Error('Header Sheet harus memuat Nama KL dan Status');
    const aliases = { keterangan: ['keterangan', 'karakteristik_kl', 'karakteristik_k_l'], nama_kl: ['nama_kl', 'nama_k_l'] };
    const data = records.slice(1).filter(row => row.some(v => String(v ?? '').trim())).map(values => Object.fromEntries(FIELDS.map(field => {
      const index = (aliases[field] || [field]).map(key => header.indexOf(key)).find(idx => idx >= 0);
      return [field, index === undefined ? '' : String(values[index] ?? '')];
    }))).filter(item => item.nama_kl.trim());
    return json({ data, source: 'Google Sheets', sheetUrl });
  } catch (e) {
    return json({ error: String(e.message || 'Gagal memuat Sheets') }, 502);
  }
}
const DASHBOARD_CSP = "default-src 'none'; base-uri 'none'; object-src 'none'; img-src 'self' data:; script-src 'sha256-" + DASHBOARD_SCRIPT_HASH + "'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'";
const LOGIN_CSP = "default-src 'none'; base-uri 'none'; object-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Public pages and non-sensitive assets are the only authentication exceptions.
    if (path === '/logo-kemenkeu-transparent.png' && method === 'GET') {
      return new Response(Uint8Array.from(atob(LOGO_KEMENKEU_B64), c => c.charCodeAt(0)), {
        headers: { ...securityHeaders, 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }
      });
    }
    if (path === '/login.js' && method === 'GET') {
      return new Response(LOGIN_JS, { headers: { ...securityHeaders, 'Content-Type': 'application/javascript; charset=utf-8' } });
    }
    if (path === '/login' && method === 'GET') {
      if (await validSession(request, env)) return redirect('/');
      return htmlResponse(LOGIN_HTML, LOGIN_CSP);
    }
    // Endpoint diagnostic only; does not disclose whether any secrets are configured.
    // It makes it possible to verify that the correct Worker handles API traffic.
    if (path === '/api/health' && method === 'GET') {
      return json({ service: 'Dashboard SBML', version: '4.2.0', api: 'online', login: '/api/login' });
    }
    if (path === '/api/login' && method === 'GET') {
      return json({ error: 'Gunakan metode POST untuk masuk', endpoint: '/api/login', version: '4.2.0' }, 405, { Allow: 'POST' });
    }
    if (path === '/api/login' && method === 'POST') {
      if (!sameOrigin(request)) return json({ error: 'Permintaan tidak diizinkan' }, 403);
      if (!loginConfigured(env)) return json({ error: 'Akun login belum diatur. Hubungi pengelola dashboard.' }, 503);
      if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return json({ error: 'Format permintaan tidak sesuai' }, 415);
      if (Number(request.headers.get('Content-Length') || 0) > 2048) return json({ error: 'Permintaan terlalu besar' }, 413);
      let info;
      try { const text = await request.text(); if (text.length > 2048) return json({ error: 'Permintaan terlalu besar' }, 413); info = JSON.parse(text); }
      catch { return json({ error: 'Format data login tidak valid' }, 400); }
      const { ip, item } = loginAttemptBucket(request);
      if (item && item.count >= MAX_FAILED_LOGINS) return json({ error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' }, 429, { 'Retry-After': '900' });
      const username = typeof info?.username === 'string' ? info.username : '';
      const password = typeof info?.password === 'string' ? info.password : '';
      const correctPassword = await verifyPassword(password, env.LOGIN_PASSWORD_HASH);
      if (username !== env.LOGIN_USERNAME || !correctPassword) { registerLoginFailure(ip, item); return json({ error: 'Username atau password salah' }, 401); }
      failedAttempts.delete(ip);
      const token = await createSession(username, env);
      return json({ success: true }, 200, { 'Set-Cookie': cookieHeader(token) });
    }
    if (path === '/api/logout' && method === 'POST') {
      if (!sameOrigin(request)) return json({ error: 'Permintaan tidak diizinkan' }, 403);
      return json({ success: true }, 200, { 'Set-Cookie': clearCookie() });
    }

    // Every private page and API must be checked server-side, not only hidden in JS.
    const authed = await validSession(request, env);
    if (!authed) {
      if (path.startsWith('/api/')) return json({ error: 'Akses ditolak. Silakan login.' }, 401);
      if ((path === '/' || path === '/index.html') && method === 'GET') return redirect('/login');
      return new Response('Not Found', { status: 404, headers: securityHeaders });
    }
    if ((path === '/' || path === '/index.html') && method === 'GET') return htmlResponse(DASHBOARD_HTML, DASHBOARD_CSP);
    if (path === '/api/sbml' && method === 'GET') return sheetData(env);
    if (path === '/api/config-check' && method === 'GET') {
      const required = ['SHEET_ID', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
      const missing = required.filter(k => typeof env[k] !== 'string' || !env[k].trim());
      return json({ configured: missing.length === 0, missingVariables: missing });
    }
    return new Response('Not Found', { status: 404, headers: securityHeaders });
  }
};
