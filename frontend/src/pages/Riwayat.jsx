import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { angka, CARA_BAYAR, hariTanggal, isoDate, jam, rupiah } from '../lib/format';
import { Badge, bukaPilihan, Empty, ErrorState, Icon, InfoBanner, Loading, PageHeader, Segmented, Spinner } from '../components/ui';
import RincianPesanan from '../components/RincianPesanan';

const KET_BAYAR = { Cash: 'Uang yang harus ada di laci', QRIS: 'Masuk ke rekening', Transfer: 'Masuk ke rekening' };

// Rekap hari ini per cara bayar, untuk mencocokkan uang saat tutup kasir.
function TutupKasir({ tick }) {
  const recap = useFetch(() => api.get('/reports/recap-today').then((r) => r.data.data), [tick]);
  if (!recap.data) return null;
  const r = recap.data;
  return (
    <div className="slip-bayang">
      <div className="slip px-5 pb-7 pt-6 sm:px-6">
        <h2 className="font-display text-xl font-black">Tutup kasir</h2>
        <p className="mt-1 text-[13px] text-saus-2">Cocokkan angka ini dengan uang di laci dan mutasi rekening.</p>
        <div className="sobek my-3" />
        <ul className="space-y-3">
          {r.by_payment.map((p) => (
            <li key={p.payment_method} className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-bold">{CARA_BAYAR[p.payment_method]}</span>
                <span className="block text-xs text-saus-2">{KET_BAYAR[p.payment_method]}, {angka(p.orders)} penjualan</span>
              </span>
              <span className="font-display text-lg font-bold">{rupiah(p.revenue)}</span>
            </li>
          ))}
        </ul>
        <div className="my-3 border-t-2 border-saus" />
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-saus-2">Total hari ini</span>
          <span className="font-display text-[28px] font-black leading-none sm:text-[30px]">{rupiah(r.revenue)}</span>
        </p>
      </div>
    </div>
  );
}

function BarisPenjualan({ o, admin, onOpen }) {
  return (
    <li>
      <button
        className={`grid w-full cursor-pointer items-center gap-x-3 gap-y-1 py-3 text-left hover:bg-kubis/60 sm:gap-x-4 ${
          admin
            ? 'grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[64px_minmax(0,1fr)_140px_96px_110px_auto]'
            : 'grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[64px_minmax(0,1fr)_96px_110px_auto]'
        }`}
        onClick={onOpen}
      >
        <span className="font-bold">{jam(o.time) || '–'}</span>
        <span className="col-span-3 row-start-2 min-w-0 text-sm sm:col-span-1 sm:row-start-auto sm:text-[15px]">
          <span className="block truncate">{o.summary}</span>
          {admin && <span className="block text-[13px] text-saus-2 sm:hidden">Dicatat {o.created_by_name || 'data awal'}</span>}
          {o.voided_at && (
            <span className="block truncate text-[13px] text-ume">Dibatalkan{o.voided_by_name ? ` oleh ${o.voided_by_name}` : ''}: {o.void_reason}</span>
          )}
        </span>
        {admin && <span className="hidden truncate text-sm text-saus-2 sm:block">Dicatat {o.created_by_name || 'data awal'}</span>}
        <span className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto"><Badge tone={o.voided_at ? 'ume' : 'daun'}>{CARA_BAYAR[o.payment_method]}</Badge></span>
        <span className={`text-right font-bold ${o.voided_at ? 'text-saus-3 line-through' : ''}`}>{rupiah(o.total)}</span>
        <Icon name="chevR" size={18} className="text-saus-2" />
      </button>
    </li>
  );
}

export default function Riwayat() {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const [filter, setFilter] = useState({ from: '', to: '', payment_method: '' });
  const [status, setStatus] = useState('aktif'); // 'aktif' atau 'batal' (khusus admin)
  const [page, setPage] = useState(1);
  const [rincian, setRincian] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [tick, setTick] = useState(0);

  const params = { page, limit: 20, status, ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) };
  const orders = useFetch(() => api.get('/orders', { params }).then((r) => r.data), [JSON.stringify(params), tick]);

  const set = (k) => (e) => { setFilter({ ...filter, [k]: e.target.value }); setPage(1); };
  const reload = () => setTick((t) => t + 1);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { from, to } = filter;
      const res = await api.get('/transactions/export', { params: { ...(from && { from }), ...(to && { to }) }, responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaksi_${from || 'awal'}_${to || 'akhir'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('File CSV diunduh');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const rows = orders.data?.data || [];
  const meta = orders.data?.meta;
  const perHari = new Map((meta?.days || []).map((d) => [d.date, d]));

  // Kelompokkan baris per tanggal, urutannya mengikuti data dari server
  const kelompok = [];
  rows.forEach((o) => {
    const last = kelompok[kelompok.length - 1];
    if (last && last.date === o.date) last.rows.push(o);
    else kelompok.push({ date: o.date, rows: [o] });
  });

  const kosong = (
    <div className="card">
      <Empty title={status === 'batal' ? 'Tidak ada penjualan yang dibatalkan' : admin ? 'Tidak ada penjualan' : 'Belum ada penjualan hari ini'}>
        {status === 'batal'
          ? 'Penjualan yang dibatalkan admin akan muncul di sini, lengkap dengan alasannya.'
          : admin ? 'Tidak ada penjualan pada pilihan ini. Ubah tanggal atau cara bayar.' : 'Penjualan yang dicatat hari ini akan muncul di sini.'}
      </Empty>
    </div>
  );

  const daftar = orders.loading && !orders.data ? (
    <Loading />
  ) : orders.error ? (
    <ErrorState message={orders.error} onRetry={orders.reload} />
  ) : rows.length === 0 ? (
    kosong
  ) : (
    <div className={`card px-4 pb-2 pt-4 sm:px-7 sm:pt-6 ${orders.loading ? 'opacity-60' : ''}`}>
      {kelompok.map((k) => {
        const ringkas = perHari.get(k.date);
        return (
          <section key={k.date} className="mb-3">
            {admin && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b-[1.5px] border-garis pb-2">
                <h2 className="font-bold">{hariTanggal(k.date)}</h2>
                {ringkas && (
                  <p className="text-[13px] text-saus-2">
                    {angka(ringkas.orders)} penjualan{status === 'batal' ? ' dibatalkan' : ''}, {rupiah(ringkas.revenue)}
                  </p>
                )}
              </div>
            )}
            <ul className="divide-y divide-garis">
              {k.rows.map((o) => <BarisPenjualan key={o.order_code} o={o} admin={admin} onOpen={() => setRincian(o.order_code)} />)}
            </ul>
          </section>
        );
      })}
      {meta.total_pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-garis py-3 text-sm">
          <span className="text-saus-2">Halaman {angka(meta.page)} dari {angka(meta.total_pages)}</span>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</button>
            <button className="btn-ghost" disabled={page >= meta.total_pages} onClick={() => setPage(page + 1)}>Berikutnya</button>
          </div>
        </div>
      )}
    </div>
  );

  // Kasir: daftar hari ini di kiri, slip tutup kasir di kanan (di HP slip di atas)
  if (!admin) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_404px] lg:gap-9">
        <div className="min-w-0">
          <PageHeader title="Riwayat hari ini" subtitle={`${hariTanggal(isoDate())}. Tekan satu baris untuk melihat rinciannya.`} />
          <InfoBanner>Salah catat? Laporkan ke admin dengan menyebut jamnya. Hanya admin yang bisa membatalkan penjualan.</InfoBanner>
          <div className="mb-5 lg:hidden"><TutupKasir tick={tick} /></div>
          {daftar}
        </div>
        <aside className="hidden h-fit lg:sticky lg:top-[124px] lg:block"><TutupKasir tick={tick} /></aside>
        {rincian && <RincianPesanan code={rincian} onClose={() => setRincian(null)} onDeleted={reload} />}
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Riwayat penjualan" subtitle="Semua penjualan yang sudah tercatat. Tekan satu baris untuk melihat rinciannya.">
        <button className="btn-ghost max-sm:h-12 max-sm:w-12 max-sm:px-0" onClick={exportCsv} disabled={exporting} aria-label="Unduh CSV">
          {exporting ? <Spinner /> : <Icon name="upload" size={20} />} <span className="max-sm:hidden">{exporting ? 'Menyiapkan...' : 'Unduh CSV'}</span>
        </button>
      </PageHeader>

      <div className="mb-4">
        <Segmented
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: 'aktif', label: 'Tercatat', count: status === 'aktif' && meta ? angka(meta.total) : undefined },
            { value: 'batal', label: 'Dibatalkan', count: status === 'batal' && meta ? angka(meta.total) : undefined },
          ]}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div>
          <label className="label" htmlFor="from">Dari tanggal</label>
          <input id="from" type="date" className="input cursor-pointer" onClick={bukaPilihan} value={filter.from} max={isoDate()} onChange={set('from')} />
        </div>
        <div>
          <label className="label" htmlFor="to">Sampai tanggal</label>
          <input id="to" type="date" className="input cursor-pointer" onClick={bukaPilihan} value={filter.to} max={isoDate()} onChange={set('to')} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="bayar">Cara bayar</label>
          <select id="bayar" className="input cursor-pointer" value={filter.payment_method} onChange={set('payment_method')}>
            <option value="">Semua cara bayar</option>
            {Object.entries(CARA_BAYAR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {daftar}

      {rincian && <RincianPesanan code={rincian} onClose={() => setRincian(null)} onDeleted={reload} />}
    </>
  );
}
