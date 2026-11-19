// Mengisi database dari dataset CSV + membuat akun admin.
// Aman dijalankan ulang: produk dan transaksi yang sudah ada tidak digandakan.
//   npm run db:seed
//   npm run db:seed -- path/ke/file.csv
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';
import { pool } from '../src/db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const csvPath = process.argv[2] || path.join(dir, '../data/TransaksiCateringData_clean.csv');
const BATCH = 2000;

const rows = parse(fs.readFileSync(csvPath), { columns: true, skip_empty_lines: true, trim: true });
console.log(`Membaca ${rows.length} baris dari ${path.basename(csvPath)}`);

const client = await pool.connect();
try {
  await client.query('BEGIN');

  // 1. Admin
  const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await client.query(
      `INSERT INTO users (username, password_hash, name, role, is_active) VALUES ($1, $2, $3, 'admin', TRUE)
       ON CONFLICT (username) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = 'admin', is_active = TRUE`,
      [ADMIN_USERNAME, hash, ADMIN_NAME || 'Admin']
    );
    console.log(`Akun admin "${ADMIN_USERNAME}" siap.`);
  } else {
    console.log('ADMIN_USERNAME/ADMIN_PASSWORD kosong, akun admin dilewati.');
  }

  // 2. Produk (unik per nama)
  const products = new Map();
  for (const r of rows) {
    if (!products.has(r.Product_Name)) {
      products.set(r.Product_Name, {
        category: r.Category,
        price: Math.round(Number(r.Unit_Price)),
        cost: Math.round(Number(r.Unit_Cost)),
      });
    }
  }
  const names = [...products.keys()];
  await client.query(
    `INSERT INTO products (name, category, unit_price, unit_cost)
     SELECT * FROM unnest($1::text[], $2::text[], $3::int[], $4::int[])
     ON CONFLICT (name) WHERE deleted_at IS NULL DO NOTHING`,
    [
      names,
      names.map((n) => products.get(n).category),
      names.map((n) => products.get(n).price),
      names.map((n) => products.get(n).cost),
    ]
  );
  // Kalau ada nama yang sama, produk yang belum dihapus dipakai (urutan terakhir menimpa).
  const { rows: productRows } = await client.query('SELECT id, name FROM products ORDER BY (deleted_at IS NULL), id');
  const productId = new Map(productRows.map((p) => [p.name, p.id]));
  console.log(`${names.length} produk siap.`);

  // 3. Transaksi
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await client.query(
      `INSERT INTO transactions
         (transaction_code, order_code, date, product_id, units_sold, unit_price, unit_cost, revenue, payment_method)
       SELECT c, c, d, p, u, up, uc, r, pm
       FROM unnest($1::text[], $2::date[], $3::int[], $4::int[], $5::int[], $6::int[], $7::int[], $8::text[])
         AS x(c, d, p, u, up, uc, r, pm)
       ON CONFLICT (transaction_code) DO NOTHING`,
      [
        chunk.map((r) => r.Transaction_ID),
        chunk.map((r) => r.Date),
        chunk.map((r) => productId.get(r.Product_Name)),
        chunk.map((r) => parseInt(r.Units_Sold, 10)),
        chunk.map((r) => Math.round(Number(r.Unit_Price))),
        chunk.map((r) => Math.round(Number(r.Unit_Cost))),
        chunk.map((r) => Math.round(Number(r.Revenue))),
        chunk.map((r) => r.Payment_Method),
      ]
    );
    inserted += res.rowCount;
  }

  await client.query('COMMIT');
  console.log(`${inserted} transaksi baru dimasukkan (${rows.length - inserted} sudah ada).`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Seed gagal, tidak ada data yang berubah:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
