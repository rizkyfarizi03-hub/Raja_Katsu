import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/ui';

const UMUM = [
  {
    judul: 'Mencatat penjualan',
    langkah: [
      'Buka Catat Penjualan, lalu tekan Tambah pada menu yang dibeli. Tekan + untuk menambah jumlahnya.',
      'Cek pesanan. Di HP, tekan Lihat pesanan di bagian bawah.',
      'Pilih cara bayar: Tunai, QRIS, atau Transfer.',
      'Kalau Tunai, isi uang yang diterima. Kembalian dihitung otomatis.',
      'Tekan Simpan penjualan. Muncul cap Tersimpan di slip kalau sudah tersimpan.',
    ],
  },
  {
    judul: 'Membetulkan penjualan yang salah catat',
    langkah: [
      'Penjualan tidak bisa dihapus. Yang salah catat dibatalkan oleh admin.',
      'Kasir: laporkan ke admin penjualan mana yang salah (sebutkan jamnya), lalu catat ulang yang benar.',
      'Admin: buka Riwayat, tekan penjualannya, tekan Batalkan penjualan, lalu isi alasannya.',
      'Penjualan yang dibatalkan tidak dihitung di laporan, tapi tetap bisa dilihat di Riwayat bagian Dibatalkan.',
    ],
  },
];

const KASIR = [
  {
    judul: 'Tutup kasir',
    langkah: [
      'Buka Riwayat Hari Ini.',
      'Lihat slip Tutup kasir. Angka Tunai adalah uang yang seharusnya ada di laci.',
      'Angka QRIS dan Transfer adalah uang yang masuk ke rekening.',
    ],
  },
];

const ADMIN = [
  {
    judul: 'Membaca Beranda',
    langkah: [
      'Pilih Hari, Minggu, atau Bulan, lalu pilih tanggalnya.',
      'Uang masuk adalah total penjualan. Modal menu terjual adalah modal dari porsi yang laku.',
      'Laba kotor adalah uang masuk dikurangi modal menu. Gaji, listrik, gas, dan sewa belum dikurangi.',
      'Garis berwarna di bawah uang masuk menunjukkan berapa yang tunai dan berapa yang masuk rekening.',
    ],
  },
  {
    judul: 'Mengatur menu dan harga',
    langkah: [
      'Buka Menu & Harga, tekan Tambah Menu atau Ubah.',
      'Isi nama, kategori, harga jual, dan modal per porsi.',
      'Menu yang sedang tidak dijual: tekan Ubah, lalu matikan Sedang dijual. Menu yang tidak dijual lagi bisa dihapus.',
      'Mengubah harga atau menghapus menu tidak mengubah penjualan yang sudah tercatat.',
    ],
  },
  {
    judul: 'Mengatur akun kasir',
    langkah: [
      'Buka Pengguna, tekan Tambah Pengguna, lalu pilih peran Kasir.',
      'Beri tahu nama pengguna dan kata sandinya ke kasir.',
      'Kasir lupa kata sandi? Tekan Ubah, lalu isi Kata sandi baru.',
      'Kasir sudah tidak bekerja? Tekan Ubah, lalu matikan Akun aktif.',
    ],
  },
];

export default function Bantuan() {
  const { user } = useAuth();
  const panduan = [...UMUM, ...(user.role === 'admin' ? ADMIN : KASIR)];
  return (
    <>
      <PageHeader title="Bantuan" subtitle="Panduan singkat memakai aplikasi." />
      <div className="grid gap-4 md:grid-cols-2">
        {panduan.map((p) => (
          <section key={p.judul} className="card p-5">
            <h2 className="mb-3 font-display text-lg font-black">{p.judul}</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
              {p.langkah.map((l) => <li key={l}>{l}</li>)}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
