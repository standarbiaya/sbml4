# Dashboard Monitoring SBML — Versi 4.2 (Login StandarBiaya)

Aplikasi menggunakan Cloudflare Worker `sbml42` pada akun `standarbiaya`, dengan diagram pie **Disetujui / Ditolak / Proses/Status Lain** dan Google Sheets sebagai satu-satunya sumber data. Tidak ada fungsi data lokal, impor, ekspor, atau cetak. Matriks sembilan kolom tetap berisi **Keterangan** dan tanpa kolom Aksi.

## 1. Siapkan tiga variabel login (WAJIB)

File **PENGATURAN-AKUN-SBML-RAHASIA.txt** disediakan **secara TERPISAH dari ZIP aplikasi**. File ini untuk pengelola saja: **jangan diunggah ke GitHub atau situs web**.

Di Cloudflare: **Workers & Pages → sbml42 → Settings → Variables and Secrets → Production**, buat atau ganti:

| Name | Type | Sumber Value |
|---|---|---|
| `LOGIN_USERNAME` | Variable | `StandarBiaya` |
| `LOGIN_PASSWORD_HASH` | Secret | Salin dari file pengaturan rahasia |
| `SESSION_SECRET` | Secret | Salin dari file pengaturan rahasia |

Gunakan password yang sudah ditentukan pada permintaan pembuatan akun. **Jangan masukkan password biasa ke field LOGIN_PASSWORD_HASH.** Setelah mengisi tiga variabel, klik **Deploy/Save and Deploy** untuk Production. Jika sebelumnya telah memiliki nama variabel yang sama, *edit nilainya*, jangan membuat dua variabel dengan nama sama.

Empat variabel Google Sheets sebelumnya **tetap digunakan dan tidak perlu diubah**: `SHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SHEET_RANGE=SBML!A:I`.

> Catatan keamanan: password yang diminta relatif singkat dan sudah dituliskan dalam chat. Sebaiknya ubah ke password panjang dan unik setelah pengujian; gunakan `SIAPKAN-AKUN-LOGIN.html` secara offline untuk membuat hash baru. Pembatasan percobaan login bawaan Worker hanya best-effort; untuk penggunaan instansi gunakan Cloudflare WAF rate limiting/Access.

## 2. Publikasikan aplikasi

1. Unduh ZIP aplikasi versi 4.2, ekstrak.
2. Unggah **isi ZIP** ke root repository GitHub yang terhubung ke Worker `sbml42`; commit perubahan. Pastikan `worker.js`, `backend.js`, `wrangler.jsonc`, `build.mjs`, `package.json`, serta folder `public/` dan `scripts/` berada di root.
3. Cloudflare → Worker `sbml42` → Settings → Build. Set **Root directory = root repository**, **Build command = `npm run build`**, **Deploy command = `npx wrangler deploy --config ./wrangler.jsonc`**.
4. Tunggu deployment Success. File `wrangler.jsonc` mengandung `keep_vars: true` agar variabel/secret yang dipasang di Cloudflare tidak terhapus saat deployment.

## 3. Periksa login PRODUKSI (bukan preview HTML)

1. Buka `https://sbml42.standarbiaya.workers.dev/api/health`. Harus berbentuk JSON dengan `"version":"4.2.0"`.
2. Coba `https://sbml42.standarbiaya.workers.dev/api/login` lewat browser (GET). Seharusnya **JSON 405**, bukan HTML. (Login sesungguhnya menggunakan POST dari form.)
3. Gunakan jendela Incognito: `https://sbml42.standarbiaya.workers.dev/` harus diarahkan ke `/login`.
4. Login di `https://sbml42.standarbiaya.workers.dev/login` dengan username `StandarBiaya` dan password yang telah Anda pilih.
5. Setelah login, dashboard memuat data dari Google Sheets. Tombol **Keluar** menghapus cookie browser. Untuk mengecek API, buka `/api/sbml` ketika sudah login; tanpa login endpoint harus mengembalikan JSON 401.

Jika error `Unexpected token '<'`, periksa terlebih dahulu `/api/health`. **Jangan uji login melalui file HTML preview atau file://**. Halaman login sudah dilengkapi pemeriksaan domain `standarbiaya` untuk mencegah kekeliruan tersebut.

## 4. Keamanan dan pemeliharaan

- Password tidak disimpan dalam HTML/JavaScript publik maupun ZIP aplikasi, hanya hash PBKDF2 SHA-256 yang disimpan sebagai Secret Cloudflare.
- Sesi HMAC-SHA256, cookie `Secure`, `HttpOnly`, `SameSite=Strict`, kedaluwarsa 8 jam.
- Halaman dashboard **dan** `/api/sbml` dilindungi di sisi server. Penyimpanan lokal/demo ditiadakan.
- Header Keterangan dapat membaca kolom `Keterangan` atau header lama `Karakteristik K/L` dari Google Sheets.
- Mengubah password: jalankan `SIAPKAN-AKUN-LOGIN.html` secara lokal, pertahankan username, lalu ganti `LOGIN_PASSWORD_HASH` dan `SESSION_SECRET` pada Cloudflare. Perubahan kunci sesi akan memutus sesi lama.
- Untuk data internal yang tidak boleh diakses umum, disarankan Cloudflare Access dengan MFA dan pembatasan percobaan login di sisi edge.
