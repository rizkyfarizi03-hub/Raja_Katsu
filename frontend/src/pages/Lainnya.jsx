import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { KonfirmasiKeluar, MENU } from '../components/Layout';
import { Avatar, Icon, PageHeader } from '../components/ui';

// Halaman menu tambahan untuk HP: tautan yang tidak muat di menu bawah.
export default function Lainnya() {
  const { user } = useAuth();
  const [keluar, setKeluar] = useState(false);
  const links = [...(MENU[user.role] || MENU.kasir).filter((m) => m.lainnya), { to: '/bantuan', label: 'Bantuan', icon: 'info' }];

  return (
    <>
      <PageHeader title="Lainnya" />
      <div className="card mb-3 flex items-center gap-3 p-4">
        <Avatar name={user.name} className="h-12 w-12 text-lg" />
        <span>
          <span className="block font-bold">{user.name}</span>
          <span className="block text-sm text-saus-3">{user.role === 'admin' ? 'Admin' : 'Kasir'} · {user.username}</span>
        </span>
      </div>
      <ul className="card divide-y divide-garis overflow-hidden px-2">
        {links.map((m) => (
          <li key={m.to}>
            <Link to={m.to} className="flex min-h-14 items-center gap-3 px-3 text-[15px] font-semibold">
              <Icon name={m.icon} size={22} /> <span className="flex-1">{m.label}</span> <Icon name="chevR" size={18} className="text-saus-3" />
            </Link>
          </li>
        ))}
        <li>
          <button className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 text-left text-[15px] font-semibold text-ume" onClick={() => setKeluar(true)}>
            <Icon name="logout" size={22} /> Keluar
          </button>
        </li>
      </ul>
      {keluar && <KonfirmasiKeluar onClose={() => setKeluar(false)} />}
    </>
  );
}
