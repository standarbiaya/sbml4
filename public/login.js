'use strict';
const PROD_HOST = 'sbml42.standarbiaya.workers.dev';
const form = document.getElementById('loginForm');
const submit = document.getElementById('submit');
const message = document.getElementById('message');
const pw = document.getElementById('password');
const productionURL = 'https://' + PROD_HOST + '/login';
function showError(text) {
  message.textContent = text;
  message.classList.add('visible');
}
const isProduction = window.location.hostname === PROD_HOST;
if (!isProduction) {
  showError('Ini bukan alamat login produksi Dashboard SBML. Pratinjau HTML tidak dapat digunakan untuk masuk. Buka alamat resmi: ' + productionURL);
  submit.disabled = true;
  submit.textContent = 'Buka website produksi untuk login';
  // A visible link helps users distinguish preview from the actual secure Worker.
  const link = document.createElement('a');
  link.href = productionURL;
  link.textContent = 'Buka halaman login produksi ↗';
  link.className = 'production-link';
  message.after(link);
}
document.getElementById('togglePassword').addEventListener('click', event => {
  const open = pw.type === 'password';
  pw.type = open ? 'text' : 'password';
  event.currentTarget.textContent = open ? 'Tutup' : 'Lihat';
  event.currentTarget.setAttribute('aria-label', open ? 'Sembunyikan password' : 'Tampilkan password');
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isProduction) return;
  submit.disabled = true;
  submit.textContent = 'Memeriksa akun...';
  message.classList.remove('visible');
  try {
    const response = await fetch('/api/login', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username: document.getElementById('username').value.trim(), password: pw.value })
    });
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('application/json')) {
      throw new Error('Server tidak mengirim respons login JSON. Periksa apakah paket versi 4.2 sudah berhasil di-deploy ke Worker sbml42, bukan halaman preview atau Worker lain.');
    }
    let result;
    try { result = await response.json(); }
    catch { throw new Error('Respons login dari server tidak dapat dibaca. Silakan coba kembali.'); }
    if (!response.ok) throw Error('HTTP ' + response.status + ': ' + (result.error || result.message || ('Login ditolak (kode ' + (result.code || 'tidak diketahui') + ').')));
    if (result.success !== true) throw Error('Server tidak mengonfirmasi login.');
    window.location.replace('/');
  } catch (error) {
    showError(error.message || 'Gagal masuk. Silakan coba lagi.');
    pw.value = '';
    pw.focus();
  } finally {
    submit.disabled = false;
    submit.textContent = 'Masuk →';
  }
});
