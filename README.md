# Dashboard SBML - Cloudflare Workers (Solusi Error assets.directory)

Aplikasi **Dashboard SBML** dengan grafik pie **Disetujui / Ditolak**, ringkasan status, pencarian, filter, tabel 9 kolom, ekspor, impor dan pengelolaan lokal. Bisa membaca Google Sheets setelah secrets disetel.

## PERBAIKAN PENTING

File **wrangler.sbml.jsonc** tidak memiliki `assets.directory`. Karena log Cloudflare sebelumnya masih memakai konfigurasi yang menunjuk `/repo/public`, **cukup mengunggah paket baru saja belum memadai**. Cloudflare harus diatur untuk mengeksekusi **perintah baru**:

```bash
npx wrangler deploy --config wrangler.sbml.jsonc
```

### LANGKAH TEPAT

1. Ekstrak ZIP ini, lalu unggah **isi ekstrak** (terutama `worker.js`, `wrangler.sbml.jsonc`, `package.json`) langsung ke **root** branch GitHub yang terhubung ke Cloudflare, bukan sebagai satu file ZIP. Pastikan folder pembungkus ZIP tidak ikut terbentuk di GitHub.
2. Pastikan menu GitHub menampilkan `worker.js` dan `wrangler.sbml.jsonc` di level teratas, lalu **Commit changes**.
3. Di Cloudflare: **Workers & Pages → pilih dashboard-sbml → Settings → Build → Edit configuration** (nama menu mungkin berubah).
4. Pastikan **Git repository dan production branch** sama dengan lokasi file yang Anda unggah. Set **Root directory** ke root repository (kosong atau `/`, jika UI mengharuskan).
5. Ubah **Deploy command** dari `npx wrangler deploy` menjadi tepat:
   `npx wrangler deploy --config wrangler.sbml.jsonc`
6. Build command: **kosong** (atau default jika Cloudflare mengharuskan); simpan pengaturan.
7. Picu deployment baru setelah perubahan settings dan commit terbaru. Di log, cari `Executing user deploy command: npx wrangler deploy --config wrangler.sbml.jsonc`.

### JIKA TETAP GAGAL

- Bila log masih berbunyi `Executing user deploy command: npx wrangler deploy`, berarti **Deploy command belum berubah pada konfigurasi build yang aktif**. Jangan hanya tekan Retry build sebelumnya; pastikan settings build tersimpan dan trigger deployment commit yang baru.
- Bila log sudah menunjukkan `--config wrangler.sbml.jsonc` tetapi menulis `config file not found`, file tersebut tidak ada di **root directory build** atau berada di branch/repo lain.
- Bila mendapat peringatan Worker `name` berbeda, ubah field `name` pada `wrangler.sbml.jsonc` menjadi nama Worker yang sudah ada di Cloudflare (atau sesuaikan project).
- Bila deploy gagal karena token atau izin, itu masalah akun/otorisasi Cloudflare, bukan `public`.
- Bila masih error assets.directory meskipun log menggunakan `--config`, kirim log **lengkap dari awal sampai error** untuk memeriksa konflik setting/config hasil generate lain.

### OPSI TANPA GITHUB

Cloudflare Workers & Pages → pilih Worker → **Edit code**. Buka file `worker.js` dari paket ini, salin seluruh kode ke editor Worker (mengganti konten lama), lalu klik Deploy. Ini melewati proses Wrangler/GitHub yang saat ini gagal, tetapi perubahan dari GitHub dapat menimpa edit manual bila CI tetap aktif.

## MENGGUNAKAN APLIKASI SECARA LOKAL

Buka `Dashboard-SBML-Offline.html` dengan Chrome/Edge. Fitur data lokal dapat digunakan tanpa Cloudflare. Catatan: sinkronisasi Google Sheets otomatis tidak berjalan dari file offline.

## GOOGLE SHEETS (OPSIONAL)

Siapkan tab bernama `SBML` dengan header tepat:

`No | Nama KL | Tahun | No Surat / Tgl | Perihal | Surat Menkeu / Tgl | Karakteristik K/L | Jenis SBML | Status`

Aktifkan Google Sheets API, buat Google service account, dan bagikan spreadsheet ke alamat email service account sebagai Viewer. Isi runtime **Secrets** di Cloudflare (bukan di source code/repository): `SHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`. Endpoint `/api/sbml` membaca data Sheet. Tanpa konfigurasi Google Sheets, dashboard memakai data lokal/demonstrasi.

**Perlindungan data:** dashboard dan endpoint bawaan tidak menggunakan autentikasi. Hindari mempublikasikan data surat internal tanpa kontrol akses (contohnya Cloudflare Access). Simpan private key sebagai secret, bukan di GitHub.

## UJI LOKAL

```bash
npm install
npm run check
npm run dev
```

Jalankan `npm run deploy` untuk deployment CLI yang sudah memakai file konfigurasi unik (setelah login Cloudflare). Pengujian saat pengemasan tidak sama dengan publikasi ke akun Cloudflare Anda.
