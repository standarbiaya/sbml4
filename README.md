# Dashboard Monitoring SBML Kementerian/Lembaga — Versi 3.3

Paket Cloudflare Workers untuk aplikasi **sbml42**. Data produksi **hanya** bersumber dari Google Sheets, melalui Service Account yang telah dikonfigurasi pada Cloudflare. Tidak tersedia fitur impor file atau penyimpanan data lokal.

## Pembaruan versi ini

1. Judul kolom ketujuh dari **Karakteristik K/L** menjadi **Keterangan**.
2. Kolom **Aksi** di sisi kanan tabel dihapus. Matriks kini terdiri atas **9 kolom**, yaitu:
   - No
   - Nama KL
   - Tahun
   - No Surat / Tgl
   - Perihal
   - Surat Menkeu / Tgl
   - Keterangan
   - Jenis SBML
   - Status
3. Tombol **Ekspor CSV**, **JSON**, dan **Cetak** dihilangkan, termasuk fungsi JavaScript ekspornya.
4. Grafik, filter, pencarian, paginasi, kartu statistik, tombol **Tambah Usulan** (membuka Google Sheets), tombol **Buka Sheet**, tombol **Refresh**, logo Kementerian Keuangan, dan palet latar biru-ungu muda tetap dipertahankan.
5. API menerima **dua format judul kolom ketujuh** di Google Sheets: `Keterangan` (baru) dan `Karakteristik K/L` (lama). Keduanya dipetakan ke kolom `Keterangan` pada dashboard; **data yang sudah ada tetap digunakan**.

## Memperbarui Google Sheets (opsional)

Jika ingin judul di spreadsheet juga selaras dengan dashboard, ubah hanya sel **G1** di tab `SBML` dari `Karakteristik K/L` menjadi `Keterangan`.

Jangan memindahkan atau menghapus isi sel G2:G dan jangan mengubah urutan kolom. Kolom lain tetap sama. Jika belum ingin mengganti judul di spreadsheet, dashboard sudah kompatibel dengan header lama.

## Deploy ke Worker Cloudflare sbml42

1. Ekstrak berkas ZIP dan unggah **seluruh isi ZIP ke root repository GitHub** yang terhubung ke Worker `sbml42`. Jangan unggah ZIP/folder pembungkus saja.
2. Commit perubahan pada repository.
3. Di Cloudflare → Workers & Pages → `sbml42` → Settings → Build:
   - Root directory: root repository.
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy --config ./wrangler.jsonc`
4. Jalankan deployment dari commit terbaru, tunggu hingga selesai.
5. Kunjungi `https://sbml42.andriyprast69.workers.dev/` dan tekan Ctrl+F5 jika versi lama masih terlihat.

**Jangan menghapus atau mengganti** empat konfigurasi runtime yang sudah berfungsi pada Cloudflare Production:

- `SHEET_ID`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (Secret)
- `SHEET_RANGE` = `SBML!A:I`

`wrangler.jsonc` menggunakan nama Worker `sbml42` dan `keep_vars: true` agar variabel runtime yang telah tersimpan pada Cloudflare Dashboard tetap dipertahankan saat deployment melalui Wrangler.

## Pengujian lokal

```sh
npm run build
npm run check
```

Skrip uji memastikan terdapat sembilan kolom tanpa Aksi, tombol ekspor/cetak hilang, dan API Google Sheets dapat membaca **header lama maupun baru**.

## Keamanan

Sebelum menampilkan data internal, batasi akses ke website **dan** endpoint `/api/sbml` dengan Cloudflare Access atau mekanisme autentikasi yang disetujui organisasi. Jangan menyimpan Service Account JSON atau private key pada GitHub.

**Preview** HTML dan gambar screenshot disediakan terpisah dari ZIP produksi. Data preview bersifat ilustrasi, bukan data resmi.
