# Dashboard SBML versi 4.4 — Perbaikan Login Cloudflare

Versi ini memperbaiki error **HTTP 500: Gagal memproses konfigurasi hash password** yang terjadi karena implementasi WebCrypto PBKDF2 Cloudflare Workers dapat membatasi jumlah iterasi menjadi 100.000, sedangkan paket login lama menghasilkan hash dengan 210.000 iterasi.

**Status aplikasi:** login server-side tetap wajib, proteksi `/api/sbml` tetap aktif, dashboard dengan diagram pie tiga kategori tetap tersedia, sumber data hanya Google Sheets.

## Penerapan ke website sbml42.standarbiaya.workers.dev

1. Ekstrak ZIP, unggah **isi folder** ke root repository GitHub yang terhubung ke Worker `sbml42`. Jangan mengunggah ZIP itu sendiri.
2. Commit perubahan. Atur Build command `npm run build`, Deploy command `npx wrangler deploy --config ./wrangler.jsonc`, root directory root repository.
3. Setelah deployment sukses, buka `https://sbml42.standarbiaya.workers.dev/api/health` dan pastikan `version` = `4.4.0`.
4. Di Cloudflare → Workers & Pages → `sbml42` → Settings → Variables and Secrets → **Production**, edit `LOGIN_PASSWORD_HASH` (Type **Secret**) menjadi kode baru berawalan `pbkdf2_sha256$100000$` dari file rahasia yang diberikan terpisah. **Jangan** masukkan nilai hash ke GitHub atau Wrangler.
5. `LOGIN_USERNAME` tetap `StandarBiaya` dan `SESSION_SECRET` tetap seperti semula. Jangan ubah `SHEET_ID`, `SHEET_RANGE`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`.
6. Klik Deploy untuk menerapkan perubahan Secret, buka `/api/health` kembali. `loginConfiguration.configured` harus `true` dan `missingOrInvalid` harus `[]`.
7. Coba login di `https://sbml42.standarbiaya.workers.dev/login` melalui tab Incognito.

**Penting:** jangan mengunggah file `HASH-LOGIN-SBML-BARU-RAHASIA.txt` ke repository. File tersebut hanya untuk konfigurasi Cloudflare. Secret seharusnya tidak terlihat oleh pengunjung web.

## Mengubah password di kemudian hari

Buka `SIAPKAN-AKUN-LOGIN.html` **secara lokal** di Chrome atau Edge, isi username dan password baru yang kuat, klik "Buat 3 Pengaturan Cloudflare", kemudian ganti hanya `LOGIN_PASSWORD_HASH` di Production. Jika ingin mengakhiri seluruh sesi lama, sekalian rotasi `SESSION_SECRET`. Alat offline menghasilkan hash dengan 100.000 iterasi, sesuai batas kompatibilitas WebCrypto saat ini.

## Keamanan

PBKDF2 100.000 iterasi merupakan **kompromi kompatibilitas**, bukan standar hashing password yang ideal untuk sistem sensitif. Gunakan password unik dan kuat; karena password lama pernah tertulis di percakapan, ganti setelah login berhasil. Untuk data instansi, pertimbangkan Cloudflare Access/MFA dan pembatasan akses API sebagai perlindungan tambahan. Session cookie menggunakan `HttpOnly`, `Secure`, `SameSite=Strict`, durasi 8 jam. Rate limiting lokal di Worker hanya best-effort; perlindungan WAF/Cloudflare diperlukan untuk rate limiting terdistribusi.

## Uji lokal

```
npm run build
npm run check
```

`/api/health` dapat diakses tanpa autentikasi untuk verifikasi versi dan nama variabel yang belum benar, tidak menampilkan nilai rahasia.
