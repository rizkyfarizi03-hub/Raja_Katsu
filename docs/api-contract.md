# Kontrak API & Format Data — Raja Katsu

Dokumen ini jadi pegangan bersama tim Full-Stack, Data Science, dan AI Engineer.
Status: **draft dari tim FS, perlu disepakati tim DS dan AE sebelum pengembangan lanjut.**

## 1. Format data transaksi

Aplikasi menyimpan dan mengekspor transaksi dengan kolom yang sama persis dengan dataset
`TransaksiCateringData_clean.csv`. Model atau analisis yang dibuat dari dataset bisa langsung
dipakai untuk data baru dari aplikasi.

| Kolom CSV | Kolom database | Tipe | Aturan |
|---|---|---|---|
| `Transaction_ID` | `transactions.transaction_code` | teks | `TRX-YYYYMMDD-NNNN`, nomor urut per hari, unik |
| `Date` | `transactions.date` | tanggal | `YYYY-MM-DD` |
| `Product_Name` | `products.name` | teks | unik di antara produk yang belum dihapus |
| `Category` | `products.category` | teks | |
| `Units_Sold` | `transactions.units_sold` | bilangan bulat | minimal 1 |
| `Unit_Price` | `transactions.unit_price` | rupiah | harga jual saat transaksi |
| `Revenue` | `transactions.revenue` | rupiah | selalu `Units_Sold × Unit_Price` |
| `Payment_Method` | `transactions.payment_method` | teks | `Cash`, `QRIS`, atau `Transfer` |
| `Unit_Cost` | `transactions.unit_cost` | rupiah | modal produk saat transaksi |

Catatan:

- Satu baris = satu produk dalam satu penjualan. Penjualan berisi 3 produk menjadi 3 baris.
- Kolom tambahan di database yang tidak ikut diekspor: `order_code` (pengelompok pesanan),
  `sold_time` (jam), `cash_received` (uang diterima), `created_by` (pencatat), serta
  `voided_at`, `voided_by`, `void_reason` (pembatalan). Baris yang dibatalkan tidak diekspor.
- Laba tidak disimpan, dihitung: `Revenue − Units_Sold × Unit_Cost`. Ini **laba kotor**: biaya operasional
  (sewa, gaji, listrik, gas) tidak dicatat di aplikasi. Field `profit` di API berarti laba kotor.
- Di database, nilai rupiah disimpan sebagai bilangan bulat. Di CSV ekspor ditulis `8000.0`
  supaya sama dengan dataset.
- Harga dan modal disalin ke transaksi saat disimpan. Mengubah harga produk tidak mengubah
  transaksi lama.
- Data awal di database berasal dari dataset dummy (Kaggle, "Dataset Penjualan Dummy").
  Nama produknya belum menu Raja Katsu.

### Mengambil data terbaru dari aplikasi (untuk DS/AE)

```
GET /api/v1/transactions/export?from=2026-01-01&to=2026-12-31
Authorization: Bearer <token>
```

Hasilnya file CSV dengan header:

```
Transaction_ID,Date,Product_Name,Category,Units_Sold,Unit_Price,Revenue,Payment_Method,Unit_Cost
```

`from` dan `to` opsional. Tanpa keduanya, semua transaksi diekspor.

## 2. Aturan umum API

- Base URL: `/api/v1`
- Semua endpoint selain `/health` dan `/auth/login` butuh header `Authorization: Bearer <token>`.
- Request dan response berformat JSON (kecuali ekspor CSV).

Response berhasil:

```json
{ "status": "success", "message": "opsional", "data": {}, "meta": {} }
```

Response gagal:

```json
{
  "status": "error",
  "message": "Data yang dikirim belum sesuai.",
  "errors": [{ "field": "items.0.units_sold", "message": "Jumlah minimal 1." }]
}
```

| Kode | Arti |
|---|---|
| 200 | Berhasil |
| 201 | Data berhasil dibuat |
| 400 | Data yang dikirim tidak valid (lihat `errors`) |
| 401 | Belum login, sesi habis, atau akun dinonaktifkan |
| 403 | Peran tidak berhak (misalnya kasir membuka laporan) |
| 404 | Data tidak ditemukan |
| 409 | Data bentrok (misalnya nama produk sudah ada) |
| 500 | Kesalahan server |

## 3. Daftar endpoint

Ada dua peran: **admin** (semua fitur) dan **kasir** (catat penjualan dan riwayat hari ini,
tanpa melihat modal dan laba). Kolom "Peran" menunjukkan siapa yang boleh memanggil endpoint.
Permintaan dari peran yang tidak berhak dijawab `403`.

### Auth

| Method | Endpoint | Peran | Body | Hasil |
|---|---|---|---|---|
| POST | `/auth/login` | semua | `{ username, password }` | `{ token, user: { id, username, name, role } }` |
| GET | `/auth/me` | semua | | `{ id, username, name, role }` |

Akun yang dinonaktifkan langsung tidak bisa dipakai, termasuk token yang masih berlaku.

### Pengguna

| Method | Endpoint | Peran | Keterangan |
|---|---|---|---|
| GET | `/users` | admin | Daftar akun |
| POST | `/users` | admin | `{ name, username, password, role }` |
| PUT | `/users/:id` | admin | `{ name, username, role, is_active, password? }`. Kata sandi hanya diganti kalau `password` diisi |

Tidak ada pendaftaran sendiri. Admin tidak bisa menonaktifkan atau mengubah peran akunnya sendiri.

### Produk (menu)

| Method | Endpoint | Peran | Keterangan |
|---|---|---|---|
| GET | `/products` | semua | Menu aktif. `?all=true` ikut menampilkan yang nonaktif. Untuk kasir, `unit_cost` tidak dikirim |
| GET | `/products/:id/photo` | tanpa login | Gambar foto menu (dipakai tag `<img>`). `404` kalau menu belum punya foto |
| POST | `/products` | admin | `{ name, category, unit_price, unit_cost, photo? }` |
| PUT | `/products/:id` | admin | Body sama, ditambah `is_active` (opsional) |
| DELETE | `/products/:id` | admin | Menghapus menu. Kalau sudah punya penjualan, menunya disembunyikan dan penjualan lamanya tetap terhitung |

Objek produk:

```json
{ "id": 1, "name": "Pink Lava Original", "category": "Pop Ice", "unit_price": 8000, "unit_cost": 3550, "is_active": true, "photo_version": 1794808645 }
```

Foto: `photo` di body berisi data URL (`data:image/jpeg;base64,...`, maksimal 400 KB). Tidak dikirim =
foto tidak diubah, `null` = foto dihapus. `photo_version` kosong (`null`) kalau menu belum punya
foto; nilainya berubah setiap foto diganti dan dipakai sebagai `?v=` di alamat foto.

### Pesanan (penjualan)

Satu pesanan = satu kali penjualan, bisa berisi beberapa menu. Di database tiap menu tetap
satu baris di `transactions` (sama seperti dataset), dan baris-baris satu pesanan memakai
`order_code` yang sama. `order_code` = `Transaction_ID` baris pertamanya.

| Method | Endpoint | Peran | Keterangan |
|---|---|---|---|
| GET | `/orders` | semua | Filter: `from`, `to`, `payment_method`, `status`, `page`, `limit`. Kasir selalu hanya hari ini. `status=batal` (khusus admin) menampilkan yang dibatalkan |
| GET | `/orders/:code` | semua | Rincian satu pesanan. Kasir hanya pesanan hari ini |
| POST | `/orders` | semua | Mencatat penjualan |
| POST | `/orders/:code/void` | admin | Membatalkan pesanan. Body `{ reason }` wajib diisi |

Body `POST /orders`:

```json
{
  "payment_method": "Cash",
  "cash_received": 50000,
  "date": "2026-11-15",
  "time": "12:40",
  "items": [
    { "product_id": 1, "units_sold": 2 },
    { "product_id": 2, "units_sold": 3 }
  ]
}
```

- `cash_received` opsional, hanya dipakai kalau `payment_method` = `Cash`, dan tidak boleh kurang dari total.
- `date` dan `time` hanya berlaku untuk admin dan tidak boleh melewati hari ini. Untuk kasir,
  waktu selalu diisi server dengan waktu sekarang (Asia/Jakarta).
- Harga, modal, dan total dihitung server dari data menu.

Objek pesanan (untuk kasir, `cost`, `profit`, dan `unit_cost` tidak dikirim):

```json
{
  "order_code": "TRX-20261116-0001", "date": "2026-11-16", "time": "12:40",
  "payment_method": "Cash", "cash_received": 50000, "change": 37000,
  "units_sold": 3, "total": 13000, "cost": 6550, "profit": 6450,
  "summary": "Mentai Dimsum Kecil ×2, Thai Tea Cheese ×1",
  "created_by": 2, "created_by_name": "Siti",
  "items": [
    { "id": 141008, "transaction_code": "TRX-20261116-0001", "product_id": 2, "product_name": "Mentai Dimsum Kecil",
      "category": "Dimsum", "units_sold": 2, "unit_price": 2500, "unit_cost": 1500, "revenue": 5000, "profit": 2000 }
  ]
}
```

Tidak ada endpoint hapus. Pesanan yang salah catat **dibatalkan** oleh admin: barisnya tetap
tersimpan dengan `voided_at`, `voided_by_name`, dan `void_reason`, tapi tidak ikut dihitung di
daftar biasa, di laporan, maupun di ekspor CSV. Ini supaya selalu ada jejak dan kasir tidak bisa
menghilangkan penjualan yang sudah dicatat.

`time` kosong (`null`) untuk data awal dari dataset, karena dataset tidak punya jam.
`items` hanya ada di rincian dan hasil `POST`, tidak di daftar.

### Transaksi per baris (format dataset)

| Method | Endpoint | Peran | Keterangan |
|---|---|---|---|
| GET | `/transactions` | admin | Satu baris per menu. Filter: `from`, `to`, `product_id`, `category`, `payment_method`, `page`, `limit` (maks 100) |
| GET | `/transactions/export` | admin | CSV format dataset. Filter: `from`, `to` |

### Laporan

Semua menerima `from` dan `to` (opsional).

| Method | Endpoint | Peran | Keterangan |
|---|---|---|---|
| GET | `/reports/recap-today` | semua | Rekap hari ini untuk tutup kasir: `{ date, revenue, orders, by_payment: [{ payment_method, revenue, orders }] }` |
| GET | `/reports/summary` | admin | `{ revenue, cost, profit, units_sold, transactions, orders, margin_percent }` |
| GET | `/reports/trend` | admin | `?group=day` atau `month`. Daftar `{ period, revenue, cost, profit, units_sold, transactions, orders }` |
| GET | `/reports/by-category` | admin | Per kategori |
| GET | `/reports/by-payment` | admin | Per cara bayar |
| GET | `/reports/top-products` | admin | `?limit=5`. Menu terlaris menurut jumlah terjual |

`transactions` = jumlah baris (satu per menu), `orders` = jumlah pesanan.

### Asisten AI (khusus admin)

Frontend tidak memanggil layanan AI langsung. Semua lewat backend aplikasi, dan setiap pesan disimpan
di tabel `ai_history` (kolom `user_id`, `role` = `user`/`assistant`, `content`, `source`, `created_at`).

| Method | Endpoint | Peran | Keterangan |
|---|---|---|---|
| GET | `/ai/chat` | admin | `{ connected, messages: [{ id, role, content, source, created_at }] }`, 50 pesan terakhir |
| POST | `/ai/chat` | admin | Body `{ question }` (2–500 huruf). Response 201: `{ connected, messages: [pertanyaan, jawaban] }` |
| DELETE | `/ai/chat` | admin | Menghapus percakapan admin yang sedang masuk |

`connected` bernilai `false` selama `AI_API_URL` di `backend/.env` kosong. Saat itu asisten menjawab
bahwa layanannya belum tersambung, supaya tampilan tetap bisa dicoba.

Kode error untuk frontend: `400` pertanyaan tidak valid, `502` layanan AI error atau jawabannya kosong,
`503` layanan AI kena batas pemakaian (status 429 dari layanan AI), `504` layanan AI lebih lama dari `AI_TIMEOUT_MS`.
Pertanyaan tetap tersimpan walaupun layanan AI gagal menjawab.

#### Yang harus disediakan tim AE (layanan FastAPI/Flask)

Backend aplikasi mengirim `POST` ke alamat di `AI_API_URL`, dengan header `Authorization: Bearer <AI_API_KEY>`
kalau `AI_API_KEY` diisi.

Request:

```json
{
  "question": "Gimana penjualan minggu ini?",
  "history": [
    { "role": "user", "content": "pertanyaan sebelumnya" },
    { "role": "assistant", "content": "jawaban sebelumnya" }
  ],
  "user": { "id": 1, "name": "Pemilik", "role": "admin" }
}
```

`history` berisi paling banyak 10 pesan terakhir, urut dari yang lama.

Response yang diharapkan (status 200):

```json
{ "answer": "Minggu ini uang masuk Rp1.194.000 ...", "source": "data penjualan 3–9 Nov 2026" }
```

`answer` wajib diisi (teks biasa, maksimal 4000 huruf). `source` boleh dikosongkan. Kalau sedang kena batas
pemakaian API, balas dengan status `429`. Data penjualan bisa diambil layanan AI dari endpoint ekspor CSV atau
dari database yang sama; ini masih perlu disepakati.

## 4. Yang masih perlu disepakati dengan DS dan AE

Endpoint berikut belum dibuat. Ini usulan bentuknya supaya bisa dibahas:

| Kebutuhan | Usulan | Pertanyaan untuk tim |
|---|---|---|
| Hasil DS tampil di aplikasi | `GET /api/v1/insights/...` (backend meneruskan ke layanan DS) | Bentuknya dasbor, prediksi, atau rekomendasi? Format response-nya apa? |
| Fitur Gen AI | Sudah ada `POST /api/v1/ai/chat` (lihat bagian Asisten AI). Tinggal mengisi `AI_API_URL` | Alamat layanan FastAPI/Flask-nya apa, dan apakah bentuk request/response di atas cocok? |
| Riwayat Gen AI | Sudah ada tabel `ai_history` | Perlu kolom tambahan (misalnya nama model atau lama menjawab)? |
| Nama produk | Ganti ke menu Raja Katsu atau tetap data dummy | Siapa yang menyiapkan daftar menu, harga, dan modalnya? |
