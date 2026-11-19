import { useState } from 'react';
import toast from 'react-hot-toast';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errorMessage } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { angka, daysAgo, isoDate, rupiah, tanggal, tanggalPendek } from '../lib/format';
import { Empty, ErrorState, Loading, PageHeader, Spinner } from '../components/ui';

const PRESETS = [
  { key: 'today', label: 'Hari ini', range: () => ({ from: isoDate(), to: isoDate() }) },
  { key: '7', label: '7 hari', range: () => ({ from: daysAgo(6), to: isoDate() }) },
  { key: '30', label: '30 hari', range: () => ({ from: daysAgo(29), to: isoDate() }) },
  { key: '90', label: '90 hari', range: () => ({ from: daysAgo(89), to: isoDate() }) },
  { key: 'all', label: 'Semua', range: () => ({ from: '', to: '' }) },
];

const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const singkat = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : n >= 1e3 ? `${Math.round(n / 1e3)} rb` : n);

function Stat({ label, value, hint, accent }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold sm:text-2xl ${accent || ''}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

// barKey menentukan nilai yang dipakai untuk panjang batang dan angka di kanan.
function Breakdown({ title, rows, nameKey, barKey = 'revenue' }) {
  const max = Math.max(...rows.map((r) => r[barKey]), 1);
  const byUnits = barKey === 'units_sold';
  return (
    <div className="card p-4">
      <h2 className="mb-3 font-bold">{title}</h2>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r[nameKey]}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate font-medium">{r[nameKey]}</span>
              <span className="shrink-0 font-semibold">{byUnits ? `${angka(r.units_sold)} terjual` : rupiah(r.revenue)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-stone-100">
              <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(r[barKey] / max) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-xs text-stone-500">
              {byUnits ? rupiah(r.revenue) : `${angka(r.units_sold)} terjual`} · laba kotor {rupiah(r.profit)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Laporan() {
  const [preset, setPreset] = useState('90');
  const [range, setRange] = useState(PRESETS[3].range());
  const [exporting, setExporting] = useState(false);

  const params = Object.fromEntries(Object.entries(range).filter(([, v]) => v));
  const group = range.from && range.to && daysBetween(range.from, range.to) <= 92 ? 'day' : 'month';

  const report = useFetch(async () => {
    const get = (url, extra) => api.get(url, { params: { ...params, ...extra } }).then((r) => r.data.data);
    const [summary, trend, categories, payments, top] = await Promise.all([
      get('/reports/summary'),
      get('/reports/trend', { group }),
      get('/reports/by-category'),
      get('/reports/by-payment'),
      get('/reports/top-products', { limit: 5 }),
    ]);
    return { summary, trend, categories, payments, top };
  }, [range.from, range.to]);

  const pick = (p) => { setPreset(p.key); setRange(p.range()); };
  const custom = (k) => (e) => { setPreset('custom'); setRange({ ...range, [k]: e.target.value }); };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/transactions/export', { params, responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaksi_${range.from || 'awal'}_${range.to || 'akhir'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('File CSV diunduh');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const d = report.data;

  return (
    <>
      <PageHeader title="Laporan Keuangan" subtitle={range.from || range.to ? `${tanggal(range.from) || 'Awal'} – ${tanggal(range.to) || 'sekarang'}` : 'Semua data'}>
        <button className="btn-ghost" onClick={exportCsv} disabled={exporting}>
          {exporting && <Spinner />} {exporting ? 'Menyiapkan...' : 'Unduh CSV'}
        </button>
      </PageHeader>

      <div className="card mb-4 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => pick(p)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                preset === p.key ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 bg-white text-stone-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div>
            <label className="label" htmlFor="lfrom">Dari tanggal</label>
            <input id="lfrom" type="date" className="input" value={range.from} onChange={custom('from')} />
          </div>
          <div>
            <label className="label" htmlFor="lto">Sampai tanggal</label>
            <input id="lto" type="date" className="input" value={range.to} onChange={custom('to')} />
          </div>
        </div>
      </div>

      {report.loading && !d ? (
        <Loading text="Menghitung laporan..." />
      ) : report.error ? (
        <ErrorState message={report.error} onRetry={report.reload} />
      ) : d.summary.transactions === 0 ? (
        <div className="card"><Empty title="Belum ada penjualan pada periode ini">Pilih periode lain, atau catat penjualan dulu di menu Penjualan.</Empty></div>
      ) : (
        <div className={`space-y-4 ${report.loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Pendapatan" value={rupiah(d.summary.revenue)} hint={`${angka(d.summary.transactions)} transaksi`} />
            <Stat label="Modal" value={rupiah(d.summary.cost)} hint={`${angka(d.summary.units_sold)} item terjual`} />
            <Stat label="Laba kotor" value={rupiah(d.summary.profit)} hint="Pendapatan dikurangi modal produk" accent="text-emerald-700" />
            <Stat label="Margin laba kotor" value={`${d.summary.margin_percent.toLocaleString('id-ID')}%`} hint="Laba kotor dibagi pendapatan" />
          </div>

          <div className="card p-4">
            <h2 className="mb-3 font-bold">Pendapatan dan laba kotor {group === 'day' ? 'per hari' : 'per bulan'}</h2>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis dataKey="period" tickFormatter={tanggalPendek} tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tickFormatter={singkat} tick={{ fontSize: 11 }} width={48} />
                  <Tooltip formatter={(v, name) => [rupiah(v), name]} labelFormatter={tanggal} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Pendapatan" fill="#fdba74" radius={[3, 3, 0, 0]} />
                  <Line dataKey="profit" name="Laba kotor" stroke="#047857" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-xs text-stone-500">
            Laba kotor = pendapatan dikurangi modal produk. Biaya lain seperti sewa, gaji, listrik, dan gas belum dihitung.
          </p>

          <div className="grid gap-4 lg:grid-cols-3">
            <Breakdown title="Produk terlaris" rows={d.top} nameKey="product_name" barKey="units_sold" />
            <Breakdown title="Per kategori" rows={d.categories} nameKey="category" />
            <Breakdown title="Per metode bayar" rows={d.payments} nameKey="payment_method" />
          </div>
        </div>
      )}
    </>
  );
}
