import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage, photoUrl } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { rupiah } from '../lib/format';
import { useIsDesktop } from '../lib/useMedia';
import { Badge, Empty, ErrorState, FotoMenu, Icon, InfoBanner, Loading, Modal, PageHeader, PanelForm, Spinner, Toggle } from '../components/ui';

const EMPTY = { name: '', category: '', unit_price: '', unit_cost: '', is_active: true };

// Memperkecil foto di browser sebelum dikirim: sisi terpanjang 480 px, format JPEG.
const perkecilFoto = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const skala = Math.min(1, 480 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * skala);
      canvas.height = Math.round(img.height * skala);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File itu bukan gambar yang bisa dibaca.')); };
    img.src = url;
  });

export default function Produk() {
  const products = useFetch(() => api.get('/products', { params: { all: true } }).then((r) => r.data.data));
  const desktop = useIsDesktop();
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('Semua');
  const [form, setForm] = useState(null); // null = modal tertutup
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef(null);

  const list = products.data || [];
  const shown = list.filter(
    (p) => (kategori === 'Semua' || p.category === kategori) && `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  );
  const categories = [...new Set(list.map((p) => p.category))];
  const aktif = list.filter((p) => p.is_active).length;

  // form.photo: undefined = foto tidak diubah, null = foto dihapus, data URL = foto baru
  const open = (p) => { setError(''); setForm(p ? { ...p, photo: undefined } : { ...EMPTY }); };

  const pilihFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setForm((f) => ({ ...f, photo: undefined }));
      const data = await perkecilFoto(file);
      setForm((f) => ({ ...f, photo: data }));
    } catch (err) {
      setError(err.message);
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const body = {
      name: form.name,
      category: form.category,
      unit_price: Number(form.unit_price),
      unit_cost: Number(form.unit_cost),
      is_active: form.is_active,
    };
    if (form.photo !== undefined) body.photo = form.photo;
    setSaving(true);
    try {
      if (form.id) await api.put(`/products/${form.id}`, body);
      else await api.post('/products', body);
      toast.success(form.id ? 'Menu diperbarui' : 'Menu ditambahkan');
      setForm(null);
      products.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      toast.success('Menu dihapus');
      setConfirmId(null);
      products.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const laba = form ? Number(form.unit_price || 0) - Number(form.unit_cost || 0) : 0;
  const fotoForm = !form ? null : form.photo === undefined ? photoUrl(form.id, form.photo_version) : form.photo;
  const tutupForm = () => !saving && setForm(null);
  const judulForm = form?.id ? 'Ubah menu' : 'Tambah menu';

  const isiForm = form && (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="flex items-center gap-4">
        <FotoMenu name={form.name || 'Menu'} src={fotoForm} className="h-24 w-24 shrink-0 rounded-[18px] text-2xl" />
        <div className="min-w-0">
          <p className="label">Foto menu</p>
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" className="btn-ghost px-4" onClick={() => fileRef.current.click()}>
              <Icon name="upload" size={18} /> {fotoForm ? 'Ganti foto' : 'Pilih foto'}
            </button>
            {fotoForm && <button type="button" className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-saus-2 hover:text-ume" onClick={() => setForm({ ...form, photo: null })}>Hapus</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pilihFoto} aria-label="Pilih foto menu" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="pname">Nama menu</label>
        <input id="pname" className="input" value={form.name} onChange={set('name')} maxLength={100} required />
      </div>
      <div>
        <label className="label" htmlFor="pcat">Kategori</label>
        <input id="pcat" className="input" list="kategori" value={form.category} onChange={set('category')} maxLength={50} placeholder="Contoh: Katsu, Minuman" required />
        <datalist id="kategori">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pprice">Harga jual</label>
          <input id="pprice" type="number" min="0" step="1" inputMode="numeric" className="input" placeholder="Rp" value={form.unit_price} onChange={set('unit_price')} required />
        </div>
        <div>
          <label className="label" htmlFor="pcost">Modal per porsi</label>
          <input id="pcost" type="number" min="0" step="1" inputMode="numeric" className="input" placeholder="Rp" value={form.unit_cost} onChange={set('unit_cost')} required />
        </div>
      </div>
      <p className={`flex items-center justify-between gap-3 rounded-[14px] px-4 py-3.5 ${laba < 0 ? 'bg-ume-muda text-ume' : 'bg-daun-muda text-daun'}`}>
        <span className="text-sm font-semibold">Laba kotor per porsi</span>
        <span className="font-display text-[22px] font-black">{rupiah(laba)}</span>
      </p>
      {form.id && (
        <Toggle id="pactive" checked={form.is_active} onChange={set('is_active')} label="Sedang dijual" hint="Tampil di Catat Penjualan" />
      )}
      {error && <p className="rounded-[14px] bg-ume-muda px-3.5 py-3 text-sm font-semibold text-ume" role="alert">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" className="btn-ghost" disabled={saving} onClick={() => setForm(null)}>Batal</button>
        <button className="btn-primary flex-1" disabled={saving}>{saving && <Spinner />} {saving ? 'Menyimpan...' : form.id ? 'Simpan perubahan' : 'Simpan menu'}</button>
      </div>
    </form>
  );

  const kategoriChips = [['Semua', list.length], ...categories.map((c) => [c, list.filter((p) => p.category === c).length])];

  return (
    <div className={`grid gap-6 ${form && desktop ? 'lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5' : ''}`}>
      <div className="min-w-0">
        <PageHeader title="Menu & harga" subtitle="Foto, nama, harga jual, dan modal per porsi.">
          <button className="btn-primary" onClick={() => open(null)}><Icon name="plus" /> <span>Tambah<span className="max-sm:hidden"> menu</span></span></button>
        </PageHeader>

        <InfoBanner>Harga baru hanya berlaku untuk penjualan berikutnya. Penjualan lama tetap memakai harga dan modal saat dicatat.</InfoBanner>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="flex min-h-12 min-w-0 flex-1 basis-full items-center gap-2.5 rounded-[14px] border-[1.5px] border-garis bg-nasi px-4 focus-within:border-2 focus-within:border-saus sm:basis-64">
            <Icon name="search" className="text-saus-2" />
            <span className="sr-only">Cari menu atau kategori</span>
            <input className="w-full bg-transparent text-base outline-none placeholder:text-saus-3" placeholder="Cari menu atau kategori" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="gulir-x flex gap-2 overflow-x-auto">
            {kategoriChips.map(([c, n]) => (
              <button key={c} onClick={() => setKategori(c)} className={`chip ${kategori === c ? 'chip-aktif' : ''}`} aria-pressed={kategori === c}>
                {c} <span className={`text-[13px] font-medium ${kategori === c ? 'text-panko' : 'text-saus-3'}`}>{n}</span>
              </button>
            ))}
          </div>
        </div>

        {products.loading && !products.data ? (
          <Loading />
        ) : products.error ? (
          <ErrorState message={products.error} onRetry={products.reload} />
        ) : shown.length === 0 ? (
          <div className="card"><Empty title={list.length ? 'Menu tidak ditemukan' : 'Belum ada menu'}>{list.length ? 'Coba kata lain, atau pilih Semua.' : 'Tekan Tambah menu untuk memasukkan menu pertama.'}</Empty></div>
        ) : (
          <div className="card overflow-hidden px-3 py-2 sm:px-4">
            <div className="hidden border-b-[1.5px] border-garis px-2 py-3 text-[13px] font-medium text-saus-2 md:grid md:grid-cols-[minmax(0,1fr)_96px_96px_96px_110px_100px] md:gap-3">
              <span>Menu</span>
              <span className="text-right">Harga jual</span>
              <span className="text-right">Modal</span>
              <span className="text-right">Laba / porsi</span>
              <span>Status</span>
              <span />
            </div>
            <ul className="divide-y divide-garis">
              {shown.map((p) => (
                <li
                  key={p.id}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-3 md:grid-cols-[minmax(0,1fr)_96px_96px_96px_110px_100px] ${form?.id === p.id ? 'bg-panko-muda' : ''}`}
                >
                  <div className={`flex min-w-0 items-center gap-3 ${p.is_active ? '' : 'opacity-55'}`}>
                    <FotoMenu name={p.name} src={photoUrl(p.id, p.photo_version)} className="h-12 w-12 shrink-0 rounded-xl text-sm" />
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{p.name}</p>
                      <p className="text-[13px] text-saus-3 md:hidden">Jual {rupiah(p.unit_price)}, modal {rupiah(p.unit_cost)}</p>
                      <p className="flex flex-wrap items-center gap-2 md:block">
                        <span className="text-[13px] text-saus-3 max-md:hidden">{p.category}</span>
                        <span className="text-[13px] font-bold text-daun md:hidden">Laba {rupiah(p.unit_price - p.unit_cost)}</span>
                        {!p.is_active && <span className="md:hidden"><Badge>Tidak dijual</Badge></span>}
                      </p>
                    </div>
                  </div>
                  <span className={`hidden text-right font-bold md:block ${p.is_active ? '' : 'opacity-55'}`}>{rupiah(p.unit_price)}</span>
                  <span className={`hidden text-right text-saus-2 md:block ${p.is_active ? '' : 'opacity-55'}`}>{rupiah(p.unit_cost)}</span>
                  <span className={`hidden text-right font-bold text-daun md:block ${p.is_active ? '' : 'opacity-55'}`}>{rupiah(p.unit_price - p.unit_cost)}</span>
                  <span className="hidden md:block"><Badge tone={p.is_active ? 'daun' : 'netral'}>{p.is_active ? 'Dijual' : 'Tidak dijual'}</Badge></span>
                  <span className="flex items-center justify-end gap-1">
                    {confirmId === p.id ? (
                      <>
                        <button className="min-h-11 cursor-pointer px-2 text-sm font-bold text-ume" disabled={deleting} onClick={() => remove(p.id)}>
                          {deleting ? <Spinner /> : 'Hapus'}
                        </button>
                        <button className="min-h-11 cursor-pointer px-1.5 text-sm font-semibold text-saus-2" disabled={deleting} onClick={() => setConfirmId(null)}>Batal</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-ikon" onClick={() => open(p)} aria-label={`Ubah ${p.name}`}><Icon name="edit" /></button>
                        <button className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-saus-2 hover:bg-ume-muda hover:text-ume max-md:hidden" onClick={() => setConfirmId(p.id)} aria-label={`Hapus ${p.name}`}>
                          <Icon name="trash" />
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t-[1.5px] border-garis px-2 py-3 text-xs text-saus-2">
              {aktif} menu dijual, {list.length - aktif} tidak dijual (tidak tampil di Catat Penjualan). Menghapus menu tidak mengubah penjualan yang sudah tercatat.
            </p>
          </div>
        )}
      </div>

      {form && desktop && <PanelForm title={judulForm} onClose={tutupForm}>{isiForm}</PanelForm>}
      {form && !desktop && (
        <Modal title={judulForm} onClose={tutupForm}>
          {isiForm}
          {form.id && (
            <button type="button" className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 text-sm font-semibold text-ume" onClick={() => { setForm(null); setConfirmId(form.id); }}>
              <Icon name="trash" size={18} /> Hapus menu ini
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
