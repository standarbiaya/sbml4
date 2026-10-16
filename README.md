# Portal Kamus Standar Biaya — Perbaikan V2

**MULAI DI SINI:** [PANDUAN-MULAI-ULANG.md](PANDUAN-MULAI-ULANG.md)

Versi ini menangani kondisi umum yang sebelumnya menyebabkan HTTP 500 saat database D1 baru dibuat dan belum memiliki tabel. Worker kini menyediakan endpoint `/api/health` dan `/api/setup-status`; UI menampilkan informasi persiapan jika database belum siap.

### Yang disertakan
- React UI (beranda, kamus, detail, dashboard, regulasi, pustaka, FAQ)
- API Cloudflare Worker dan verifikasi status D1
- Migrasi SQL `migrations/0001_initial.sql` serta `SETUP-D1-CONSOLE.sql` untuk Cloudflare Dashboard
- Template Google Sheets CSV
- Sinkronisasi Google Sheets/Drive via service account, masih butuh konfigurasi dan validasi production
- Preview HTML mandiri `preview-offline.html` (data simulasi)

### Perintah pemeriksaan struktur tanpa npm

```bash
python scripts/check_project.py
```

### Perintah build (Codespaces / komputer berinternet)

```bash
npm install
npm run check
npm run build
```

Keterbatasan: lingkungan pembuat paket ini tidak dapat menjangkau registry npm, sehingga build akhir perlu diverifikasi saat dipasang di GitHub/Cloudflare.
