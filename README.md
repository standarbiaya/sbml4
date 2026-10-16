# Dashboard SBML — Login dan Diagnostik 4.3

Worker produksi: **sbml42.standarbiaya.workers.dev**.

## Fitur

- Login username/password di sisi server (hash PBKDF2, cookie Secure/HttpOnly/SameSite=Strict, sesi 8 jam).
- Proteksi halaman dashboard dan `/api/sbml` tanpa membuka Google Sheets publik.
- Diagram pie tiga keputusan: Disetujui, Ditolak, Proses/Status Lain.
- Matriks 9 kolom, dengan Keterangan; pencarian dan filter; Google Sheets sebagai satu-satunya sumber data.
- Diagnosis konfigurasi *tanpa membocorkan rahasia* pada `/api/health` dan pesan kesalahan HTTP lebih jelas.

## Instalasi dan pemeriksaan

Lihat **PANDUAN-PERBAIKAN-LOGIN.md**. Build: `npm run build`, deploy: `npx wrangler deploy --config ./wrangler.jsonc`.

**Jangan pernah unggah password, hash, kunci sesi, atau JSON Service Account ke GitHub.** Atur rahasia hanya pada Cloudflare Worker Production > Variables and Secrets.
