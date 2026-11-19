# Product

## Platform

web

## Users

Dua peran, keduanya dipakai sehari-hari di Raja Katsu (restoran katsu, UMKM), lewat HP maupun desktop:

- **Kasir**: mencatat penjualan saat melayani pembeli, melihat penjualan hari ini, dan rekap tutup kasir per cara bayar.
- **Admin**: melihat ringkasan keuangan (uang masuk, modal, laba kotor), riwayat semua tanggal, membatalkan penjualan yang salah catat, mengelola menu & harga, mengelola akun, dan mengunduh CSV.

Satu akun untuk satu orang; akun kasir tidak dipakai bersama. Penggunanya orang non-teknis.

Belum dipastikan: siapa persisnya pemegang akun admin (pemilik atau orang lain).

## Product Purpose

Menggantikan pencatatan penjualan di buku/catatan manual dengan aplikasi web yang mencatat penjualan dengan cepat dan langsung menghasilkan laporan keuangan sederhana. Berhasil berarti: kasir bisa mencatat tanpa pelatihan panjang, dan admin bisa tahu uang masuk dan laba kotor per hari, minggu, atau bulan tanpa menghitung manual.

## Positioning

Dibanding buku catatan: laporan terhitung otomatis, dan penjualan yang sudah dicatat tidak bisa dihilangkan diam-diam. Kasir tidak bisa menghapus atau membatalkan penjualan; hanya admin yang bisa membatalkan, wajib dengan alasan, dan penjualan yang dibatalkan tetap tercatat dan terlihat.

## Operating Context

- Kasir mencatat di meja kasir saat melayani pembeli; alurnya 3 langkah (pilih menu, cek pesanan, simpan) dengan cara bayar Cash, QRIS, atau Transfer, kalkulator kembalian untuk tunai, dan layar konfirmasi "Penjualan tersimpan".
- Akhir hari: rekap tutup kasir per cara bayar.
- Admin membaca laporan dan mengelola data dari HP atau desktop.
- Proyek capstone ABK (Asah 2026); harus memenuhi checklist Asah dan bisa diakses online termasuk dari HP.

## Capabilities and Constraints

- Stack yang sudah ada: frontend React + Vite + Tailwind + Axios; backend Express + PostgreSQL (Neon), API di `/api/v1`; validasi Joi.
- Laba yang ditampilkan adalah **laba kotor** (pendapatan dikurangi modal produk); biaya operasional tidak dicatat.
- Modal dicatat per produk, tidak per bahan; tidak ada fitur belanja bahan.
- Kasir tidak boleh melihat modal dan laba.
- Penjualan tidak pernah dihapus dari database.
- Akun dibuat admin/tim; tidak ada pendaftaran sendiri.
- Produk bisa dihapus; produk yang sudah pernah terjual disembunyikan, riwayatnya tetap.
- Akan ditambah dari tim AI: chatbot untuk pertanyaan seputar administrasi Raja Katsu dan analisis penjualan mingguan. Bentuk dan letaknya belum diputuskan.
- Belum diputuskan: cara pemilik menghitung modal (kemungkinan hanya modal per kelompok menu), menunggu jawaban pihak Raja Katsu.
- Bahasa antarmuka: Indonesia.

## Brand Commitments

Nama: Raja Katsu. Belum ada logo atau aset identitas resmi.

## Evidence on Hand

- Data: `backend/data/TransaksiCateringData_clean.csv`, dataset dummy dari Kaggle ("Dataset Penjualan Dummy"), 35.242 transaksi, 55 produk. Bukan data asli Raja Katsu; nama produknya bukan menu Raja Katsu.
- Desain: file Figma "Raja Katsu – UI Design" (gaya v2).
- Tidak ada: logo, foto menu asli, daftar menu & harga asli, testimoni, atau data penjualan asli. Jangan dibuat-buat.

## Product Principles

1. Mudah untuk orang non-teknis: satu tugas jelas per layar, bahasa sehari-hari, tidak perlu pelatihan.
2. Catatan penjualan dapat dipercaya: tidak ada yang hilang diam-diam, setiap pembatalan punya jejak.
3. Kasir hanya melihat yang ia butuhkan; angka modal dan laba khusus admin.
4. Cepat di saat ramai: mencatat penjualan harus selesai dalam beberapa ketukan, di HP maupun desktop.
5. Jujur soal angka: laba disebut laba kotor, data dummy disebut dummy.
