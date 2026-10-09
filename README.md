# Dashboard SBML — paket deploy Cloudflare (revisi)

Paket dibuat untuk mengatasi kesalahan `Could not detect a directory containing static files` dan kesalahan lama `assets.directory ... /repo/public`.

## LANGKAH PENTING: JANGAN UNGGAH ZIP LANGSUNG KE REPOSITORY

1. Ekstrak ZIP pada komputer Anda.
2. Buka GitHub -> repository yang **benar-benar terhubung** dengan Cloudflare -> branch produksi (biasanya `main`).
3. **Unggah isi hasil ekstraksi**, bukan ZIP dan bukan folder pembungkus. Pada halaman depan repository GitHub **harus terlihat**:
   - `wrangler.jsonc`
   - `worker.js`
   - `package.json`
   - `public/` (di dalamnya `index.html`)
   - `scripts/` (di dalamnya `verify.mjs`)
4. Hapus atau pindahkan konfigurasi lama `wrangler.toml` / `wrangler.sbml.jsonc` / `wrangler.jsonc` lama jika bertentangan; file `wrangler.jsonc` di paket ini harus menggantikan file standar lama. Jangan menyimpan dua file konfigurasi aktif.
5. Klik **Commit changes**. Pastikan isi berkas dapat dibuka di GitHub.
6. Cloudflare Dashboard -> Workers & Pages -> aplikasi -> **Settings > Build** (atau Build & Deploy).
   - Repository dan branch: cocokkan dengan GitHub yang diubah.
   - **Root directory: kosong** (atau `/` jika UI meminta; maksudnya root repository).
   - **Build command: `npm run check`**. Ini memunculkan pesan jelas jika ada file yang tidak di-root.
   - **Deploy command: `npx wrangler deploy --config ./wrangler.jsonc`**.
   - Jika ada **Preview command**, gunakan `npx wrangler versions upload --config ./wrangler.jsonc`.
7. Simpan pengaturan dan jalankan **deployment dari commit terbaru**.

Cloudflare tidak otomatis menyalin isi ZIP unduhan Anda ke repository. Karena tidak memiliki akses ke repository Anda, kami tidak dapat menerapkan perubahan GitHub secara otomatis.

### Bila deploy gagal lagi

Cari pada log:

- `Folder deployment: /opt/buildhome/repo` dan `OK: file deployment tersedia`: root benar.
- `GAGAL: File tidak ada pada Root directory`: file tidak diunggah ke branch/repo/root yang digunakan.
- `Executing user deploy command: npx wrangler deploy --config ./wrangler.jsonc`: pengaturan deploy benar.
- `Could not detect a directory containing static files`: kemungkinan command dijalankan tanpa melihat `wrangler.jsonc`, atau konfigurasi lama masih digunakan.

**Jalan pintas (tanpa GitHub):** Cloudflare Workers & Pages -> Create Worker -> Edit code, salin seluruh `worker.js` ke editor utama, kemudian **Deploy**. Dashboard dibuat di dalam kode Worker ini sehingga tidak memerlukan folder `public` di jalur tersebut. Jika Worker Anda terhubung GitHub, deployment dari GitHub kemudian bisa menimpa perubahan manual.

## Fitur

Dashboard SBML, grafik pie keputusan **Disetujui/ Ditolak** (status lain tidak masuk penyebut persentase), pencarian, filter, tabel sembilan kolom, data lokal, impor/ekspor CSV/JSON, dan backend pembacaan Google Sheets.

## Konfigurasi Sheets opsional

Google Sheets tab `SBML`, kolom urut: `No`, `Nama KL`, `Tahun`, `No Surat / Tgl`, `Perihal`, `Surat Menkeu / Tgl`, `Karakteristik K/L`, `Jenis SBML`, `Status`.

Aktifkan Google Sheets API, bagikan Sheet sebagai Viewer pada email service account, isi **runtime secrets** Cloudflare (jangan GitHub): `SHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`. Sumber data Sheets dibaca melalui endpoint `/api/sbml`.

**Keamanan:** Tanpa Cloudflare Access atau autentikasi lain, dashboard dan API dapat diakses publik. Jangan memasukkan data surat internal rahasia ke Sheet yang diterbitkan lewat aplikasi publik.

## Uji lokal

```
npm install
npm run check
npm run dev
```

File `public/index.html` bisa juga dibuka secara lokal dengan browser untuk melihat dashboard versi offline. Paket sudah diuji syntax dan respons HTTP lokal Worker, tetapi deployment ke akun Cloudflare pengguna perlu dilakukan melalui repository atau dashboard pengguna sendiri.
