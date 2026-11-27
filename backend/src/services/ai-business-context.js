import { query } from '../db.js';
import { AppError } from '../middleware/error.js';

const METHODS = ['Cash', 'QRIS', 'Transfer'];
const MONTHS = {
  januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4,
  mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8,
  september: 9, sep: 9, oktober: 10, okt: 10, november: 11, nov: 11, desember: 12, des: 12,
};
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DATA_QUESTION = /\b(berapa|omzet|pendapatan|revenue|laba|profit|margin|penjualan|terjual|transaksi|pesanan|porsi|terlaris|paling laku|tren|trend|rekap|bandingkan|meningkat|menurun|minggu|bulan|tahun|kemarin|hari ini)\b/i;
const EXPLICIT_RANGE = /(\d{4}-\d{2}-\d{2})\s+(?:sampai|hingga|s\/d|s\.d\.|to)\s+(\d{4}-\d{2}-\d{2})/i;
const SINGLE_ISO_DATE = /\b(\d{4}-\d{2}-\d{2})\b/;
const SINGLE_LOCAL_DATE = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/;
const SINGLE_NAMED_DATE = /\b(\d{1,2})\s+(januari|jan|februari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|agu|agt|september|sep|oktober|okt|november|nov|desember|des)\s+(\d{4})\b/i;

const shiftDate = (date, days) => {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const requestedDate = (question) => {
  const iso = question.match(SINGLE_ISO_DATE);
  if (iso) return { date: iso[1] };

  const local = question.match(SINGLE_LOCAL_DATE);
  if (local) {
    const [, day, month, year] = local;
    return { date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` };
  }

  const named = question.match(SINGLE_NAMED_DATE);
  if (named) {
    const [, day, month, year] = named;
    const monthNumber = MONTHS[month.toLocaleLowerCase('id-ID')];
    return { date: `${year}-${String(monthNumber).padStart(2, '0')}-${day.padStart(2, '0')}` };
  }
  return null;
};

const getPeriod = (question, today) => {
  const explicit = question.match(EXPLICIT_RANGE);
  if (explicit) {
    const [, from, to] = explicit;
    if (!isValidDate(from) || !isValidDate(to) || from > to || to > today) {
      throw new AppError(400, 'Rentang tanggal harus valid dan tidak boleh melewati hari ini.');
    }
    return { label: `${from} sampai ${to}`, from, to };
  }

  const explicitDate = requestedDate(question);
  if (explicitDate) {
    const { date } = explicitDate;
    if (!isValidDate(date) || date > today) {
      throw new AppError(400, 'Tanggal harus valid dan tidak boleh melewati hari ini.');
    }
    const [, year, month, day] = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const label = `${Number(day)} ${MONTH_NAMES[Number(month) - 1]} ${year}`;
    return { label, from: date, to: date };
  }

  const text = question.toLocaleLowerCase('id-ID');
  if (/\b(kemarin|yesterday)\b/.test(text)) {
    const date = shiftDate(today, -1);
    return { label: 'kemarin', from: date, to: date };
  }
  if (/\b(bulan lalu|last month)\b/.test(text)) {
    const currentMonth = `${today.slice(0, 7)}-01`;
    const to = shiftDate(currentMonth, -1);
    const from = `${to.slice(0, 7)}-01`;
    return { label: 'bulan lalu', from, to };
  }
  if (/\b(bulan ini|this month|month to date)\b/.test(text)) {
    return { label: 'bulan ini sampai hari ini', from: `${today.slice(0, 7)}-01`, to: today };
  }
  if (/\b(tahun ini|this year|year to date)\b/.test(text)) {
    return { label: 'tahun ini sampai hari ini', from: `${today.slice(0, 4)}-01-01`, to: today };
  }
  if (/\b(hari ini|today)\b/.test(text)) return { label: 'hari ini', from: today, to: today };

  // Mengikuti pilihan "Minggu" di dashboard: tujuh hari terakhir termasuk hari ini.
  const from = shiftDate(today, -6);
  return { label: '7 hari terakhir', from, to: today };
};

const number = (value) => Number(value || 0);

export const buildAiBusinessContext = async (question) => {
  if (!DATA_QUESTION.test(question)) return null;

  const { rows: [clock] } = await query(
    "SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text AS today"
  );
  const period = getPeriod(question, clock.today);
  const filter = 'WHERE t.voided_at IS NULL AND t.date >= $1 AND t.date <= $2';
  const params = [period.from, period.to];

  const [summaryResult, paymentResult, productResult] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(t.revenue), 0) AS revenue,
              COALESCE(SUM(t.units_sold * t.unit_cost), 0) AS cost,
              COALESCE(SUM(t.revenue - t.units_sold * t.unit_cost), 0) AS gross_profit,
              COALESCE(SUM(t.units_sold), 0) AS units_sold,
              COUNT(*) AS transaction_lines,
              COUNT(DISTINCT t.order_code) AS orders
       FROM transactions t ${filter}`,
      params
    ),
    query(
      `SELECT t.payment_method, COALESCE(SUM(t.revenue), 0) AS revenue,
              COUNT(DISTINCT t.order_code) AS orders
       FROM transactions t ${filter}
       GROUP BY t.payment_method`,
      params
    ),
    query(
      `SELECT p.name AS product_name, p.category,
              COALESCE(SUM(t.units_sold), 0) AS units_sold,
              COALESCE(SUM(t.revenue), 0) AS revenue,
              COALESCE(SUM(t.units_sold * t.unit_cost), 0) AS cost,
              COALESCE(SUM(t.revenue - t.units_sold * t.unit_cost), 0) AS gross_profit,
              COUNT(*) AS transaction_lines,
              COUNT(DISTINCT t.order_code) AS orders
       FROM transactions t JOIN products p ON p.id = t.product_id
       ${filter}
       GROUP BY p.id, p.name, p.category
       ORDER BY units_sold DESC, revenue DESC
       LIMIT 5`,
      params
    ),
  ]);

  const totals = summaryResult.rows[0];
  const revenue = number(totals.revenue);
  const cost = number(totals.cost);
  const orders = number(totals.orders);
  const byMethod = new Map(paymentResult.rows.map((row) => [row.payment_method, row]));

  return {
    data_status: 'available',
    has_sales: orders > 0,
    period: { ...period, timezone: 'Asia/Jakarta' },
    summary: {
      revenue,
      cost,
      gross_profit: number(totals.gross_profit),
      units_sold: number(totals.units_sold),
      transaction_lines: number(totals.transaction_lines),
      orders,
      margin_percent: revenue ? Math.round((number(totals.gross_profit) / revenue) * 1000) / 10 : 0,
    },
    top_products: productResult.rows.map((row) => ({
      product_name: row.product_name,
      category: row.category,
      units_sold: number(row.units_sold),
      revenue: number(row.revenue),
      cost: number(row.cost),
      gross_profit: number(row.gross_profit),
      transaction_lines: number(row.transaction_lines),
      orders: number(row.orders),
    })),
    by_payment: METHODS.map((payment_method) => {
      const row = byMethod.get(payment_method);
      return { payment_method, revenue: number(row?.revenue), orders: number(row?.orders) };
    }),
    sources: [
      'GET /api/v1/reports/summary',
      'GET /api/v1/reports/top-products',
      'GET /api/v1/reports/by-payment',
    ],
  };
};
