# Raja Katsu — Aplikasi Pencatatan Penjualan & Laporan Keuangan

Proyek ABK Capstone (Asah 2026), bagian Full-Stack.

```
raja-katsu/
├── backend/    Express + PostgreSQL, API di /api/v1
├── frontend/   React + Vite + Tailwind CSS + Axios
└── docs/       Kontrak API dan format data (untuk tim DS dan AE)
```

## Fitur

1. **Pencatatan penjualan**: dipandu 3 langkah (pilih menu, cek pesanan, simpan), dengan cara
   bayar, hitung kembalian, dan layar konfirmasi "Penjualan tersimpan".
2. **Ringkasan keuangan (Beranda)**: uang masuk, modal menu terjual, laba kotor, rekap per cara
   bayar, grafik harian, dan menu terlaris, per hari, minggu, atau bulan.

Pendukung: riwayat penjualan dengan rincian dan pembatalan, kelola menu dan harga, kelola pengguna,
halaman bantuan, unduh CSV.

### Peran pengguna

| | Admin | Kasir |
|---|---|---|
| Catat penjualan | Ya, boleh memilih tanggal sebelumnya | Ya, waktu otomatis |
| Riwayat | Semua tanggal, lihat siapa pencatatnya | Hari ini saja, dengan rekap tutup kasir |
| Batalkan penjualan | Ya, wajib isi alasan | Tidak, lapor ke admin |
| Beranda (modal, laba kotor) | Ya | Tidak |
| Menu & Harga, Pengguna, Unduh CSV | Ya | Tidak |

Penjualan tidak pernah dihapus dari database. Yang salah catat dibatalkan admin: tetap tersimpan
dengan alasan dan nama pembatalnya, terlihat di Riwayat bagian Dibatalkan, dan tidak dihitung di
laporan. Tujuannya supaya penjualan yang sudah dicatat tidak bisa dihilangkan diam-diam.

Akun dibuat oleh admin di halaman Pengguna, tidak ada pendaftaran sendiri. Kata sandi kasir
bisa diganti admin lewat tombol Ubah.

Tampilan mengikuti desain Figma "Raja Katsu – UI Design" (gaya v2).

Foto menu diunggah admin dari halaman Menu & Harga. Foto diperkecil di browser (sisi terpanjang
480 px) lalu disimpan di database, jadi tidak perlu layanan penyimpanan lain. Menu yang belum
punya foto tampil sebagai kotak berwarna berisi inisial namanya.

Laba di aplikasi adalah **laba kotor** (pendapatan dikurangi modal produk). Biaya operasional
seperti sewa, gaji, listrik, dan gas tidak dicatat.

## Menjalankan di laptop

Butuh Node.js 20+ dan PostgreSQL (lokal, atau gratis di https://neon.tech).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # lalu isi DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
npm run db:schema         # membuat tabel
npm run db:seed           # mengisi produk + transaksi dari CSV, dan membuat akun admin
npm run dev               # API jalan di http://localhost:4000/api/v1
```

Kalau pakai Neon, isi `DATABASE_SSL=true`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api/v1
npm run dev               # buka http://localhost:5173
```

Masuk dengan `ADMIN_USERNAME` dan `ADMIN_PASSWORD` yang diisi di `backend/.env`. Akun ini berperan
admin. Akun kasir dibuat dari halaman Pengguna.

### Asisten AI

Tombol **Tanya asisten** ada di Beranda (laptop) dan bilah atas (HP), khusus admin. Frontend memanggil
`/api/v1/ai/chat` di backend, lalu backend meneruskannya ke layanan AI tim AE. Isi variabel ini di `backend/.env`:

```
AI_API_URL=        # alamat layanan AI (FastAPI/Flask), kosongkan selama belum siap
AI_API_KEY=        # opsional, dikirim sebagai header Authorization: Bearer
AI_TIMEOUT_MS=20000
```

Selama `AI_API_URL` kosong, asisten menjawab bahwa layanannya belum tersambung. Riwayat percakapan disimpan di
tabel `ai_history` (jalankan `npm run db:schema` sekali untuk membuat tabelnya). Kontrak request/response untuk
tim AE ada di `docs/api-contract.md`, bagian Asisten AI.

## Database

Skema ada di `backend/db/schema.sql`: tabel `users` (dengan peran), `products`, `product_photos`,
`transactions`.

`npm run db:schema` dan `npm run db:seed` aman dijalankan ulang. Kalau `schema.sql` berubah,
jalankan `npm run db:schema` lagi untuk memperbarui database yang sudah ada.
Untuk memakai file CSV lain dengan kolom yang sama:

```bash
npm run db:seed -- path/ke/file.csv
```

## Sumber data

Data awal berasal dari dataset dummy "Dataset Penjualan Dummy" (Kaggle):
https://www.kaggle.com/datasets/hafidzunalimaljazari/dataset-penjualan-dummy

File yang dipakai: `backend/data/TransaksiCateringData_clean.csv` (35.242 transaksi,
1 Jan 2025 sampai 31 Okt 2026, 55 produk). Ini **data dummy**, bukan data penjualan asli
Raja Katsu, dan nama produknya belum menu Raja Katsu.

## Deploy (free tier)

| Bagian | Layanan | Catatan |
|---|---|---|
| Database | Neon | Salin connection string ke `DATABASE_URL`, `DATABASE_SSL=true` |
| Backend | Render (Web Service) | Root `backend`, build `npm install`, start `npm start`, isi semua variabel `.env`. Jalankan `npm run db:schema` dan `npm run db:seed` sekali |
| Frontend | Netlify atau Cloudflare Pages | Root `frontend`, build `npm run build`, folder hasil `dist`, isi `VITE_API_URL` dengan alamat backend |

Setelah frontend punya alamat, isi `CORS_ORIGIN` di backend dengan alamat itu.

## Dokumentasi API

Lihat `docs/api-contract.md`.
