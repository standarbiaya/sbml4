# Dashboard Monitoring SBML Kementerian/Lembaga — Versi 4.0 dengan LOGIN

**Tujuan:** Melindungi tampilan dashboard, matriks SBML, dan endpoint `/api/sbml` dengan username dan password. Isi Google Sheets tetap menjadi satu-satunya sumber data. Grafik, pencarian, filter, dan tampilan biru muda–ungu muda dipertahankan.

## A. Siapkan akun secara OFFLINE (disarankan)

1. Ekstrak seluruh isi `Dashboard-SBML-LOGIN-AMAN-Cloudflare.zip` ke komputer.
2. Buka `SIAPKAN-AKUN-LOGIN.html` dengan **Chrome/Edge** (file ini tidak mengirim data ke internet).
3. Isi `Username` (misalnya `admin_sbml`), lalu klik **Buat password acak**. **SIMPAN PASSWORD** yang dihasilkan dalam pengelola kata sandi atau catatan aman.
4. Klik **Buat 3 Pengaturan Cloudflare**. Tunggu hingga nilai konfigurasi muncul.
5. Siapkan nilai `LOGIN_USERNAME`, `LOGIN_PASSWORD_HASH`, dan `SESSION_SECRET` untuk tahap B.

**Alternatif:** Jika punya Node.js, jalankan `npm run buat-login` untuk membuat password acak dan ketiga nilai itu dari terminal. Password hanya muncul saat pembuatan akun.

## B. Atur Cloudflare sebelum mengunggah kode

Buka Cloudflare Dashboard → **Workers & Pages → sbml42 → Settings → Variables and Secrets → Production**. Tambahkan:

| Name | Type | Value |
|---|---|---|
| `LOGIN_USERNAME` | **Variable** | Nama user dari alat offline, contoh: `admin_sbml` |
| `LOGIN_PASSWORD_HASH` | **Secret** | Hash panjang format `pbkdf2_sha256$210000$...` dari alat offline |
| `SESSION_SECRET` | **Secret** | Nilai acak panjang yang dibuat alat offline |

Klik **Deploy** untuk menerapkan secrets. **Jangan menulis password asli atau hash/sesi secret di GitHub, wrangler.jsonc atau file HTML.** Jangan berikan password/hash/session secret ke ChatGPT.

Empat variabel Google Sheets lama **JANGAN diubah atau dihapus**:
- `SHEET_ID` (Variable atau Secret)
- `GOOGLE_CLIENT_EMAIL` (Secret lebih baik)
- `GOOGLE_PRIVATE_KEY` (Secret — harus tetap tersembunyi)
- `SHEET_RANGE` (Variable, contoh `SBML!A:I`)

## C. Unggah aplikasi ke GitHub dan deploy

1. Ekstrak ZIP. Unggah **isi paket** ke root repository yang tersambung dengan Cloudflare, termasuk `worker.js`, `backend.js`, `build.mjs`, `package.json`, `wrangler.jsonc`, `public/`, dan `scripts/`. File `SIAPKAN-AKUN-LOGIN.html` hanya alat lokal; **tidak perlu dan sebaiknya jangan diunggah** ke GitHub.
2. Commit file yang diperbarui ke branch yang dipakai Cloudflare.
3. Cloudflare → `sbml42` → Settings → Build. Gunakan:
   - **Root directory:** root repository
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy --config ./wrangler.jsonc`
4. Pastikan deployment sukses; konfigurasi Worker mempertahankan variables/secrets lama melalui `keep_vars: true`.
5. Buka `https://sbml42.andriyprast69.workers.dev/` menggunakan jendela Incognito untuk memastikan halaman **Masuk ke Dashboard** tampil sebelum dashboard.

## D. Uji keamanan sesudah deployment

1. Tanpa login, buka `https://sbml42.andriyprast69.workers.dev/api/sbml` — harus menampilkan HTTP **401** dan pesan akses ditolak, **bukan data SBML**.
2. Masuk di `https://sbml42.andriyprast69.workers.dev/login` dengan username/password pribadi yang sudah disiapkan.
3. Setelah masuk, buka dashboard; tombol Refresh harus membaca Google Sheets.
4. Setelah klik **Keluar**, buka dashboard lagi: harus diarahkan ke halaman login.
5. Jika melindungi data instansi, gunakan juga **Cloudflare Access** (identitas organisasi/MFA) dan **WAF rate limiting** untuk `/api/login`, karena pembatasan percobaan login di memori Worker hanya best-effort, bukan pembatasan global antarmesin.

## E. Cara ganti/lupa password

Buka lagi alat offline, isi username sama, password baru (atau buat acak), klik Buat Pengaturan, lalu **ubah hanya `LOGIN_PASSWORD_HASH`** ke hash baru. Disarankan juga mengganti `SESSION_SECRET` untuk memutus sesi login lama. Klik Deploy. Tidak perlu memperbarui Google Sheets atau deploy kode dashboard.

## F. Fitur keamanan

- Username/password diverifikasi di server (Cloudflare Worker), **bukan disimpan pada JavaScript publik**.
- Password **tidak disimpan** di Cloudflare sebagai teks biasa: hanya hash PBKDF2 SHA-256 dengan salt dan 210.000 iterasi.
- Cookies sesi ditandatangani HMAC SHA-256, `Secure`, `HttpOnly`, `SameSite=Strict`, masa berlaku 8 jam.
- Semua API (termasuk `/api/sbml` dan `/api/config-check`) memerlukan sesi sah.
- Login dan logout memeriksa `Origin` sebagai perlindungan CSRF.
- HTML dashboard memakai Content Security Policy (CSP) hash untuk JavaScript inline.
- Proteksi login dasar tidak sama dengan sistem identitas organisasi atau MFA. Untuk data internal kementerian, **Cloudflare Access dengan autentikasi organisasi/MFA lebih disarankan**, dan pengaturan izin Viewer Google Sheets tetap harus diterapkan.

## G. Berkas penting

- `public/index.html` — tampilan dashboard.
- `public/login.html` + `public/login.js` — tampilan dan interaksi login.
- `backend.js` — autentikasi, sesi, dan pembacaan Google Sheets.
- `build.mjs` — mengemas halaman dan logo ke `worker.js`.
- `wrangler.jsonc` — memakai Worker aktif `sbml42`, menjaga variables/secrets.
- `scripts/verify-secure.mjs` — pengujian otomatis; jalankan `npm run check` setelah `npm run build`.
- `SIAPKAN-AKUN-LOGIN.html` — pengaturan akun offline (jangan diunggah publik).
