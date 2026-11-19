import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { photoUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { addDays, angka, bulanTahun, CARA_BAYAR, eachDay, hariTanggal, isoDate, jam, monthRange, namaHari, rupiah, sapaan, singkat, tanggal, tanggalPendek } from '../lib/format';
import { Badge, bukaPilihan, Empty, ErrorState, FotoMenu, Icon, Loading, Segmented } from '../components/ui';
import RincianPesanan from '../components/RincianPesanan';
import { TombolAsisten } from '../components/Asisten';

const MODE = [
  { value: 'hari', label: 'Hari' },
  { value: 'minggu', label: 'Minggu' },
  { value: 'bulan', label: 'Bulan' },
];

// Warna tiap cara bayar, dipakai di batang dan titik keterangan
const WARNA_BAYAR = { Cash: 'bg-saus', QRIS: 'bg-panko', Transfer: 'bg-daun' };

function Grafik({ data, sorot, judul }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const rapat = data.length > 10;
  return (
    <div className="card p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="text-[17px] font-bold">{judul}</h2>
        <p className="text-sm font-medium text-saus-2">Total {rupiah(total)}</p>
      </div>
      <div className={`flex h-48 items-end sm:h-[200px] ${rapat ? 'gap-1' : 'gap-2 sm:gap-3'}`} role="img" aria-label={`${judul}, total ${rupiah(total)}`}>
        {data.map((d) => {
          const aktif = d.date === sorot;
          return (
            <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5" title={`${tanggal(d.date)}: ${rupiah(d.revenue)}`}>
              {/* Area batang: label angka menempel di atas batang */}
              <div className="flex w-full flex-1 flex-col items-center justify-end gap-1.5">
                {!rapat && (
                  <span className={`text-[11px] sm:text-xs ${aktif ? 'font-bold text-saus' : 'font-medium text-saus-2'}`}>
                    {d.revenue ? singkat(d.revenue) : 'Kosong'}
                  </span>
                )}
                <div
                  className={`w-full ${d.revenue ? 'rounded-[10px]' : 'rounded-full'} ${aktif && d.revenue ? 'bg-saus' : d.revenue ? 'bg-panko' : 'bg-garis'}`}
                  style={{ height: d.revenue ? `max(6px, calc(${(d.revenue / max) * 100}% - 22px))` : 4 }}
                />
              </div>
              <span className={`truncate text-[11px] sm:text-[13px] ${aktif ? 'font-bold' : 'font-medium text-saus-2'}`}>
                {rapat ? Number(d.date.slice(8)) : d.date === isoDate() ? 'Hari ini' : namaHari(d.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarisLaba({ label, children }) {
  return (
    <p className="flex items-center justify-between gap-3 py-2 text-[15px]">
      <span>{label}</span>
      <span className="font-display text-lg font-bold">{children}</span>
    </p>
  );
}

export default function Beranda() {
  const { user } = useAuth();
  const today = isoDate();
  const [mode, setMode] = useState('hari');
  const [date, setDate] = useState(today);
  const [rincian, setRincian] = useState(null);

  const range = mode === 'hari' ? { from: date, to: date } : mode === 'minggu' ? { from: addDays(date, -6), to: date } : monthRange(date);
  const grafikRange = mode === 'bulan' ? range : { from: addDays(date, -6), to: date };

  const dash = useFetch(async () => {
    const get = (url, params) => api.get(url, { params }).then((r) => r.data);
    const [summary, payments, top, trend, orders] = await Promise.all([
      get('/reports/summary', range),
      get('/reports/by-payment', range),
      get('/reports/top-products', { ...range, limit: 4 }),
      get('/reports/trend', { ...grafikRange, group: 'day' }),
      get('/orders', { ...range, limit: 5 }),
    ]);
    const byDay = new Map(trend.data.map((t) => [t.period, t.revenue]));
    const byPay = new Map(payments.data.map((p) => [p.payment_method, p]));
    return {
      summary: summary.data,
      payments: Object.keys(CARA_BAYAR).map((m) => byPay.get(m) || { payment_method: m, revenue: 0, orders: 0 }),
      top: top.data,
      grafik: eachDay(grafikRange.from, grafikRange.to).map((d) => ({ date: d, revenue: byDay.get(d) || 0 })),
      orders: orders.data,
    };
  }, [mode, date]);

  const periode =
    mode === 'hari' ? (date === today ? 'hari ini' : tanggal(date)) : mode === 'minggu' ? '7 hari terakhir' : bulanTahun(date);
  const d = dash.data;

  const pilihTanggal = (
    <div className="chip relative gap-2 px-3.5 focus-within:border-saus">
      <Icon name="calendar" size={18} />
      <span>{tanggalPendek(date)}<span className="hidden sm:inline"> {date.slice(0, 4)}</span></span>
      <Icon name="chevD" size={16} className="hidden text-saus-2 sm:block" />
      <input
        type="date"
        onClick={bukaPilihan}
        className="absolute inset-0 cursor-pointer opacity-0"
        value={date}
        max={today}
        onChange={(e) => e.target.value && setDate(e.target.value)}
        aria-label="Pilih tanggal"
      />
    </div>
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:mb-6">
        <div>
          <h1 className="judul text-[28px] leading-tight sm:text-[34px]">{sapaan()}, {user.name.split(' ')[0]}</h1>
          <p className="mt-0.5 text-sm text-saus-2 sm:text-[15px]">{hariTanggal(today)}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Segmented options={MODE} value={mode} onChange={setMode} />
          {pilihTanggal}
          <TombolAsisten className="ml-1 hidden sm:inline-flex" />
          <Link to="/penjualan" className="btn-primary hidden sm:inline-flex">
            <Icon name="cart" /> Catat penjualan
          </Link>
        </div>
      </div>

      {dash.loading && !d ? (
        <Loading text="Menghitung ringkasan..." />
      ) : dash.error ? (
        <ErrorState message={dash.error} onRetry={dash.reload} />
      ) : (
        <div className={`space-y-4 sm:space-y-5 ${dash.loading ? 'opacity-60' : ''}`}>
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
            {/* Uang masuk dan pembagiannya per cara bayar */}
            <div className="card p-5 sm:p-8">
              <p className="text-[15px] text-saus-2">Uang masuk {periode}</p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:mt-6">
                <p className="font-display text-[44px] font-black leading-none sm:text-[64px]">{rupiah(d.summary.revenue)}</p>
                <p className="text-sm text-saus-2 sm:text-[15px]">dari {angka(d.summary.orders)} penjualan, {angka(d.summary.units_sold)} porsi</p>
              </div>
              {d.summary.revenue > 0 && (
                <>
                  <div className="mt-5 flex h-3.5 gap-1.5 sm:mt-7" role="img" aria-label="Pembagian uang masuk per cara bayar">
                    {d.payments.filter((p) => p.revenue > 0).map((p) => (
                      <span key={p.payment_method} className={`rounded-full ${WARNA_BAYAR[p.payment_method]}`} style={{ flexGrow: p.revenue }} />
                    ))}
                  </div>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-4">
                    {d.payments.map((p) => (
                      <li key={p.payment_method} className="flex items-center justify-between gap-3 sm:block">
                        <span className="flex items-center gap-2 text-sm">
                          <span className={`h-2.5 w-2.5 rounded-full ${WARNA_BAYAR[p.payment_method]}`} /> {CARA_BAYAR[p.payment_method]}
                        </span>
                        <span className="sm:mt-1.5 sm:block">
                          <span className="font-display text-lg font-bold sm:text-[22px]">{rupiah(p.revenue)}</span>
                          <span className="hidden text-[13px] text-saus-3 sm:block">{angka(p.orders)} penjualan</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Hitungan laba kotor */}
            <div className="card p-5 sm:p-7">
              <h2 className="mb-2 text-[15px] text-saus-2">Hitungan laba {periode}</h2>
              <BarisLaba label="Uang masuk">{rupiah(d.summary.revenue)}</BarisLaba>
              <BarisLaba label="Modal menu terjual">− {rupiah(d.summary.cost)}</BarisLaba>
              <div className="my-2 border-t-2 border-saus" />
              <p className="flex flex-wrap items-center justify-between gap-x-3 py-2">
                <span className="text-[17px] font-bold text-daun">Laba kotor</span>
                <span className="font-display text-[36px] font-black leading-none text-daun sm:text-[40px]">{rupiah(d.summary.profit)}</span>
              </p>
              <p className="mt-2 text-[13px] text-saus-2">Belum dikurangi gaji, listrik, gas, dan sewa.</p>
            </div>
          </div>

          <Link to="/penjualan" className="btn-primary w-full sm:hidden">
            <Icon name="cart" /> Catat penjualan
          </Link>

          {d.summary.orders === 0 ? (
            <div className="card">
              <Empty title={`Belum ada penjualan ${periode}`}>
                Pilih tanggal lain di atas, atau tekan Catat penjualan untuk mulai mencatat.
              </Empty>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
                <Grafik data={d.grafik} sorot={date} judul={mode === 'bulan' ? `Uang masuk ${bulanTahun(date)}` : 'Uang masuk 7 hari terakhir'} />
                <div className="card p-5 sm:p-7">
                  <h2 className="mb-4 text-[17px] font-bold">Menu terlaris {periode}</h2>
                  <ol className="space-y-3.5">
                    {d.top.map((m) => (
                      <li key={m.product_id} className="flex items-center gap-3">
                        <FotoMenu name={m.product_name} src={photoUrl(m.product_id, m.photo_version)} className="h-11 w-11 shrink-0 rounded-xl text-sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold leading-snug">{m.product_name}</span>
                          <span className="block text-[13px] text-saus-3">{angka(m.units_sold)} porsi</span>
                        </span>
                        <span className="font-bold">{rupiah(m.revenue)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="card px-5 py-5 sm:px-7">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-[17px] font-bold">Penjualan terakhir</h2>
                  <Link to="/riwayat" className="tautan flex min-h-11 items-center">
                    Lihat semua<span className="hidden sm:inline">&nbsp;riwayat</span>
                  </Link>
                </div>
                <ul className="divide-y divide-garis border-t border-garis">
                  {d.orders.map((o) => (
                    <li key={o.order_code}>
                      <button
                        className="grid min-h-[60px] w-full cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-0.5 py-3 text-left hover:bg-kubis/60 sm:grid-cols-[72px_minmax(0,1fr)_140px_90px_auto_auto] sm:gap-x-4"
                        onClick={() => setRincian(o.order_code)}
                      >
                        <span className="font-bold">{o.time ? jam(o.time) : tanggal(o.date).slice(0, 6)}</span>
                        <span className="order-last col-span-3 truncate text-sm sm:order-none sm:col-span-1 sm:text-[15px]">{o.summary}</span>
                        <span className="hidden truncate text-sm text-saus-2 sm:block">Dicatat {o.created_by_name || 'data awal'}</span>
                        <span className="hidden sm:block"><Badge tone="daun">{CARA_BAYAR[o.payment_method]}</Badge></span>
                        <span className="text-right font-bold">{rupiah(o.total)}</span>
                        <Icon name="chevR" size={18} className="text-saus-2" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {rincian && <RincianPesanan code={rincian} onClose={() => setRincian(null)} onDeleted={dash.reload} />}
    </>
  );
}
