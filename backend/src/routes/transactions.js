import { Router } from 'express';
import { query } from '../db.js';
import { wrap } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { rangeQuery, transactionQuery } from '../validators/schemas.js';

// Daftar per baris (format dataset) dan ekspor CSV, khusus admin.
// Mencatat, melihat, dan menghapus pesanan ada di routes/orders.js.
const router = Router();

const SELECT = `
  SELECT t.id, t.transaction_code, t.date, t.product_id, p.name AS product_name, p.category,
         t.units_sold, t.unit_price, t.unit_cost, t.revenue,
         t.revenue - t.units_sold * t.unit_cost AS profit, t.payment_method
  FROM transactions t JOIN products p ON p.id = t.product_id`;

// Menyusun WHERE dari filter yang dikirim. Dipakai juga oleh routes/reports.js.
// Penjualan yang dibatalkan tidak pernah ikut di daftar ini, di ekspor CSV, maupun di laporan.
export const buildFilter = ({ from, to, product_id, category, payment_method }) => {
  const cond = ['t.voided_at IS NULL'];
  const params = [];
  const add = (sql, value) => { params.push(value); cond.push(sql.replace('?', `$${params.length}`)); };
  if (from) add('t.date >= ?', from);
  if (to) add('t.date <= ?', to);
  if (product_id) add('t.product_id = ?', product_id);
  if (category) add('p.category = ?', category);
  if (payment_method) add('t.payment_method = ?', payment_method);
  return { where: `WHERE ${cond.join(' AND ')}`, params };
};

router.get('/', validate(transactionQuery, 'query'), wrap(async (req, res) => {
  const { page, limit, ...filter } = req.validQuery;
  const { where, params } = buildFilter(filter);
  const [list, count] = await Promise.all([
    query(`${SELECT} ${where} ORDER BY t.date DESC, t.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]),
    query(`SELECT COUNT(*) AS total FROM transactions t JOIN products p ON p.id = t.product_id ${where}`, params),
  ]);
  const total = count.rows[0].total;
  res.json({ status: 'success', data: list.rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } });
}));

// Unduhan CSV dengan kolom yang sama persis dengan dataset tim DS/AE.
router.get('/export', validate(rangeQuery, 'query'), wrap(async (req, res) => {
  const { where, params } = buildFilter(req.validQuery);
  const { rows } = await query(`${SELECT} ${where} ORDER BY t.date, t.transaction_code`, params);
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const lines = ['Transaction_ID,Date,Product_Name,Category,Units_Sold,Unit_Price,Revenue,Payment_Method,Unit_Cost'];
  for (const r of rows) {
    lines.push([r.transaction_code, r.date, esc(r.product_name), esc(r.category), r.units_sold,
      r.unit_price.toFixed(1), r.revenue.toFixed(1), r.payment_method, r.unit_cost.toFixed(1)].join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="transaksi.csv"');
  res.send(lines.join('\n') + '\n');
}));

export default router;
