import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Loading } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Beranda from './pages/Beranda';
import Penjualan from './pages/Penjualan';
import Riwayat from './pages/Riwayat';
import Produk from './pages/Produk';
import Pengguna from './pages/Pengguna';
import Bantuan from './pages/Bantuan';
import Lainnya from './pages/Lainnya';

function Protected({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <Loading text="Memeriksa sesi..." />;
  return user ? children : <Navigate to="/login" replace />;
}

// Halaman khusus admin. Kasir yang membukanya diarahkan ke Catat Penjualan.
function Admin({ children }) {
  const { user } = useAuth();
  return user.role === 'admin' ? children : <Navigate to="/penjualan" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Admin><Beranda /></Admin>} />
        <Route path="penjualan" element={<Penjualan />} />
        <Route path="riwayat" element={<Riwayat />} />
        <Route path="menu" element={<Admin><Produk /></Admin>} />
        <Route path="pengguna" element={<Admin><Pengguna /></Admin>} />
        <Route path="bantuan" element={<Bantuan />} />
        <Route path="lainnya" element={<Lainnya />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
