# Perbaikan Login Dashboard SBML — 4.1

## Apa yang diperbaiki
- Error teknis `Unexpected token '<'` kini diganti dengan penjelasan bahwa endpoint login tidak mengembalikan JSON.
- Halaman preview/offline tidak lagi mengirim percobaan login ke host yang salah.
- `/api/health` memberikan penanda versi untuk memastikan deployment yang aktif.
- `/api/login` dengan GET mengembalikan HTTP 405 berformat JSON, bukan HTML.
- Username dengan 2 karakter, contohnya `SB`, didukung. Password minimal 12 karakter untuk keamanan.
- Google Sheets, sembilan kolom SBML dan proteksi API tetap seperti versi sebelumnya.

## Deployment ke Worker sbml42
1. Ekstrak ZIP, unggah **isi ZIP** ke root repository GitHub yang terhubung dengan Worker `sbml42`; ganti berkas lama (khususnya `worker.js`, `backend.js`, `build.mjs`, `public/login.js`, dan `wrangler.jsonc`).
2. `Commit changes` ke branch yang digunakan pada Cloudflare.
3. Cloudflare > Workers & Pages > `sbml42` > Settings > Build.
   - Root directory: root repository.
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy --config ./wrangler.jsonc`
4. Pastikan deployment **Success** pada commit yang baru.
5. **Jangan hapus** empat variabel Google Sheets atau tiga variabel login di Production. Jangan memasukkan password asli atau secret ke GitHub.

## Uji yang menunjukkan versi yang benar-benar aktif
- Buka: `https://sbml42.andriyprast69.workers.dev/api/health`
- Harus muncul: `{"service":"Dashboard SBML","version":"4.1.0","api":"online","login":"/api/login"}`.
- Jika yang muncul HTML, 404 atau versi berbeda, Worker 4.1 **belum aktif** pada URL tersebut. Jangan mengubah password; periksa deployment/repository/root directory dahulu.
- Buka `https://sbml42.andriyprast69.workers.dev/api/login` langsung di browser: harus JSON dengan status HTTP **405** karena login memerlukan POST. Jika HTML, routing Worker masih belum benar.
- Setelah kedua pemeriksaan di atas benar, buka `https://sbml42.andriyprast69.workers.dev/login` dan lakukan login.
- Gunakan tab Incognito atau `Ctrl+Shift+R` jika browser menampilkan versi lama.

## Pengaturan akun
- `LOGIN_USERNAME`: Variable — username yang digunakan (contoh `SB` atau username lain).
- `LOGIN_PASSWORD_HASH`: Secret — hasil dari `SIAPKAN-AKUN-LOGIN.html`, bukan password asli.
- `SESSION_SECRET`: Secret — kunci sesi acak hasil alat offline.
- Gunakan password **minimal 12 karakter**. Password pendek yang sebelumnya pernah dikirim di chat tidak memenuhi ketentuan ini dan sebaiknya tidak digunakan lagi.

## Bila halaman login masih gagal
- `401` JSON: username/password salah; periksa bahwa hash dibuat dari password dan username yang dipilih.
- `503` JSON: tiga variabel login belum lengkap/aktif pada Worker Production.
- HTML bukannya JSON: `/api/login` diarahkan ke HTML, umumnya berkas preview atau kode deploy lama.
- Jangan bagikan password, hasil hash, session secret, atau private key Google Sheets untuk pemeriksaan.
