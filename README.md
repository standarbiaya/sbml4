# Dashboard SBML — Latar Biru Muda dan Ungu Muda

Revisi ini memakai **tata letak Dashboard SBML sebelumnya**. Hanya menu **Data Lokal** dan **Impor Data** yang dihapus. Semua angka, matriks, diagram donat, dan filter membaca **Google Sheets** melalui `/api/sbml`.

## Yang tetap ada

- Buka Sheet dan Refresh
- Ringkasan Total, Disetujui, Ditolak, serta Proses/Lainnya
- Grafik donat Disetujui/Ditolak
- Kartu keputusan dan filter status
- Pencarian; filter Tahun, K/L, Jenis SBML
- Matriks 9 kolom, pagination, Ekspor CSV, JSON, dan Cetak
- Tombol **Tambah Usulan** yang sekarang membuka Google Sheets; tidak lagi menyimpan data pada browser. Anda perlu hak edit Google Sheets untuk menambah data.

## Deploy di Cloudflare (Worker `sbml42`)

1. Simpan salinan repository lama sebagai cadangan.
2. Ekstrak ZIP, lalu **unggah isi ZIP ke root repository GitHub** yang terhubung ke Cloudflare, bukan ZIP atau folder induknya. Timpa berkas lama yang bernama sama.
3. Commit perubahan. Pastikan root berisi `worker.js`, `wrangler.jsonc`, `package.json`, `backend.js`, `build.mjs`, serta folder `public` dan `scripts`.
4. Pengaturan Cloudflare: **Build command** `npm run build` dan **Deploy command** `npx wrangler deploy --config ./wrangler.jsonc`. Root directory = root repository.
5. Verifikasi Worker production bernama **`sbml42`**. Pastikan Runtime Variables and Secrets tetap ada:
   - `SHEET_ID`: ID spreadsheet
   - `GOOGLE_CLIENT_EMAIL`: email Service Account
   - `GOOGLE_PRIVATE_KEY`: Secret berisi private key (jangan masukkan ke repository)
   - `SHEET_RANGE`: `SBML!A:I`
6. Buka `/api/sbml` pada domain Worker Anda; pastikan JSON memuat `"source":"Google Sheets"`, kemudian buka homepage dan klik **Refresh**.

File `wrangler.jsonc` memakai `keep_vars:true` untuk mempertahankan variabel runtime Worker. Jangan menambahkan kredensial rahasia ke file konfigurasi / GitHub.

## Mengganti tulisan tanpa mengubah desain

Edit `public/index.html`, cari `const APP_CONFIG`:

- `title`: judul utama
- `subtitle`: keterangan awal saat memuat
- `chartTitle`: judul grafik
- `tableTitle`: judul matriks

Setelah menyunting HTML, jalankan `npm run build` atau `node build.mjs` agar `worker.js` berisi desain terbaru, kemudian deploy ulang.

## Mengubah warna

Edit CSS yang diberi komentar `Palet pastel` pada `public/index.html`.

## Data dan keamanan

- Tidak ada `localStorage`, data demonstrasi, ataupun impor file di **aplikasi produksi**.
- Jika API gagal, data tidak diganti dengan data contoh.
- File preview terpisah memakai data ilustrasi yang **tidak disertakan ke Worker**.
- Endpoint `/api/sbml` tetap dapat diakses publik jika Anda belum menambahkan kontrol akses. Untuk data internal, gunakan Cloudflare Access atau autentikasi lain sebelum digunakan secara operasional.

## Pengujian

```
node build.mjs
node scripts/verify.mjs
```

Pengujian otomatis memeriksa konfigurasi Worker, menu utama, ketiadaan data lokal/impor, serta respons API Google Sheets dengan mock test.
