'use strict';
const form = document.getElementById('loginForm');
const submit = document.getElementById('submit');
const message = document.getElementById('message');
const pw = document.getElementById('password');
document.getElementById('togglePassword').addEventListener('click', event => {
  const open = pw.type === 'password';
  pw.type = open ? 'text' : 'password';
  event.currentTarget.textContent = open ? 'Tutup' : 'Lihat';
  event.currentTarget.setAttribute('aria-label', open ? 'Sembunyikan password' : 'Tampilkan password');
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  submit.textContent = 'Memeriksa akun...';
  message.classList.remove('visible');
  try {
    const response = await fetch('/api/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: document.getElementById('username').value.trim(), password: pw.value })
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Tidak dapat masuk. Coba kembali.');
    window.location.replace('/');
  } catch (error) {
    message.textContent = error.message || 'Gagal masuk. Silakan coba lagi.';
    message.classList.add('visible');
    pw.value = '';
    pw.focus();
  } finally {
    submit.disabled = false;
    submit.textContent = 'Masuk →';
  }
});
