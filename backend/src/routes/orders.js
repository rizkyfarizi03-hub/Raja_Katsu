import { Router } from 'express';
import { pool, query } from '../db.js';
import { AppError, wrap } from '../middleware/error.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderCodeParam, orderQuery, orderSchema, voidSchema } from '../validators/schemas.js';

// Pesanan = satu kali penjualan. Isinya bisa beberapa produk, dan tiap produk
// disimpan sebagai satu baris di tabel transactions dengan order_code yang sama.
const router = Router();

const isAdmin = (req) => req.user.role === 'admin';

// Tanggal dan jam sekarang di zona waktu Asia/Jakarta
export const jakartaNow = async (db = { query }) => {
  const { rows } = await db.query(
    `SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS date,
            to_char(now() AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') AS time`
  );
  return rows[0];
};

const LIST = `
  SELECT t.order_code, t.date, to_char(MIN(t.sold_time), 'HH24:MI') AS time, t.payment_method,
         MAX(t.cash_received) AS cash_received,
         SUM(t.units_sold) AS units_sold, SUM(t.revenue) AS total,
         SUM(t.units_sold * t.unit_cost) AS cost,
         SUM(t.revenue - t.units_sold * t.unit_cost) AS profit,
         string_agg(p.name || ' ×' || t.units_sold, ', ' ORDER BY t.id) AS summary,
         MIN(t.created_by) AS created_by, MIN(u.name) AS created_by_name,
         to_char(MAX(t.voided_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') AS voided_at,
         MIN(v.name) AS voided_by_name, MAX(t.void_reason) AS void_reason
  FROM transactions t
  JOIN products p ON p.id = t.product_id
  LEFT JOIN users u ON u.id = t.created_by
  LEFT JOIN users v ON v.id = t.voided_by`;

// Kasir tidak boleh melihat modal dan laba.
const forRole = (req, order) => {
  if (!isAdmin(req)) {
    delete order.cost;
    delete order.profit;
    order.items?.forEach((i) => { delete i.unit_cost; delete i.profit; });
  }
  if (order.payment_method === 'Cash' && order.cash_received != null) order.change = order.cash_received - order.total;
  return order;
};

const getOrder = async (code) => {
  const head = await query(`${LIST} WHERE t.order_code = $1 GROUP BY t.order_code, t.date, t.payment_method`, [code]);
  if (!head.rows[0]) return null;
  const items = await query(
    `SELECT t.id, t.transaction_code, t.product_id, p.name AS product_name, p.category, t.units_sold,
            t.unit_price, t.unit_cost, t.revenue, t.revenue - t.units_sold * t.unit_cost AS profit
     FROM transactions t JOIN products p ON p.id = t.product_id
     WHERE t.order_code = $1 ORDER BY t.id`, [code]
  );
  return { ...head.rows[0], items: items.rows };
};

// Daftar pesanan. Kasir hanya melihat pesanan hari ini yang tidak dibatalkan.
// Admin bisa melihat yang dibatalkan dengan ?status=batal.
router.get('/', validate(orderQuery, 'query'), wrap(async (req, res) => {
  const { page, limit, payment_method } = req.validQuery;
  let { from, to, status } = req.validQuery;
  if (!isAdmin(req)) {
    from = to = (await jakartaNow()).date;
    status = 'aktif';
  }

  const cond = [status === 'batal' ? 't.voided_at IS NOT NULL' : 't.voided_at IS NULL'];
  const params = [];
  const add = (sql, v) => { params.push(v); cond.push(sql.replace('?', `$${params.length}`)); };
  if (from) add('t.date >= ?', from);
  if (to) add('t.date <= ?', to);
  if (payment_method) add('t.payment_method = ?', payment_method);
  const where = `WHERE ${cond.join(' AND ')}`;

  const [list, count] = await Promise.all([
    query(
      `${LIST} ${where} GROUP BY t.order_code, t.date, t.payment_method
       ORDER BY t.date DESC, MIN(t.sold_time) DESC NULLS LAST, t.order_code DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    ),
    query(
      `SELECT COUNT(DISTINCT t.order_code) AS total, COALESCE(SUM(t.revenue), 0) AS revenue,
              COALESCE(SUM(t.units_sold), 0) AS units_sold
       FROM transactions t ${where}`, params
    ),
  ]);
  const { total, revenue, units_sold } = count.rows[0];

  // Jumlah penjualan dan uang masuk per tanggal, untuk judul tiap kelompok tanggal di Riwayat.
  // Dihitung dari semua penjualan pada tanggal itu (sesuai filter), bukan hanya yang ada di halaman ini.
  const dates = [...new Set(list.rows.map((o) => o.date))];
  const perDay = dates.length
    ? await query(
        `SELECT t.date, COUNT(DISTINCT t.order_code) AS orders, COALESCE(SUM(t.revenue), 0) AS revenue
         FROM transactions t ${where} AND t.date = ANY($${params.length + 1}::date[])
         GROUP BY t.date`,
        [...params, dates]
      )
    : { rows: [] };

  res.json({
    status: 'success',
    data: list.rows.map((o) => forRole(req, o)),
    meta: { page, limit, total, total_pages: Math.ceil(total / limit), revenue, units_sold, days: perDay.rows },
  });
}));

router.get('/:code', validate(orderCodeParam, 'params'), wrap(async (req, res) => {
  const order = await getOrder(req.params.code);
  if (!order) throw new AppError(404, 'Penjualan tidak ditemukan.');
  if (!isAdmin(req) && order.date !== (await jakartaNow()).date) {
    throw new AppError(403, 'Kasir hanya bisa melihat penjualan hari ini.');
  }
  res.json({ status: 'success', data: forRole(req, order) });
}));

// Mencatat penjualan baru.
router.post('/', validate(orderSchema), wrap(async (req, res) => {
  const { payment_method, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const now = await jakartaNow(client);

    // Kasir selalu memakai waktu sekarang. Admin boleh mengisi tanggal sebelumnya.
    let date = now.date;
    let time = now.time;
    if (isAdmin(req) && req.body.date) {
      if (req.body.date > now.date) throw new AppError(400, 'Tanggal penjualan tidak boleh melewati hari ini.');
      date = req.body.date;
      time = req.body.time || (date === now.date ? now.time : null);
    }

    const ids = [...new Set(items.map((i) => i.product_id))];
    const { rows: products } = await client.query(
      'SELECT id, unit_price, unit_cost FROM products WHERE id = ANY($1::int[]) AND is_active AND deleted_at IS NULL', [ids]
    );
    if (products.length !== ids.length) {
      throw new AppError(400, 'Ada menu yang sudah dihapus atau tidak aktif. Muat ulang halaman lalu coba lagi.');
    }
    const byId = new Map(products.map((p) => [p.id, p]));
    const total = items.reduce((s, i) => s + i.units_sold * byId.get(i.product_id).unit_price, 0);

    let cash = null;
    if (payment_method === 'Cash' && req.body.cash_received != null) {
      cash = req.body.cash_received;
      if (cash < total) throw new AppError(400, 'Uang diterima kurang dari total bayar.');
    }

    // Nomor urut harian: TRX-YYYYMMDD-NNNN. Lock supaya dua kasir tidak dapat nomor yang sama.
    const prefix = `TRX-${date.replaceAll('-', '')}-`;
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [prefix]);
    const { rows: [{ last }] } = await client.query(
      `SELECT COALESCE(MAX(SUBSTRING(transaction_code FROM 14)::int), 0) AS last
       FROM transactions WHERE transaction_code LIKE $1`, [`${prefix}%`]
    );

    const orderCode = `${prefix}${String(last + 1).padStart(4, '0')}`;
    let seq = last;
    for (const item of items) {
      const p = byId.get(item.product_id);
      seq += 1;
      await client.query(
        `INSERT INTO transactions
           (transaction_code, order_code, date, sold_time, product_id, units_sold, unit_price, unit_cost,
            revenue, payment_method, cash_received, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [`${prefix}${String(seq).padStart(4, '0')}`, orderCode, date, time, p.id, item.units_sold, p.unit_price,
          p.unit_cost, item.units_sold * p.unit_price, payment_method, cash, req.user.id]
      );
    }
    await client.query('COMMIT');

    const order = await getOrder(orderCode);
    res.status(201).json({ status: 'success', message: 'Penjualan berhasil disimpan.', data: forRole(req, order) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// Membatalkan penjualan yang salah catat, khusus admin dan wajib memakai alasan.
// Penjualan tidak dihapus: barisnya tetap ada sebagai jejak, tapi tidak dihitung di laporan.
router.post('/:code/void', requireRole('admin'), validate(orderCodeParam, 'params'), validate(voidSchema), wrap(async (req, res) => {
  const order = await getOrder(req.params.code);
  if (!order) throw new AppError(404, 'Penjualan tidak ditemukan.');
  if (order.voided_at) throw new AppError(409, 'Penjualan ini sudah dibatalkan sebelumnya.');
  await query(
    'UPDATE transactions SET voided_at = now(), voided_by = $1, void_reason = $2 WHERE order_code = $3',
    [req.user.id, req.body.reason, req.params.code]
  );
  res.json({ status: 'success', message: 'Penjualan dibatalkan.', data: forRole(req, await getOrder(req.params.code)) });
}));

export default router;
