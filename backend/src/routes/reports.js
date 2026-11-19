import { Router } from 'express';
import { query } from '../db.js';
import { wrap } from '../middleware/error.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rangeQuery, topQuery, trendQuery } from '../validators/schemas.js';
import { buildFilter } from './transactions.js';
import { jakartaNow } from './orders.js';

const router = Router();

const FROM = 'FROM transactions t JOIN products p ON p.id = t.product_id';
const SUMS = `
  COALESCE(SUM(t.revenue), 0)                               AS revenue,
  COALESCE(SUM(t.units_sold * t.unit_cost), 0)              AS cost,
  COALESCE(SUM(t.revenue - t.units_sold * t.unit_cost), 0)  AS profit,
  COALESCE(SUM(t.units_sold), 0)                            AS units_sold,
  COUNT(*)                                                  AS transactions,
  COUNT(DISTINCT t.order_code)                              AS orders`;

// Rekap hari ini per cara bayar, untuk tutup kasir. Boleh dibuka kasir, tanpa modal dan laba.
router.get('/recap-today', wrap(async (req, res) => {
  const { date } = await jakartaNow();
  const { rows } = await query(
    `SELECT t.payment_method, SUM(t.revenue) AS revenue, COUNT(DISTINCT t.order_code) AS orders
     FROM transactions t WHERE t.date = $1 AND t.voided_at IS NULL GROUP BY 1`, [date]
  );
  const by = new Map(rows.map((r) => [r.payment_method, r]));
  const by_payment = ['Cash', 'QRIS', 'Transfer'].map((m) => by.get(m) || { payment_method: m, revenue: 0, orders: 0 });
  res.json({
    status: 'success',
    data: {
      date,
      revenue: by_payment.reduce((s, r) => s + r.revenue, 0),
      orders: by_payment.reduce((s, r) => s + r.orders, 0),
      by_payment,
    },
  });
}));

// Semua laporan di bawah ini memuat modal dan laba, jadi khusus admin.
router.use(requireRole('admin'));

// Ringkasan: pendapatan, modal, laba kotor, jumlah terjual, jumlah baris, jumlah pesanan
router.get('/summary', validate(rangeQuery, 'query'), wrap(async (req, res) => {
  const { where, params } = buildFilter(req.validQuery);
  const { rows: [s] } = await query(`SELECT ${SUMS} ${FROM} ${where}`, params);
  s.margin_percent = s.revenue ? Math.round((s.profit / s.revenue) * 1000) / 10 : 0;
  res.json({ status: 'success', data: s });
}));

// Tren per hari atau per bulan (?group=day|month)
router.get('/trend', validate(trendQuery, 'query'), wrap(async (req, res) => {
  const { group, ...filter } = req.validQuery;
  const { where, params } = buildFilter(filter);
  const period = group === 'month' ? `to_char(t.date, 'YYYY-MM')` : `to_char(t.date, 'YYYY-MM-DD')`;
  const { rows } = await query(`SELECT ${period} AS period, ${SUMS} ${FROM} ${where} GROUP BY 1 ORDER BY 1`, params);
  res.json({ status: 'success', data: rows });
}));

router.get('/by-category', validate(rangeQuery, 'query'), wrap(async (req, res) => {
  const { where, params } = buildFilter(req.validQuery);
  const { rows } = await query(`SELECT p.category, ${SUMS} ${FROM} ${where} GROUP BY 1 ORDER BY revenue DESC`, params);
  res.json({ status: 'success', data: rows });
}));

router.get('/by-payment', validate(rangeQuery, 'query'), wrap(async (req, res) => {
  const { where, params } = buildFilter(req.validQuery);
  const { rows } = await query(`SELECT t.payment_method, ${SUMS} ${FROM} ${where} GROUP BY 1 ORDER BY revenue DESC`, params);
  res.json({ status: 'success', data: rows });
}));

router.get('/top-products', validate(topQuery, 'query'), wrap(async (req, res) => {
  const { limit, ...filter } = req.validQuery;
  const { where, params } = buildFilter(filter);
  const { rows } = await query(
    `SELECT p.id AS product_id, p.name AS product_name, p.category,
       (SELECT extract(epoch FROM ph.updated_at)::bigint FROM product_photos ph WHERE ph.product_id = p.id) AS photo_version,
       ${SUMS} ${FROM} ${where}
     GROUP BY p.id ORDER BY units_sold DESC, revenue DESC LIMIT $${params.length + 1}`,
    [...params, limit]
  );
  res.json({ status: 'success', data: rows });
}));

export default router;
