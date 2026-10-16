# Portal Kamus Standar Biaya V2 — panduan mulai ulang tanpa menghapus website

## Apa yang diperbaiki

- Sebelumnya setiap permintaan API mencoba membaca tabel `settings` yang belum ada, menghasilkan HTTP 500.
- Sekarang `GET /api/health` memeriksa Worker, `GET /api/setup-status` memeriksa status D1 secara aman.
- Dalam tahap awal tanpa D1, API menampilkan data kosong disertai keterangan konfigurasi, bukan Error 500. **Data kosong bukan data resmi.**
- Aplikasi tetap memiliki struktur Sheets/Drive dan endpoint sinkronisasi untuk tahap berikutnya.

## TAHAP A — Upload ulang kode dan deploy tanpa database (paling mudah)

1. Simpan salinan repositori/proyek lama sebelum mengganti file. Jangan hapus Worker yang sudah online.
2. Unduh ZIP baru dan **ekstrak dulu**. Buka repository GitHub yang selama ini terhubung ke Cloudflare.
3. Unggah **isi** ZIP ke root repository: `src/`, `worker/`, `migrations/`, `templates/`, `package.json`, `vite.config.ts`, `wrangler.jsonc`, dan file lainnya. Jangan membuat folder induk ganda. Timpa file proyek lama yang namanya sama.
4. File `wrangler.jsonc` **sengaja belum memasang binding D1** agar deploy tahap A tidak gagal hanya karena UUID database. Hal ini sementara memutus akses D1 pada build baru. Jangan gunakan cara ini untuk database yang sudah berisi data production.
5. GitHub: klik **Commit changes**. Pastikan Cloudflare terhubung pada branch tersebut.
6. Di Cloudflare → Workers & Pages → Worker → Settings/Builds, gunakan root repository `/` atau kosong, Build command `npm run build` dan Deploy command `npx wrangler deploy` (jika form deployment meminta). Simpan variabel build `VITE_DEMO_MODE=false`.
7. Setelah deploy, buka `https://ALAMAT-WORKER-ANDA/api/health`; hasil harus memuat `"status":"ok"`.
8. Buka `https://ALAMAT-WORKER-ANDA/api/setup-status`; hasil awal boleh `"database":"binding_missing"`. Website akan menampilkan informasi penyiapan, bukan banner Error 500. Tidak ada data resmi yang muncul sampai sinkronisasi berhasil.

## TAHAP B — Hubungkan ke D1 yang telah dibuat (tanpa membuat database baru)

1. Cloudflare Dashboard → **Storage & databases → D1** → pilih `portal-standar-biaya-db` milik Anda.
2. Salin **Database ID** dan pastikan database berada pada **akun Cloudflare yang sama** dengan Worker.
3. GitHub → buka `wrangler.jsonc` → Edit. Sebelum `"vars"`, sisipkan blok berikut (perhatikan koma antar properti):

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "portal-standar-biaya-db",
    "database_id": "UUID_D1_ASLI_DARI_DASHBOARD"
  }
],
```

4. Commit. Deploy ulang dari Cloudflare / tunggu auto-deploy.
5. Buka `/api/setup-status`. Jika database Anda masih kosong, statusnya `"schema_missing"` dan terdapat daftar `"missingTables"`.

**Cara alternatif**: gunakan file `wrangler-d1.example.jsonc` sebagai contoh konfigurasi, ganti Database ID dengan UUID nyata lalu simpan sebagai `wrangler.jsonc`.

## TAHAP C — Buat tabel lewat Cloudflare D1 Console (tanpa Codespaces, API Token, atau Wrangler login)

1. Pada Dashboard → D1 → `portal-standar-biaya-db` → **Console**, buka `SETUP-D1-CONSOLE.sql` dari paket ZIP ini menggunakan editor teks.
2. Salin isi SQL dan jalankan pada Console. Jika Console hanya menerima satu pernyataan per eksekusi, jalankan masing-masing `CREATE TABLE` dan `CREATE INDEX` secara berurutan. Semua statement memakai `IF NOT EXISTS` sehingga tidak menghapus data.
3. Jalankan SQL pemeriksaan:

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

4. Seharusnya ada: `settings`, `publications`, `items`, `rates`, `regulations`, `item_regulations`, `documents`, `faqs`, `sync_logs` (dan mungkin `_cf_KV`).
5. Buka kembali `/api/setup-status`; hasil target `"database":"ready"` dengan `"missingTables":[]`.
6. Buka `/api/summary`; sebelum sinkronisasi nilai jumlah akan 0 dan `updatedAt` null. Ini normal.
7. Reload website (`Ctrl+F5`). Banner error lama harus hilang; pustaka/kamus masih kosong sampai data Google Sheets dipublikasikan.

**Penting**: Bila membuat tabel langsung di Console, **jangan menjalankan migrasi melalui Codespaces untuk membuat tabel yang sama tanpa memeriksa statusnya**. SQL ini idempotent; tetapi catatan migrasi Wrangler mungkin belum dibuat. Pilih satu metode pengelolaan migrasi ke depan.

## TAHAP D — Integrasi Google Sheets dan Google Drive (setelah `/api/setup-status` ready)

1. Buat Google Sheet dengan enam tab `MASTER_ITEM`, `BESARAN_BIAYA`, `REGULASI`, `RELASI_REGULASI`, `DOKUMEN`, `FAQ`, menggunakan header `templates/*.csv`.
2. Jangan isi angka simulasi sebagai data resmi. Gunakan sumber terverifikasi yang disetujui pengelola.
3. Siapkan Google Cloud Project dengan Sheets API dan Drive API, serta service account yang hanya diberi akses Viewer pada file/folder yang diperlukan. Ikuti prosedur keamanan instansi untuk private key.
4. Pada `wrangler.jsonc` isi `GOOGLE_SHEET_ID`. Melalui Cloudflare Workers **Secrets** (bukan file GitHub) masukkan `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, dan `SYNC_ADMIN_TOKEN` (minimal 24 karakter, kuat dan unik).
5. Jalankan endpoint sinkronisasi admin lewat lingkungan terpercaya setelah pengujian. Jangan kirim token ke chat, screenshot, atau repository.
6. Validasi tampilan hasil sinkronisasi pada `/api/items`, `/api/regulations`, `/api/documents`, `/api/summary`; uji dokumen Drive dalam mode incognito.
7. Sinkronisasi terjadwal tetap **OFF** sampai proses persetujuan publikasi matang.

## Membaca hasil pemeriksaan

| URL | Hasil | Artinya |
|---|---|---|
| `/api/health` | `status: ok` | Worker hidup, belum menjamin DB sehat |
| `/api/setup-status` | `binding_missing` | Binding D1 belum dimasukkan ke Wrangler |
| `/api/setup-status` | `schema_missing` | Binding benar, tabel belum lengkap |
| `/api/setup-status` | `ready` | Seluruh tabel utama sudah ada |
| `/api/setup-status` | `database_error` | Periksa Logs, izin, dan konfigurasi database |
| `/api/summary` | nilai 0 | Belum ada versi data terpublikasi (normal) |
| `/api/summary` | 500/503 | Periksa error runtime pada Logs |

## Pemeriksaan tambahan

- Root Directory di Cloudflare harus cocok dengan lokasi `worker/index.ts` dan `wrangler.jsonc`.
- Jangan memasukkan token rahasia ke `wrangler.jsonc` maupun environment variable Vite berawalan `VITE_`.
- Periksa link deployment terbaru; browser dapat menampilkan deployment lama bila build/commit belum terpasang.
- Untuk produksi instansi diperlukan persetujuan domain, pengujian keamanan, tata kelola konten, backup dan monitoring, serta implementasi kontrol admin tambahan. Paket ini **belum** dinyatakan production-ready.
