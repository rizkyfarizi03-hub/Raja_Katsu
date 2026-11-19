import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Avatar, Icon, Modal } from './ui';
import { AsistenProvider, TombolAsisten } from './Asisten';

// Menu per peran. "pendek" dipakai di menu bawah HP; "lainnya" hanya muncul di halaman Lainnya (HP).
export const MENU = {
  admin: [
    { to: '/', label: 'Beranda', pendek: 'Beranda', icon: 'grid' },
    { to: '/penjualan', label: 'Catat Penjualan', pendek: 'Jual', icon: 'cart' },
    { to: '/riwayat', label: 'Riwayat', pendek: 'Riwayat', icon: 'history' },
    { to: '/menu', label: 'Menu & Harga', pendek: 'Menu', icon: 'box' },
    { to: '/pengguna', label: 'Pengguna', icon: 'user', lainnya: true },
  ],
  kasir: [
    { to: '/penjualan', label: 'Catat Penjualan', pendek: 'Jual', icon: 'cart' },
    { to: '/riwayat', label: 'Riwayat Hari Ini', pendek: 'Riwayat', icon: 'history' },
  ],
};

const PERAN = { admin: 'Admin', kasir: 'Kasir' };

export function Logo({ small }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo-raja-katsu.svg" alt="" className={small ? 'h-8 w-8' : 'h-9 w-9'} />
      <span className={`font-display font-black text-nasi ${small ? 'text-lg' : 'text-xl'}`}>Raja Katsu</span>
    </span>
  );
}

export function KonfirmasiKeluar({ onClose }) {
  const { logout } = useAuth();
  return (
    <Modal title="Keluar dari aplikasi?" onClose={onClose}>
      <p className="text-[15px] text-saus-2">Kamu perlu masuk lagi dengan nama pengguna dan kata sandi untuk mencatat penjualan.</p>
      <div className="mt-5 flex gap-2">
        <button className="btn-ghost flex-1" onClick={onClose}>Batal</button>
        <button className="btn-ume flex-1" onClick={logout}><Icon name="logout" size={18} /> Ya, keluar</button>
      </div>
    </Modal>
  );
}

// Isi menu akun: nama, Bantuan, Keluar. Dipakai di dropdown (laptop) dan lembar bawah (HP).
function IsiAkun({ user, onKeluar, onPilih }) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl bg-kubis p-3">
        <Avatar name={user.name} admin={false} className="h-10 w-10 text-base" />
        <span className="min-w-0">
          <span className="block truncate font-bold">{user.name}</span>
          <span className="block text-[13px] text-saus-3">{PERAN[user.role]} · {user.username}</span>
        </span>
      </div>
      <Link to="/bantuan" onClick={onPilih} className="mt-1 flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold hover:bg-kubis">
        <Icon name="info" /> <span className="flex-1">Bantuan</span> <Icon name="chevR" size={18} className="text-saus-3" />
      </Link>
      <button onClick={onKeluar} className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold text-ume hover:bg-ume-muda">
        <Icon name="logout" /> Keluar
      </button>
    </>
  );
}

function TombolAkun({ user, onKeluar }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!buka) return;
    const tutup = (e) => { if (!ref.current?.contains(e.target)) setBuka(false); };
    const esc = (e) => e.key === 'Escape' && setBuka(false);
    document.addEventListener('mousedown', tutup);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', tutup); document.removeEventListener('keydown', esc); };
  }, [buka]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex cursor-pointer items-center gap-2.5 rounded-full bg-saus-terang py-1.5 pl-1.5 pr-3.5 text-left hover:bg-saus-terang/80"
        onClick={() => setBuka(!buka)}
        aria-expanded={buka}
        aria-haspopup="menu"
      >
        <Avatar name={user.name} />
        <span>
          <span className="block text-sm font-semibold leading-tight text-nasi">{user.name.split(' ')[0]}</span>
          <span className="block text-xs font-medium leading-tight text-garis">{PERAN[user.role]}</span>
        </span>
        <Icon name="chevD" size={18} className="text-garis" />
      </button>
      {buka && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-3xl bg-nasi p-2 shadow-[0_12px_32px_rgb(43_26_18/0.18)]" role="menu">
          <IsiAkun user={user} onPilih={() => setBuka(false)} onKeluar={() => { setBuka(false); onKeluar(); }} />
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [keluar, setKeluar] = useState(false);
  const [lembar, setLembar] = useState(false); // lembar akun di HP
  const menu = MENU[user.role] || MENU.kasir;
  const atas = menu; // di laptop semua menu muat di bilah atas
  const bawah = [...menu.filter((m) => !m.lainnya), { to: '/lainnya', pendek: 'Lainnya', icon: 'user' }];

  useEffect(() => { setLembar(false); }, [pathname]);
  // Halaman yang dibuka dari Lainnya tetap menandai Lainnya di menu bawah
  const aktifBawah = (m, isActive) => isActive || (m.to === '/lainnya' && ['/pengguna', '/bantuan'].includes(pathname));

  return (
    <AsistenProvider>
    <div className="min-h-screen">
      {/* Bilah atas (laptop) */}
      <header className="sticky top-0 z-30 hidden h-[100px] items-center gap-8 bg-saus px-10 lg:flex">
        <Link to={user.role === 'admin' ? '/' : '/penjualan'} aria-label="Raja Katsu, ke halaman awal"><Logo /></Link>
        <nav className="flex h-full items-stretch gap-1" aria-label="Menu utama">
          {atas.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/'}
              className={({ isActive }) =>
                `group flex flex-col justify-center border-b-4 px-3.5 pt-1 text-[15px] ${
                  isActive ? 'border-panko font-bold text-nasi' : 'border-transparent font-medium text-garis hover:text-nasi'
                }`
              }
            >
              {({ isActive }) => (
                <span className="flex items-center gap-2">
                  <Icon name={m.icon} className={isActive ? 'text-panko' : ''} /> {m.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <TombolAkun user={user} onKeluar={() => setKeluar(true)} />
      </header>

      {/* Bilah atas (HP) */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-saus px-4 lg:hidden">
        <Logo small />
        <div className="flex items-center gap-4">
          <TombolAsisten ikonSaja />
          <button className="cursor-pointer rounded-full ring-4 ring-saus-terang" onClick={() => setLembar(true)} aria-label="Akun">
            <Avatar name={user.name} className="h-9 w-9 text-[15px]" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pb-32 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <Outlet />
      </main>

      {/* Menu bawah (HP) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-garis bg-nasi px-2 pb-3 pt-2 lg:hidden" aria-label="Menu utama">
        {bawah.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.to === '/'}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs ${aktifBawah(m, isActive) ? 'font-bold text-saus' : 'font-medium text-saus-2'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-8 w-13 items-center justify-center rounded-full ${aktifBawah(m, isActive) ? 'bg-panko' : ''}`}>
                  <Icon name={m.icon} size={22} />
                </span>
                {m.pendek}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Lembar akun (HP) */}
      {lembar && (
        <div className="fixed inset-0 z-50 flex items-end bg-saus/45 lg:hidden" onClick={() => setLembar(false)}>
          <div className="w-full rounded-t-[28px] bg-nasi px-4 pb-6 pt-3" role="dialog" aria-modal="true" aria-label="Akun" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-garis" />
            <IsiAkun user={user} onPilih={() => setLembar(false)} onKeluar={() => { setLembar(false); setKeluar(true); }} />
          </div>
        </div>
      )}

      {keluar && <KonfirmasiKeluar onClose={() => setKeluar(false)} />}
    </div>
    </AsistenProvider>
  );
}
