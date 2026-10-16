# Perbaikan Login Dashboard SBML — Versi 4.3

**Tujuan:** memperjelas penyebab login gagal tanpa mengungkap username/password, hash, ataupun session secret. Semua fitur sebelumnya tetap ada: diagram pie tiga kategori, Google Sheets, pencarian, filter, dan matriks sembilan kolom.

## Hasil pemeriksaan paket sebelumnya

File `PENGATURAN-AKUN-SBML-RAHASIA.txt` yang terpisah dari paket aplikasi telah diuji lokal: username `StandarBiaya` dan password yang sebelumnya ditentukan cocok dengan hash yang disediakan. Jika login gagal di website, periksa variabel Worker dan deployment. **Jangan unggah file rahasia tersebut ke GitHub atau ke website.**

## 1. Atur kembali variabel login di akun Cloudflare yang BENAR

1. Cloudflare > Workers & Pages > **sbml42** (akun **standarbiaya**) > Settings > Variables and Secrets > **Production**.
2. Pastikan tiga isian berikut ada, dengan nama PERSIS:

| Name | Type | Value |
|---|---|---|
| `LOGIN_USERNAME` | Variable | `StandarBiaya` |
| `LOGIN_PASSWORD_HASH` | Secret | Nilai hash **lengkap** dari file pengaturan rahasia terpisah |
| `SESSION_SECRET` | Secret | Nilai acak lengkap dari file pengaturan rahasia terpisah |

3. Bila ada isian lama, pilih **Edit** untuk mengganti nilainya. **Jangan menyalin password biasa** ke `LOGIN_PASSWORD_HASH`.
4. Pastikan `LOGIN_PASSWORD_HASH` diawali `pbkdf2_sha256$` dan memiliki 4 bagian yang dipisahkan `$`. Jangan tambahkan tanda kutip, spasi, atau baris baru.
5. Klik **Deploy / Save and Deploy** di lingkungan Production.
6. **Jangan hapus variabel Google Sheets**: `SHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SHEET_RANGE`.

## 2. Deploy kode perbaikan (bila masih belum berhasil)

1. Ekstrak ZIP aplikasi; unggah **isi ZIP** ke root repository GitHub yang terhubung ke Worker `sbml42`.
2. Commit dan pastikan Cloudflare deployment **Success** dari commit terbaru.
3. Build command: `npm run build`.
4. Deploy command: `npx wrangler deploy --config ./wrangler.jsonc`.
5. Konfigurasi `wrangler.jsonc` memakai Worker `sbml42` dan `keep_vars: true`.

## 3. Periksa tanpa membocorkan rahasia

Buka `https://sbml42.standarbiaya.workers.dev/api/health`.

Versi perbaikan ini akan menampilkan JSON seperti:

```json
{
  "service": "Dashboard SBML",
  "version": "4.3.0",
  "api": "online",
  "login": "/api/login",
  "loginConfiguration": {
    "configured": true,
    "missingOrInvalid": []
  }
}
```

- Jika `version` bukan `4.3.0`, Worker masih menjalankan kode lama.
- Jika `configured: false`, perbaiki isian yang namanya muncul di `missingOrInvalid`. Nilai rahasia tidak akan ditampilkan.
- Jika `configured: true`, login siap dicek; `configured` **tidak menjamin password cocok**, hanya bahwa variabel tersedia dan format dasarnya valid.

Buka `https://sbml42.standarbiaya.workers.dev/login` menggunakan jendela Incognito. Login dengan akun yang telah Anda atur. Saat gagal, halaman sekarang menampilkan kode HTTP:

- **401**: username atau password tidak cocok dengan hash Cloudflare; salin ulang `LOGIN_USERNAME` dan `LOGIN_PASSWORD_HASH` dari file pengaturan rahasia.
- **403**: permintaan ditolak karena asal permintaan tidak sesuai. Pastikan login di domain produksi, bukan preview.
- **429**: terlalu banyak percobaan; tunggu 15 menit.
- **500**: ada masalah pada pemrosesan hash atau kunci sesi; cek pesan diagnosis.
- **503**: variabel login belum lengkap; lihat `/api/health`.
- **HTML / Unexpected token**: Worker lama, deploy keliru, atau halaman preview; periksa `/api/health`.

## Keamanan setelah login normal

- **Ganti password** ke password unik dan panjang karena password yang pernah digunakan sudah tampil dalam chat/screenshot.
- Buat hash baru melalui `SIAPKAN-AKUN-LOGIN.html` yang dijalankan secara offline. Salin hanya `LOGIN_PASSWORD_HASH` dan `SESSION_SECRET` baru ke Cloudflare Secrets, tanpa mengunggahnya ke GitHub.
- Pemeriksaan `loginConfiguration` pada `/api/health` hanya menampilkan status/nama variabel, tidak nilainya. Setelah masalah terselesaikan, Anda dapat menonaktifkan rincian diagnostik bila diperlukan.
