import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { useIsDesktop } from '../lib/useMedia';
import { Avatar, Badge, ErrorState, Icon, Loading, Modal, PageHeader, PanelForm, Spinner, Toggle } from '../components/ui';

const EMPTY = { name: '', username: '', password: '', role: 'kasir', is_active: true };
const PERAN = [
  { value: 'kasir', label: 'Kasir', desc: 'Catat penjualan dan lihat riwayat hari ini. Tidak melihat modal dan laba.' },
  { value: 'admin', label: 'Admin', desc: 'Semua fitur: beranda, menu & harga, semua riwayat, batalkan penjualan, dan pengguna.' },
];

export default function Pengguna() {
  const { user: me } = useAuth();
  const desktop = useIsDesktop();
  const users = useFetch(() => api.get('/users').then((r) => r.data.data));
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const open = (u) => { setError(''); setForm(u ? { ...u, password: '' } : { ...EMPTY }); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const sendiri = form?.id === me.id;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { name, username, password, role, is_active } = form;
      const res = form.id
        ? await api.put(`/users/${form.id}`, { name, username, password, role, is_active })
        : await api.post('/users', { name, username, password, role });
      toast.success(res.data.message);
      setForm(null);
      users.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const tutupForm = () => !saving && setForm(null);
  const judulForm = form?.id ? 'Ubah pengguna' : 'Tambah pengguna';
  const namaDepan = form?.name?.trim().split(' ')[0];

  const isiForm = form && (
    <form onSubmit={submit} className="space-y-3.5">
      <div>
        <label className="label" htmlFor="uname">Nama</label>
        <input id="uname" className="input" value={form.name} onChange={set('name')} maxLength={100} required />
      </div>
      <div>
        <label className="label" htmlFor="uuser">Nama pengguna</label>
        <input id="uuser" className="input" value={form.username} onChange={set('username')} autoCapitalize="none" autoComplete="off" required />
        <p className="mt-1.5 text-xs text-saus-2">Dipakai untuk masuk. Huruf kecil, tanpa spasi.</p>
      </div>
      <div>
        <label className="label" htmlFor="upass">{form.id ? 'Kata sandi baru' : 'Kata sandi sementara'}</label>
        <input id="upass" type="text" className="input" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={form.id && !form.password ? undefined : 8} required={!form.id} />
        <p className="mt-1.5 text-xs text-saus-2">
          {form.id ? 'Kosongkan kalau tidak diganti. Minimal 8 karakter.' : `Minimal 8 karakter. Berikan langsung ke ${namaDepan || 'pemilik akun'}.`}
        </p>
      </div>
      <fieldset disabled={sendiri}>
        <legend className="label">Peran</legend>
        <div className="space-y-2.5">
          {PERAN.map((p) => {
            const on = form.role === p.value;
            return (
              <label key={p.value} className={`flex cursor-pointer gap-3 rounded-[18px] p-4 ${on ? 'border-2 border-saus bg-panko-muda' : 'border-[1.5px] border-garis bg-nasi'} ${sendiri ? 'cursor-not-allowed opacity-70' : ''}`}>
                <input type="radio" name="role" className="mt-0.5 h-5 w-5 shrink-0 accent-saus" value={p.value} checked={on} onChange={set('role')} />
                <span>
                  <span className="block font-bold">{p.label}</span>
                  <span className="block text-[13px] leading-5 text-saus-2">{p.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {form.id && !sendiri && (
        <Toggle id="uactive" checked={form.is_active} onChange={set('is_active')} label="Akun aktif" hint="Bisa masuk ke aplikasi" />
      )}
      {sendiri && <p className="text-xs text-saus-2">Peran dan status akun yang sedang kamu pakai tidak bisa diubah dari sini.</p>}
      {error && <p className="rounded-[14px] bg-ume-muda px-3.5 py-3 text-sm font-semibold text-ume" role="alert">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" className="btn-ghost" disabled={saving} onClick={() => setForm(null)}>Batal</button>
        <button className="btn-primary flex-1" disabled={saving}>{saving && <Spinner />} {saving ? 'Menyimpan...' : form.id ? 'Simpan perubahan' : 'Simpan pengguna'}</button>
      </div>
    </form>
  );

  return (
    <div className={`grid gap-6 ${form && desktop ? 'lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-5' : ''}`}>
      <div className="min-w-0">
        <PageHeader title="Pengguna" subtitle="Satu akun untuk satu orang. Akun dibuat oleh admin. Kasir lupa kata sandi? Tekan ubah, lalu isi kata sandi baru.">
          <button className="btn-primary" onClick={() => open(null)}><Icon name="plus" /> <span>Tambah<span className="max-sm:hidden"> pengguna</span></span></button>
        </PageHeader>

        {users.loading && !users.data ? (
          <Loading />
        ) : users.error ? (
          <ErrorState message={users.error} onRetry={users.reload} />
        ) : (
          <div className="card px-3 py-1.5 sm:px-4">
            <ul className="divide-y divide-garis">
              {users.data.map((u) => (
                <li key={u.id} className={`flex items-center gap-3 rounded-xl px-2 py-3 sm:gap-4 ${form?.id === u.id ? 'bg-panko-muda' : ''}`}>
                  <span className={u.is_active ? '' : 'opacity-50'}><Avatar name={u.name} admin={u.role === 'admin'} className="h-11 w-11 text-base" /></span>
                  <span className={`min-w-0 flex-1 ${u.is_active ? '' : 'opacity-50'}`}>
                    <span className="block font-semibold leading-snug">{u.name}{u.id === me.id && ' (kamu)'}</span>
                    <span className="block text-[13px] text-saus-3">
                      {u.username}<span className="sm:hidden">, {u.role === 'admin' ? 'admin' : 'kasir'}{u.is_active ? '' : ', nonaktif'}</span>
                    </span>
                  </span>
                  <span className="hidden w-24 sm:block"><Badge tone={u.role === 'admin' ? 'panko' : 'daun'}>{u.role === 'admin' ? 'Admin' : 'Kasir'}</Badge></span>
                  <span className="hidden w-24 sm:block"><Badge tone={u.is_active ? 'daun' : 'netral'}>{u.is_active ? 'Aktif' : 'Nonaktif'}</Badge></span>
                  <button className="btn-ikon" onClick={() => open(u)} aria-label={`Ubah ${u.name}`}><Icon name="edit" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {form && desktop && <PanelForm title={judulForm} onClose={tutupForm}>{isiForm}</PanelForm>}
      {form && !desktop && <Modal title={judulForm} onClose={tutupForm}>{isiForm}</Modal>}
    </div>
  );
}
