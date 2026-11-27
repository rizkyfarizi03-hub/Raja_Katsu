# Raja Katsu — Aplikasi Pencatatan Penjualan & Laporan Keuangan

Proyek ABK Capstone (Asah 2026), bagian Full-Stack.

```
raja-katsu/
├── frontend/   React + Vite + Tailwind CSS + Axios
├── backend/    Express + PostgreSQL, API di /api/v1
├── ai-service/ FastAPI + Gemini untuk asisten AI
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

Asisten AI tersedia untuk admin. Frontend mengirim pertanyaan ke backend Raja Katsu; backend menyiapkan business context dari laporan dan meneruskannya ke AI Service FastAPI + Gemini di `ai-service/`. AI Service tidak mengakses PostgreSQL secara langsung.

Konfigurasi alamat AI Service di `backend/.env`:

```
AI_API_URL=http://127.0.0.1:8001/
AI_TIMEOUT_MS=20000
```

Riwayat percakapan disimpan di tabel `ai_history` (jalankan `npm run db:schema` sekali untuk membuat tabelnya). Konfigurasi dan cara menjalankan AI Service dijelaskan di [`docs/chatbot-ai-service.md`](docs/chatbot-ai-service.md); kontrak request/response ada di [`docs/api-contract.md`](docs/api-contract.md#asisten-ai-khusus-admin).

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
