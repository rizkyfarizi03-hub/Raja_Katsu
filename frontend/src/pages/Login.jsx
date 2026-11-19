import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';
import { Logo } from '../components/Layout';
import { Icon, Spinner } from '../components/ui';

// Hiasan slip pesanan di panel kiri (laptop). Angkanya contoh, bukan data.
function SlipHiasan() {
  return (
    <div className="slip-bayang w-[300px] rotate-[-4deg]" aria-hidden="true">
      <div className="slip px-5 py-5 text-saus">
        <p className="text-sm font-bold">Pesanan, 12.40</p>
        <div className="mt-2 space-y-1.5 text-[13px]">
          <p className="flex justify-between"><span>Katsu ×2</span><span className="font-semibold">Rp30.000</span></p>
          <p className="flex justify-between"><span>Es teh ×1</span><span className="font-semibold">Rp5.000</span></p>
        </div>
        <div className="sobek my-3" />
        <p className="flex items-baseline justify-between text-[13px]">
          Total <span className="font-display text-2xl font-black">Rp35.000</span>
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lihat, setLihat] = useState(false); // tampilkan kata sandi

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username.trim().toLowerCase(), form.password);
      toast.success('Berhasil masuk');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="flex min-h-screen flex-col bg-saus lg:flex-row lg:bg-kubis">
      <aside className="flex flex-col gap-5 bg-saus px-6 pb-8 pt-6 lg:w-[43%] lg:justify-between lg:px-16 lg:py-14">
        <Logo />
        <div>
          <p className="font-display text-[26px] font-black leading-tight text-nasi lg:text-[44px]">
            Setiap pesanan tercatat, setiap rupiah terhitung.
          </p>
          <p className="mt-4 hidden max-w-md text-[15px] leading-relaxed text-garis lg:block">
            Catat penjualan di kasir, lalu lihat uang masuk dan laba kotor tanpa rekap manual.
          </p>
        </div>
        <div className="hidden lg:block"><SlipHiasan /></div>
      </aside>

      <main className="flex flex-1 items-start justify-center rounded-t-[28px] bg-kubis px-3 pt-3 lg:items-center lg:rounded-none lg:px-4 lg:py-10">
        <form onSubmit={submit} className="card w-full max-w-[460px] p-5 sm:p-10">
          <h1 className="judul text-[32px]">Masuk</h1>
          <p className="mb-5 mt-1 text-[15px] text-saus-2">Gunakan akun yang diberikan admin.</p>

          <label className="label" htmlFor="username">Nama pengguna</label>
          <input
            id="username"
            className={`input mb-4 ${error ? 'border-ume' : ''}`}
            value={form.username}
            onChange={set('username')}
            autoComplete="username"
            autoCapitalize="none"
            required
          />

          <label className="label" htmlFor="password">Kata sandi</label>
          <div className="relative">
            <input
              id="password"
              type={lihat ? 'text' : 'password'}
              className={`input pr-12 ${error ? 'border-ume' : ''}`}
              value={form.password}
              onChange={set('password')}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-saus-3 hover:bg-kubis hover:text-saus"
              onClick={() => setLihat(!lihat)}
              aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              aria-pressed={lihat}
            >
              <Icon name={lihat ? 'eyeOff' : 'eye'} />
            </button>
          </div>

          {error && (
            <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-ume-muda px-3.5 py-3 text-sm font-semibold text-ume" role="alert">
              <Icon name="alert" size={18} className="mt-px" /> {error}
            </p>
          )}

          <button className="btn-primary mt-5 w-full" disabled={loading}>
            {loading && <Spinner />} {loading ? 'Memproses...' : 'Masuk'}
          </button>
          <p className="mt-4 text-[13px] text-saus-2">Lupa kata sandi? Hubungi admin untuk dibuatkan yang baru.</p>
        </form>
      </main>
    </div>
  );
}
