// Fallback if the offline browser tool is unavailable. Run: node scripts/buat-login.mjs
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
const io = createInterface({ input: process.stdin, output: process.stdout });
try {
  const answer = (await io.question('Username (default: StandarBiaya): ')).trim();
  const username = answer || 'StandarBiaya';
  if (!/^[A-Za-z0-9_.-]{2,100}$/.test(username)) throw Error('Username tidak valid');
  const password = randomBytes(18).toString('base64url');
  const salt = randomBytes(24), iterations = 210000;
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  console.log('\nPASSWORD LOGIN (CATAT; hanya muncul sekali):', password);
  console.log('LOGIN_USERNAME   (Variable):', username);
  console.log('LOGIN_PASSWORD_HASH (Secret):', `pbkdf2_sha256$${iterations}$${salt.toString('base64url')}$${hash.toString('base64url')}`);
  console.log('SESSION_SECRET (Secret):', randomBytes(48).toString('base64url'));
  console.log('\nSimpan di Cloudflare Production > Variables and Secrets. Jangan unggah output ini ke GitHub.');
} finally { io.close(); }
