# Meta Ads Report App

Aplikasi untuk:
RAW Excel/CSV -> deteksi P-code -> mapping nama -> grouped report -> fee/kurs -> export Excel.

## Penting untuk menjalankan

Di folder project yang berisi `package.json`:

```bash
npm install
npm run dev
```

Lalu buka:
`http://localhost:3000`

## RAW
Kolom yang dibaca:
- Account Name
- Amount Spent

Contoh:
`TRX-Janji33.P10-A213` -> otomatis Group `P10`

## Mapping
- P9 -> ROBERT
- P10 -> IZAD
- P6 -> chip
- P4 -> VT

Nama mapping dapat diubah dari aplikasi.

## Jika folder lama masih dipakai

Pastikan `package.json` ada di:
`C:\Users\User\meta-report-app\package.json`

Lalu jalankan:

```bash
cd C:\Users\User\meta-report-app
npm install
npm run dev
```

Jangan menjalankan `npm run dev` dari folder yang tidak memiliki `package.json`.
