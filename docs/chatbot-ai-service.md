# Chatbot Raja Katsu — Panduan Integrasi AI Service

Panduan ini mendokumentasikan integrasi chatbot Raja Katsu dari perspektif tanggung jawab **tim AE (AI Engineer)**: AI Service FastAPI, Gemini, prompt, validasi payload, dan kontrak dengan backend. Dokumen ini menjadi panduan teknis bersama, bukan catatan personal.

Chatbot ditujukan untuk membantu admin memahami fitur aplikasi dan menjelaskan ringkasan laporan. Chatbot bukan layanan pelanggan. Backend Raja Katsu tetap menjadi sumber data bisnis; AI Service tidak terhubung langsung ke PostgreSQL.

## Batas tanggung jawab integrasi

| Bagian | Tanggung jawab |
|---|---|
| Tim AE | Menjaga AI Service FastAPI, integrasi Gemini, prompt, validasi payload AI, dan format jawaban `answer`/`source` |
| Backend Raja Katsu | Autentikasi admin, penyimpanan riwayat, query laporan, dan pengiriman `business_context` ke AI Service |
| Frontend Raja Katsu | Mengirim pertanyaan ke backend serta menampilkan jawaban dan riwayat chatbot |

Dengan pembagian ini, AI Service tidak mengambil data transaksi sendiri. Jika angka laporan tidak ada di `business_context`, chatbot harus menyatakan keterbatasannya dan tidak mengarang angka.

## Arsitektur

```text
Frontend
  → Backend Raja Katsu (/api/v1/ai/chat)
  → Business context dari laporan PostgreSQL
  → AI Service FastAPI (/)
  → Gemini API
  → Jawaban disimpan di ai_history dan ditampilkan di frontend
```

- Frontend hanya mengirim pertanyaan ke backend; frontend tidak memanggil Gemini langsung.
- Endpoint backend chatbot hanya dapat dipakai admin yang sudah login.
- Backend adalah sumber data bisnis. AI Service tidak mengakses database.
- Untuk pertanyaan bisnis yang terdeteksi, backend mengirim ringkasan laporan, maksimal lima produk teratas, dan rekap metode pembayaran.
- Untuk pertanyaan yang tidak membutuhkan data aktual, `business_context` bernilai `null`.
- Data tren belum disertakan dalam business context saat ini.

Dalam integrasi ini, AI Service menerima data terpilih dari backend dan tidak mengakses database atau mengubah sumber laporan.

## Komponen

| Lokasi | Fungsi |
|---|---|
| `frontend/src/components/Asisten.jsx` | Panel chatbot dan pengiriman pertanyaan |
| `backend/src/routes/ai.js` | Autentikasi admin, penyimpanan history, dan pengiriman request ke AI Service |
| `backend/src/services/ai-business-context.js` | Menentukan periode dan menyiapkan agregat laporan dari database backend |
| `ai-service/app.py` | Endpoint FastAPI, validasi payload, dan pemanggilan Gemini |
| `ai-service/prompts/system_prompt.txt` | Aturan dan perilaku chatbot |
| `ai-service/prompts/raja_katsu_context.md` | Pengetahuan statis tentang bisnis Raja Katsu |
| `ai-service/prompts/application_context.md` | Pengetahuan statis tentang fitur dan penggunaan aplikasi |

## Konfigurasi lokal

### Backend

Isi `backend/.env` dengan konfigurasi PostgreSQL lokal dan URL AI Service:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/raja_katsu
DATABASE_SSL=false
JWT_SECRET=isi-dengan-secret-lokal
ADMIN_USERNAME=admin
ADMIN_PASSWORD=isi-password-admin
AI_API_URL=http://127.0.0.1:8001/
AI_TIMEOUT_MS=20000
```

Sesuaikan nama database, user, dan password PostgreSQL dengan instalasi lokal. Jangan commit `.env` atau membagikan credential.

### AI Service

Isi `ai-service/.env`:

```env
GEMINI_API_KEY=isi-api-key-gemini
GEMINI_MODEL=gemini-3.5-flash-lite
```

`GEMINI_MODEL` adalah contoh model hemat yang pernah dipakai untuk tes dasar. Ketersediaan dan kuota bergantung pada API key; pilih model yang aktif di Google AI Studio. Restart AI Service setiap kali konfigurasi berubah.

## Menjalankan aplikasi

Pastikan PostgreSQL berjalan dan database `raja_katsu` sudah dibuat. Jalankan setiap komponen di terminal terpisah.

### 1. Backend

Inisialisasi skema dan seed satu kali untuk database baru, lalu jalankan API:

```powershell
cd backend
npm run db:schema
npm run db:seed
npm run dev
```

Backend berjalan pada `http://localhost:4000`.

### 2. AI Service

```powershell
cd ai-service
.\.venv\Scripts\python.exe -m uvicorn app:app --reload --port 8001
```

AI Service berjalan pada `http://127.0.0.1:8001`.

### 3. Frontend

```powershell
cd frontend
npm run dev
```

Buka URL lokal yang ditampilkan Vite, biasanya `http://localhost:5173`.

## Kontrak request

Frontend mengirim `POST /api/v1/ai/chat` ke backend dengan body:

```json
{ "question": "Berapa omzet minggu ini?" }
```

Backend meneruskan request internal ke AI Service dengan `question`, maksimal 10 pesan `history`, role admin, dan `business_context`. Business context berisi periode, ringkasan omzet/modal/laba kotor/jumlah penjualan, top products, metode pembayaran, dan sumber data. Context disiapkan backend; AI Service tidak menerima kredensial database atau transaksi mentah.

AI Service mengembalikan:

```json
{ "answer": "...", "source": "sales_data" }
```

Backend menyimpan jawaban ke history dan mempertahankan format response API yang digunakan frontend.

## Pengujian

1. Uji model Gemini dari folder `ai-service` dengan kredensial lokal. Pastikan tes `generate_content` berhasil sebelum menguji aplikasi.
2. Untuk pengujian end-to-end, jalankan PostgreSQL, backend, AI Service, dan frontend; masuk sebagai admin lalu ajukan pertanyaan bisnis.
3. Bentuk lengkap request backend-ke-AI Service dan response tercantum di [kontrak API](api-contract.md#asisten-ai-khusus-admin). Gunakan data fixture untuk tes, bukan angka yang dianggap sebagai laporan aktual.

Jangan menyimpan API key, credential database, atau data transaksi asli di dokumentasi maupun fixture yang akan di-commit.

## Interpretasi error

- `422`: payload tidak sesuai skema request FastAPI.
- `502` dari AI Service: pemanggilan Gemini atau validasi hasil gagal; periksa error provider/model/koneksi di tes langsung.
- `502` dari backend: AI Service tidak merespons sukses atau mengembalikan payload jawaban kosong.
- `503` dari backend: layanan AI mengembalikan status rate limit `429`.
- `504` dari backend: AI Service melewati `AI_TIMEOUT_MS`.

AI Service saat ini menyamarkan error provider Gemini sebagai `502`, sehingga error detail provider perlu diperiksa lewat tes langsung saat diagnosis.
