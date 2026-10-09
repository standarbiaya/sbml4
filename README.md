# Dashboard Monitoring SBML Kementerian/Lembaga — Versi Formal

Versi 3.2.0. Diperuntukkan bagi Worker Cloudflare **`sbml42`** yang telah terhubung ke Google Sheets.

## Yang diperbarui

- Logo Kementerian Keuangan dari gambar yang disediakan pengguna, berkas PNG **transparan** di `public/logo-kemenkeu-transparent.png`.
- Header lebih formal: identitas Kementerian Keuangan, judul **Dashboard Monitoring SBML Kementerian/Lembaga**, deskripsi singkat, dan waktu pembaruan.
- Tulisan `Google Sheets` di **header** dihilangkan (hanya status waktu pembaruan).
- Latar biru muda dan ungu muda, grafik, kartu statistik, filter, pencarian, tabel 9 kolom dan menu lain tetap seperti versi sebelumnya.
- Menu **Data Lokal** dan **Impor Data** tetap tidak tersedia. Tidak ada data contoh atau fallback lokal di Worker produksi.
- Logo tersedia lewat route langsung `/logo-kemenkeu-transparent.png` yang dihasilkan oleh build Worker. Dengan demikian, logo muncul meski Worker tidak memakai pengaturan folder static assets.

## Deploy Cloudflare (`sbml42`)

1. Ekstrak ZIP dan unggah **semua isinya** ke **root** repo GitHub yang sudah terhubung ke Worker `sbml42` (jangan unggah ZIP/folder induknya saja). Buat commit baru.
2. Pastikan root memiliki `wrangler.jsonc`, `worker.js`, `build.mjs`, `backend.js`, `package.json`, `public/`, dan `scripts/`.
3. Pada Cloudflare → Workers & Pages → `sbml42` → Settings → Build, gunakan:
   - **Root directory:** root repo.
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy --config ./wrangler.jsonc`
4. Jangan hapus runtime variables/secrets Production: `SHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` (Secret), serta `SHEET_RANGE` = `SBML!A:I`.
5. Setelah deploy berhasil, periksa:
   - `https://sbml42.andriyprast69.workers.dev/` — dashboard.
   - `https://sbml42.andriyprast69.workers.dev/logo-kemenkeu-transparent.png` — logo transparan.
   - `https://sbml42.andriyprast69.workers.dev/api/sbml` — data API dengan `source: "Google Sheets"`.
6. Jika tampilan masih versi lama, lakukan hard refresh (`Ctrl + F5`).

## Mengubah tulisan dan gaya

- Edit `public/index.html` pada objek **`APP_CONFIG`** untuk mengganti:
  - `title`: judul utama dan judul tab browser.
  - `subtitle`: keterangan di bawah judul.
  - `chartTitle`: judul grafik.
  - `tableTitle`: judul matriks.
- Nama instansi pada baris paling atas header berada pada elemen HTML `.institution`.
- Warna biru muda dan ungu muda dapat diubah pada bagian CSS **Palet pastel**.
- Ukuran logo diatur oleh CSS `.logo` dan `.logo img`; file aslinya di `public/logo-kemenkeu-transparent.png`.
- Jalankan `npm run build` setiap selesai mengubah HTML/logo agar `worker.js` diperbarui sebelum deployment. Cloudflare dengan Build command di atas akan menjalankannya otomatis.

## Keamanan dan sumber data

Dashboard **hanya membaca data dari Google Sheets** melalui `/api/sbml` yang diautentikasi menggunakan Service Account. Tombol **Tambah Usulan** membuka Google Sheets; perubahan harus dilakukan di sana. Tidak ada import atau penyimpanan lokal.

**Penting:** endpoint `/api/sbml` tetap dapat diakses publik jika belum dilindungi. Untuk data internal, atur Cloudflare Access / autentikasi sebelum digunakan untuk operasional. Jangan simpan private key di repository.

## Pengujian dan preview

```sh
npm run build
npm run check
```

Preview HTML dan screenshot disediakan **terpisah dari Worker produksi**. Preview memakai data fiktif untuk memeriksa desain, bukan data resmi.
