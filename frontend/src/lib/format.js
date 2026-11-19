export const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
export const angka = (n) => Number(n || 0).toLocaleString('id-ID');

// Tanggal menurut jam perangkat, format YYYY-MM-DD
export const isoDate = (d = new Date()) => {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const toDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Menggeser tanggal 'YYYY-MM-DD' sebanyak n hari
export const addDays = (s, n) => {
  const d = toDate(s);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

export const daysAgo = (n) => addDays(isoDate(), -n);

export const monthRange = (s) => {
  const d = toDate(s);
  return { from: isoDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
};

// Semua tanggal dari from sampai to (termasuk keduanya)
export const eachDay = (from, to) => {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// '2026-10-31' -> '31 Okt 2026', '2026-10' -> 'Okt 2026'
export const tanggal = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return d ? `${Number(d)} ${BULAN[m - 1]} ${y}` : `${BULAN[m - 1]} ${y}`;
};

export const tanggalPendek = (s) => {
  const [y, m, d] = s.split('-');
  return d ? `${Number(d)} ${BULAN[m - 1]}` : `${BULAN[m - 1]} ${y.slice(2)}`;
};

// '2026-11-09' -> 'Senin, 9 November 2026'
export const hariTanggal = (s) => {
  const d = toDate(s);
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN_PANJANG[d.getMonth()]} ${d.getFullYear()}`;
};

export const namaHari = (s) => HARI_PENDEK[toDate(s).getDay()];
export const bulanTahun = (s) => { const d = toDate(s); return `${BULAN_PANJANG[d.getMonth()]} ${d.getFullYear()}`; };

// '09:15' -> '09.15'
export const jam = (t) => (t ? t.slice(0, 5).replace(':', '.') : '');

// 182000 -> '182 rb', 1194000 -> '1,2 jt'
export const singkat = (n) =>
  n >= 1e6 ? `${(n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : n >= 1e3 ? `${Math.round(n / 1e3)} rb` : String(n);

export const sapaan = () => {
  const h = new Date().getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
};

export const CARA_BAYAR = { Cash: 'Tunai', QRIS: 'QRIS', Transfer: 'Transfer' };

