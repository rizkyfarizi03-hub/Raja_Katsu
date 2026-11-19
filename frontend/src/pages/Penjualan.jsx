import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage, photoUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { useIsDesktop } from '../lib/useMedia';
import { CARA_BAYAR, hariTanggal, isoDate, jam, rupiah } from '../lib/format';
import { Badge, bukaPilihan, CapTersimpan, Empty, ErrorState, FotoMenu, Icon, Loading, Spinner, Stepper } from '../components/ui';
import RincianPesanan from '../components/RincianPesanan';

const BAYAR = ['Cash', 'QRIS', 'Transfer'];
const LANGKAH = ['Pilih menu', 'Cek pesanan', 'Simpan'];

function Langkah({ aktif }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {LANGKAH.map((l, k) => {
        const n = k + 1;
        const lewat = n <= aktif;
        return (
          <li key={l} className="flex items-center gap-2" aria-current={n === aktif ? 'step' : undefined}>
            <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[13px] font-bold ${lewat ? 'bg-saus text-panko' : 'border-[1.5px] border-garis bg-nasi text-saus-3'}`}>
              {n}
            </span>
            <span className={`text-sm ${n === aktif ? 'font-bold text-saus' : 'font-medium text-saus-2'}`}>{l}</span>
          </li>
        );
      })}
    </ol>
  );
}

function TileMenu({ p, qty, onQty }) {
  return (
    <div className={`relative flex flex-col gap-2.5 rounded-[18px] bg-nasi px-2.5 pb-3 pt-2.5 ${qty ? 'border-[2.5px] border-saus' : 'border-[1.5px] border-garis'}`}>
      {qty > 0 && (
        <span className="angka absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-nasi bg-panko text-base font-black" aria-hidden="true">
          {qty}
        </span>
      )}
      <FotoMenu name={p.name} src={photoUrl(p.id, p.photo_version)} className="h-[110px] w-full rounded-xl text-3xl sm:h-[124px]" />
      <div className="flex-1">
        <p className="text-base font-semibold leading-snug">{p.name}</p>
        <p className="angka text-[17px] text-saus-2">{rupiah(p.unit_price)}</p>
      </div>
      {qty === 0 ? (
        <button className="flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] bg-panko-muda text-[15px] font-bold hover:bg-panko" onClick={() => onQty(1)}>
          <Icon name="plus" size={18} /> Tambah
        </button>
      ) : (
        <Stepper qty={qty} onChange={onQty} name={p.name} full />
      )}
    </div>
  );
}

// Kertas slip pesanan dengan tepi bergerigi
// Di laptop tinggi slip dibatasi setinggi layar: isinya bisa digulir di dalam slip,
// sedangkan bagian kaki (total dan tombol Simpan) selalu terlihat.
function Slip({ children, footer, className = '' }) {
  return (
    <div className={`slip-bayang ${className}`}>
      <div className="slip flex flex-col lg:max-h-[calc(100dvh-172px)]">
        <div className={`flex min-h-0 flex-col gap-4 px-5 pt-6 sm:px-6 lg:overflow-y-auto ${footer ? 'pb-1' : 'pb-7'}`}>{children}</div>
        {footer && <div className="flex shrink-0 flex-col gap-4 px-5 pb-7 pt-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

function BarisRingkas({ label, children }) {
  return (
    <p className="flex items-center justify-between gap-3 text-[15px]">
      <span className="text-saus-2">{label}</span>
      <span className="font-bold">{children}</span>
    </p>
  );
}

export default function Penjualan() {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const desktop = useIsDesktop();
  const products = useFetch(() => api.get('/products').then((r) => r.data.data));

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [cart, setCart] = useState({}); // { [product_id]: jumlah }
  const [method, setMethod] = useState('Cash');
  const [cash, setCash] = useState(''); // uang diterima, hanya angka
  const [date, setDate] = useState(isoDate());
  const [time, setTime] = useState('');
  const [step, setStep] = useState('pilih'); // di HP: 'pilih' atau 'cek'
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [done, setDone] = useState(null); // penjualan yang baru tersimpan
  const [rincian, setRincian] = useState(false);

  const list = products.data || [];
  const categories = useMemo(() => {
    const count = {};
    list.forEach((p) => { count[p.category] = (count[p.category] || 0) + 1; });
    return [['Semua', list.length], ...Object.entries(count)];
  }, [list]);
  const shown = list.filter(
    (p) => (category === 'Semua' || p.category === category) && p.name.toLowerCase().includes(search.toLowerCase())
  );

  const items = list.filter((p) => cart[p.id] > 0).map((p) => ({ ...p, qty: cart[p.id] }));
  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  const tunai = method === 'Cash';
  const diterima = cash === '' ? null : Number(cash);
  const kurang = tunai && diterima != null && diterima < total;
  const kembalian = tunai && diterima != null && diterima >= total ? diterima - total : null;
  const pecahan = [...new Set([total, ...[5000, 10000, 20000, 50000, 100000].map((b) => Math.ceil(total / b) * b)])]
    .filter((v) => v >= total && v > 0)
    .slice(0, 4);

  // Menyentuh menu setelah penjualan tersimpan berarti memulai pesanan baru.
  const setQty = (id, qty) => {
    if (done) setDone(null);
    setSaveError('');
    setCart((c) => {
      const next = { ...c };
      if (!qty || qty < 1) delete next[id];
      else next[id] = Math.min(qty, 10000);
      return next;
    });
  };

  const reset = () => {
    setCart({});
    setCash('');
    setMethod('Cash');
    setDate(isoDate());
    setTime('');
    setStep('pilih');
    setSaveError('');
    setDone(null);
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const body = {
        payment_method: method,
        items: items.map((i) => ({ product_id: i.id, units_sold: i.qty })),
        cash_received: tunai ? diterima : null,
      };
      if (admin) {
        body.date = date;
        if (time) body.time = time;
      }
      const res = await api.post('/orders', body);
      setDone(res.data.data);
      setCart({});
      setCash('');
      toast.success('Penjualan tersimpan');
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (products.loading) return <Loading text="Memuat daftar menu..." />;
  if (products.error) return <ErrorState message={products.error} onRetry={products.reload} />;

  const langkah = done ? 3 : (desktop ? items.length > 0 : step === 'cek') ? 2 : 1;
  const tampilDaftar = desktop || (step === 'pilih' && !done);
  const tampilPanel = desktop || step === 'cek' || done;

  // Kaki slip: total dan tombol Simpan, selalu terlihat di laptop
  const kakiSlip = (
    <>
      <div className="sobek" />

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base font-semibold text-saus-2">Total bayar</span>
        <span className="font-display text-[34px] font-black leading-none sm:text-[40px]">{rupiah(total)}</span>
      </div>

      {saveError && (
        <p className="flex items-start gap-2 rounded-[14px] bg-ume-muda px-3.5 py-3 text-sm font-semibold text-ume" role="alert">
          <Icon name="alert" size={18} className="mt-px" />
          <span>Penjualan belum tersimpan. {saveError} Pesanan tidak hilang, tekan Simpan lagi.</span>
        </p>
      )}

      <button className="btn-primary w-full text-base" disabled={!items.length || kurang || saving} onClick={save}>
        {saving ? <Spinner /> : <Icon name="checkCircle" />} {saving ? 'Menyimpan...' : 'Simpan penjualan'}
      </button>
      {items.length > 0 && !saving && (
        <button className="-my-1 mx-auto min-h-10 cursor-pointer text-sm font-semibold text-saus-2 hover:text-ume" onClick={() => { setCart({}); setCash(''); setSaveError(''); setStep('pilih'); }}>
          Kosongkan pesanan
        </button>
      )}
    </>
  );

  const kepala = (
    <div className="mb-5">
      {tampilDaftar && <h1 className="judul text-[28px] leading-tight sm:text-[34px]">Catat penjualan</h1>}
      <div className={tampilDaftar ? 'mt-2.5' : ''}><Langkah aktif={langkah} /></div>
    </div>
  );

  return (
    <>
      {!desktop && step === 'cek' && !done && (
        <button className="mb-2 flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-bold" onClick={() => setStep('pilih')}>
          <Icon name="chevL" size={18} /> Tambah menu lain
        </button>
      )}
      {/* Di HP judul berada di atas; di laptop judul masuk ke kolom kiri supaya slip sejajar dengan judul */}
      {!desktop && kepala}

      <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_404px]">
        {/* Langkah 1: daftar menu */}
        {tampilDaftar && (
          <section className="min-w-0">
            {desktop && kepala}
            <label className="mb-4 flex min-h-[52px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-garis bg-nasi px-4 focus-within:border-2 focus-within:border-saus">
              <Icon name="search" className="text-saus-2" />
              <span className="sr-only">Cari menu</span>
              <input className="w-full bg-transparent text-base outline-none placeholder:text-saus-3" placeholder={desktop ? 'Cari menu, misalnya "keju"' : 'Cari menu'} value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>

            <div className="gulir-x mb-4 flex gap-2 overflow-x-auto">
              {categories.map(([c, n]) => (
                <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? 'chip-aktif' : ''}`} aria-pressed={category === c}>
                  {c} <span className={`text-[13px] font-medium ${category === c ? 'text-panko' : 'text-saus-3'}`}>{n}</span>
                </button>
              ))}
            </div>

            {list.length === 0 ? (
              <div className="card">
                <Empty title="Belum ada menu">
                  {admin ? 'Tambahkan menu dulu di halaman Menu & Harga, baru penjualan bisa dicatat.' : 'Minta admin menambahkan menu dulu.'}
                </Empty>
              </div>
            ) : shown.length === 0 ? (
              <div className="card"><Empty title="Menu tidak ditemukan">Coba kata lain, atau pilih kategori Semua.</Empty></div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                {shown.map((p) => (
                  <TileMenu key={p.id} p={p} qty={cart[p.id] || 0} onQty={(q) => setQty(p.id, q)} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Langkah 2 dan 3: slip pesanan. Di laptop menempel di kanan saat halaman digulir. */}
        {tampilPanel && (
          <aside className="h-fit lg:sticky lg:top-[124px] lg:-mt-1">
            {done ? (
              <Slip>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl font-black">Pesanan</h2>
                    <p className="mt-1 text-[13px] text-saus-3">{hariTanggal(done.date)}</p>
                    <p className="text-[13px] text-saus-3">
                      {done.time ? `${jam(done.time)}, ` : ''}dicatat oleh {done.created_by_name || user.name}
                    </p>
                  </div>
                  <CapTersimpan jam={done.time ? jam(done.time) : null} />
                </div>
                <div className="sobek" />
                <ul className="space-y-3">
                  {done.items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-base font-semibold">{i.product_name}</span>
                        <span className="block text-[13px] text-saus-3">{i.units_sold} × {rupiah(i.unit_price)}</span>
                      </span>
                      <span className="font-bold">{rupiah(i.revenue)}</span>
                    </li>
                  ))}
                </ul>
                <div className="sobek" />
                <div className="space-y-2">
                  <BarisRingkas label="Total bayar">{rupiah(done.total)}</BarisRingkas>
                  <BarisRingkas label={done.cash_received != null ? `${CARA_BAYAR[done.payment_method]}, uang diterima` : 'Cara bayar'}>
                    {done.cash_received != null ? rupiah(done.cash_received) : CARA_BAYAR[done.payment_method]}
                  </BarisRingkas>
                </div>
                {done.change != null && (
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[18px] bg-daun-muda px-4 py-4">
                    <span className="text-sm font-semibold text-daun">{done.change > 0 ? 'Kembalian untuk pembeli' : 'Uang pas, tidak ada kembalian'}</span>
                    {done.change > 0 && <span className="font-display text-[32px] font-black leading-none text-daun">{rupiah(done.change)}</span>}
                  </div>
                )}
                <button className="btn-primary w-full" onClick={reset}>
                  <Icon name="plus" /> Pesanan baru
                </button>
                <button className="tautan mx-auto -mt-1 min-h-10" onClick={() => setRincian(true)}>Lihat rincian penjualan ini</button>
              </Slip>
            ) : (
              <Slip footer={kakiSlip}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl font-black">Pesanan</h2>
                    {!admin && <p className="mt-0.5 text-[13px] text-saus-3">{hariTanggal(isoDate())}, jam tercatat otomatis</p>}
                  </div>
                  <Badge tone="panko">{totalQty} porsi</Badge>
                </div>

                {admin && (
                  <div className="rounded-[14px] bg-kubis p-3">
                    <p className="text-[13px] text-saus-2">Waktu penjualan (jam boleh dikosongkan)</p>
                    <div className="mt-1.5 flex gap-2">
                      <input type="date" onClick={bukaPilihan} className="cursor-pointer min-h-11 w-full min-w-0 rounded-xl border-[1.5px] border-garis bg-nasi px-2.5 text-sm font-semibold" value={date} max={isoDate()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Tanggal penjualan" />
                      <input type="time" onClick={bukaPilihan} className="cursor-pointer min-h-11 w-28 shrink-0 rounded-xl border-[1.5px] border-garis bg-nasi px-2.5 text-sm font-semibold" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Jam penjualan" />
                    </div>
                  </div>
                )}

                <div className="sobek" />

                {items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-saus-2">Belum ada menu dipilih.<br />Tekan Tambah pada menu yang dibeli.</p>
                ) : (
                  <ul className="-my-2.5">
                    {items.map((i) => (
                      <li key={i.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold leading-snug">{i.name}</p>
                          <p className="angka text-[15px] text-saus-2">{rupiah(i.qty * i.unit_price)}</p>
                        </div>
                        <Stepper qty={i.qty} onChange={(q) => setQty(i.id, q)} name={i.name} editable />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="sobek" />

                <div>
                  <p className="label">Cara bayar</p>
                  <div className="grid grid-cols-3 gap-2">
                    {BAYAR.map((b) => (
                      <button
                        key={b}
                        onClick={() => setMethod(b)}
                        aria-pressed={method === b}
                        className={`min-h-12 cursor-pointer rounded-[14px] text-[15px] font-bold ${
                          method === b ? 'bg-saus text-nasi' : 'border-[1.5px] border-garis bg-nasi hover:bg-kubis'
                        }`}
                      >
                        {CARA_BAYAR[b]}
                      </button>
                    ))}
                  </div>
                </div>

                {tunai && items.length > 0 && (
                  <div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="label" htmlFor="diterima">Uang diterima</label>
                        <input
                          id="diterima"
                          className="input"
                          inputMode="numeric"
                          placeholder="Rp0"
                          value={cash === '' ? '' : rupiah(cash)}
                          onChange={(e) => setCash(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        />
                      </div>
                      <div>
                        <p className="label">Kembalian</p>
                        <p
                          className={`flex min-h-12 items-center rounded-[14px] px-3.5 font-display ${kurang ? 'bg-ume-muda text-[15px] font-bold text-ume' : 'bg-daun-muda text-lg font-black text-daun'}`}
                          aria-live="polite"
                        >
                          {kurang ? `Kurang ${rupiah(total - diterima)}` : kembalian != null ? rupiah(kembalian) : '–'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {pecahan.map((v) => (
                        <button key={v} className="min-h-9 cursor-pointer rounded-full bg-kubis px-3 text-[13px] font-semibold hover:bg-garis" onClick={() => setCash(String(v))}>
                          {v === total ? 'Uang pas' : rupiah(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </Slip>
            )}
          </aside>
        )}
      </div>

      {/* HP, langkah 1: total selalu terlihat di atas menu bawah */}
      {!desktop && step === 'pilih' && !done && items.length > 0 && <div className="h-20" aria-hidden="true" />}
      {!desktop && step === 'pilih' && !done && items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[84px] z-20 px-3 pb-2">
          <button
            className="flex min-h-16 w-full cursor-pointer items-center justify-between rounded-[18px] bg-panko px-4 text-left shadow-[0_8px_20px_rgb(43_26_18/0.15)]"
            onClick={() => { setStep('cek'); window.scrollTo(0, 0); }}
          >
            <span>
              <span className="block text-xs font-semibold text-saus-2">{totalQty} porsi</span>
              <span className="block font-display text-[22px] font-black leading-7">{rupiah(total)}</span>
            </span>
            <span className="flex items-center gap-1 text-[15px] font-bold">Lihat pesanan <Icon name="chevR" size={18} /></span>
          </button>
        </div>
      )}

      {rincian && done && <RincianPesanan code={done.order_code} onClose={() => setRincian(false)} onDeleted={reset} />}
    </>
  );
}
