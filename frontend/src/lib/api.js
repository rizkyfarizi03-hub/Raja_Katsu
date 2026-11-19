import axios from 'axios';

const TOKEN_KEY = 'rk_token';

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* abaikan */ }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sesi habis: hapus token dan kembali ke halaman masuk.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && getToken()) {
      setToken(null);
      window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);

// Mengubah error axios jadi kalimat yang bisa ditampilkan ke pengguna.
export const errorMessage = (err) => {
  if (err.response?.data?.errors?.length) return err.response.data.errors.map((e) => e.message).join(' ');
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ECONNABORTED') return 'Server terlalu lama merespons. Coba lagi.';
  if (!err.response) return 'Tidak bisa terhubung ke server. Periksa koneksi internet.';
  return 'Terjadi kesalahan. Coba lagi.';
};

// Alamat foto menu. version berasal dari photo_version; kosong berarti menu belum punya foto.
export const photoUrl = (id, version) => (version ? `${api.defaults.baseURL}/products/${id}/photo?v=${version}` : null);

export default api;
