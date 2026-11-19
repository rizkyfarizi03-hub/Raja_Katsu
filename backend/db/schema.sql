-- Skema database Raja Katsu
-- Semua nilai uang disimpan sebagai INTEGER (rupiah, tanpa desimal).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'kasir')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Peran pengguna. admin: semua fitur. kasir: catat penjualan dan lihat riwayat hari ini.
-- Dua baris ini memperbarui database yang dibuat dengan skema versi sebelumnya.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'kasir'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS products (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  category   VARCHAR(50)  NOT NULL,
  unit_price INTEGER      NOT NULL CHECK (unit_price >= 0),  -- harga jual
  unit_cost  INTEGER      NOT NULL CHECK (unit_cost >= 0),   -- modal produk
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,                                     -- terisi = produk sudah dihapus
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Produk yang dihapus tapi sudah punya penjualan tetap disimpan (deleted_at terisi)
-- supaya laporan lama tidak berubah. Nama hanya wajib unik di antara produk yang belum dihapus.
-- Tiga baris ini juga memperbarui database yang dibuat dengan skema versi sebelumnya.
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS products_name_active_key ON products (name) WHERE deleted_at IS NULL;

-- Satu baris = satu produk dalam satu penjualan (sama seperti dataset).
-- Baris-baris dari satu pesanan yang sama memakai order_code yang sama.
-- unit_price dan unit_cost disalin dari produk saat transaksi disimpan,
-- supaya laporan lama tidak berubah ketika harga produk diganti.
CREATE TABLE IF NOT EXISTS transactions (
  id               SERIAL PRIMARY KEY,
  transaction_code VARCHAR(20) NOT NULL UNIQUE,              -- TRX-YYYYMMDD-NNNN
  date             DATE        NOT NULL,
  product_id       INTEGER     NOT NULL REFERENCES products(id),
  units_sold       INTEGER     NOT NULL CHECK (units_sold > 0),
  unit_price       INTEGER     NOT NULL CHECK (unit_price >= 0),
  unit_cost        INTEGER     NOT NULL CHECK (unit_cost >= 0),
  revenue          INTEGER     NOT NULL CHECK (revenue >= 0), -- units_sold * unit_price
  payment_method   VARCHAR(10) NOT NULL CHECK (payment_method IN ('Cash', 'QRIS', 'Transfer')),
  order_code       VARCHAR(20),                               -- kode pesanan = transaction_code baris pertamanya
  sold_time        TIME,                                      -- jam penjualan (kosong untuk data dari dataset)
  cash_received    INTEGER,                                   -- uang diterima dari pembeli (hanya tunai)
  voided_at        TIMESTAMPTZ,                               -- terisi = penjualan dibatalkan (tidak dihitung di laporan)
  voided_by        INTEGER     REFERENCES users(id),          -- admin yang membatalkan
  void_reason      VARCHAR(200),                              -- alasan pembatalan
  created_by       INTEGER     REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions (product_id);

-- Pembaruan untuk database yang dibuat dengan skema versi sebelumnya.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_code VARCHAR(20);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sold_time TIME;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cash_received INTEGER;
UPDATE transactions SET order_code = transaction_code WHERE order_code IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions (order_code);

-- Penjualan tidak pernah dihapus dari database. Yang salah catat dibatalkan oleh admin:
-- barisnya tetap ada lengkap dengan alasan dan siapa yang membatalkan, tapi tidak ikut dihitung.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS voided_by INTEGER REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS void_reason VARCHAR(200);

-- Foto menu disimpan di database supaya tidak perlu layanan penyimpanan lain.
-- Foto sudah diperkecil di browser sebelum dikirim (sekitar 30-80 KB per foto).
CREATE TABLE IF NOT EXISTS product_photos (
  product_id INTEGER     PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  mime       VARCHAR(20) NOT NULL,
  data       BYTEA       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Riwayat percakapan dengan asisten AI (khusus admin). Satu baris = satu pesan.
-- role 'user' = pertanyaan admin, 'assistant' = jawaban asisten. source = sumber jawaban dari layanan AI.
CREATE TABLE IF NOT EXISTS ai_history (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id),
  role       VARCHAR(10)  NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT         NOT NULL,
  source     VARCHAR(200),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_history_user ON ai_history (user_id, created_at);
