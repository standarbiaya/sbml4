# Perbaikan login HTTP 500 — Dashboard SBML

**Penyebab ditemukan:** pembuat akun lama membuat `pbkdf2_sha256$210000$...`; Cloudflare Workers memiliki batas WebCrypto PBKDF2 100.000 iterasi pada runtime ini. Runtime menolak 210.000 saat login.

1. Pasang aplikasi v4.4.0 dari ZIP ke repository GitHub Worker `sbml42`; commit & tunggu deploy sukses.
2. Periksa `https://sbml42.standarbiaya.workers.dev/api/health` → `version: 4.4.0`. Dengan hash lama 210k, respons akan menampilkan `missingOrInvalid: ["LOGIN_PASSWORD_HASH"]`.
3. Cloudflare → Worker `sbml42` → Settings → Variables and Secrets → Production → edit `LOGIN_PASSWORD_HASH` → pilih **Secret** → masukkan hash baru dari file `HASH-LOGIN-SBML-BARU-RAHASIA.txt` → Deploy.
4. Pastikan `/api/health` menampilkan `loginConfiguration: {configured:true, missingOrInvalid:[]}`.
5. Login dengan username dan password yang Anda pilih di `https://sbml42.standarbiaya.workers.dev/login`.

**Tidak perlu mengubah SESSION_SECRET atau empat variabel Google Sheets.** Jangan meletakkan file rahasia di GitHub.
