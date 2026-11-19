import { createContext, useContext, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Icon, Spinner } from './ui';

// Asisten AI untuk admin. Panel kanan di laptop, layar penuh di HP (desain Figma v3, "Asisten AI").
// Pertanyaan dikirim ke backend (/ai/chat); backend yang meneruskan ke layanan AI tim AE.
const AsistenContext = createContext({ buka: () => {}, tersedia: false });
export const useAsisten = () => useContext(AsistenContext);

const SARAN = ['Ringkasan penjualan minggu ini', 'Menu apa yang paling laku?', 'Cara menambah akun kasir'];

function Gelembung({ m }) {
  const saya = m.role === 'user';
  return (
    <div className={`flex ${saya ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-3 text-[15px] leading-[22px] ${
          saya ? 'rounded-[18px] rounded-br-md bg-saus text-nasi' : 'rounded-[18px] rounded-bl-md bg-kubis text-saus'
        }`}
      >
        <p className="whitespace-pre-line">{m.content}</p>
        {m.source && <p className="mt-1.5 text-xs text-saus-3">Sumber: {m.source}</p>}
      </div>
    </div>
  );
}

function PanelAsisten({ onClose }) {
  const [pesan, setPesan] = useState([]);
  const [tersambung, setTersambung] = useState(true);
  const [memuat, setMemuat] = useState(true);
  const [gagalMuat, setGagalMuat] = useState('');
  const [teks, setTeks] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [gagal, setGagal] = useState(null); // { pesan, pertanyaan }
  const bawah = useRef(null);
  const input = useRef(null);

  const muat = async () => {
    setMemuat(true);
    setGagalMuat('');
    try {
      const { data } = await api.get('/ai/chat');
      setPesan(data.data.messages);
      setTersambung(data.data.connected);
    } catch (err) {
      setGagalMuat(errorMessage(err));
    } finally {
      setMemuat(false);
    }
  };

  useEffect(() => {
    muat();
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.current?.focus();
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = overflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bawah.current?.scrollIntoView({ block: 'end' }); }, [pesan, mengirim, gagal]);

  const kirim = async (q) => {
    const pertanyaan = (q ?? teks).trim();
    if (pertanyaan.length < 2 || mengirim) return;
    setGagal(null);
    setMengirim(true);
    setTeks('');
    setPesan((p) => [...p, { id: `sementara-${Date.now()}`, role: 'user', content: pertanyaan }]);
    try {
      const { data } = await api.post('/ai/chat', { question: pertanyaan }, { timeout: 30000 });
      setPesan((p) => [...p.filter((m) => !String(m.id).startsWith('sementara-')), ...data.data.messages]);
      setTersambung(data.data.connected);
    } catch (err) {
      setGagal({ pesan: errorMessage(err), pertanyaan });
    } finally {
      setMengirim(false);
      input.current?.focus();
    }
  };

  const hapus = async () => {
    try {
      await api.delete('/ai/chat');
      setPesan([]);
      setGagal(null);
    } catch (err) {
      setGagal({ pesan: errorMessage(err) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end lg:bg-saus/40" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Asisten Raja Katsu"
        className="flex h-full w-full flex-col bg-nasi lg:w-[460px] lg:shadow-[-8px_0_32px_rgb(43_26_18/0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b-[1.5px] border-garis px-4 py-3.5 lg:px-5">
          <button className="btn-ikon lg:hidden" onClick={onClose} aria-label="Kembali">
            <Icon name="chevL" />
          </button>
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saus text-panko lg:flex">
            <Icon name="sparkle" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-black leading-tight">Asisten Raja Katsu</h2>
            <p className="text-[13px] text-saus-3">Membaca data penjualan dan panduan aplikasi</p>
          </div>
          {pesan.length > 0 && (
            <button className="btn-ikon" onClick={hapus} aria-label="Hapus percakapan" title="Hapus percakapan">
              <Icon name="trash" size={18} />
            </button>
          )}
          <button className="btn-ikon hidden lg:flex" onClick={onClose} aria-label="Tutup">
            <Icon name="x" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 lg:px-5" aria-live="polite">
          {!tersambung && (
            <div className="flex gap-2.5 rounded-2xl bg-panko-muda px-4 py-3 text-sm">
              <Icon name="info" size={18} className="mt-0.5" />
              <p>Asisten belum tersambung ke layanan AI. Kamu sudah bisa mencoba tampilannya, dan jawabannya akan muncul setelah tim AI menyambungkannya.</p>
            </div>
          )}
          <Gelembung m={{ role: 'assistant', content: 'Halo! Saya bisa bantu membaca penjualan Raja Katsu dan menjawab cara memakai aplikasi ini. Saya hanya membaca data, tidak bisa mengubah apa pun.' }} />
          {pesan.length === 0 && !memuat && (
            <div className="flex flex-wrap gap-2">
              {SARAN.map((s) => (
                <button key={s} className="min-h-11 cursor-pointer rounded-full border-[1.5px] border-saus bg-nasi px-4 text-sm font-semibold hover:bg-kubis" onClick={() => kirim(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {memuat ? (
            <p className="flex items-center gap-2 py-4 text-sm text-saus-3"><Spinner /> Memuat percakapan...</p>
          ) : gagalMuat ? (
            <div className="rounded-2xl bg-ume-muda px-4 py-3 text-sm">
              <p className="font-semibold text-ume">Percakapan gagal dimuat</p>
              <p className="mt-0.5">{gagalMuat}</p>
              <button className="tautan mt-2" onClick={muat}>Coba lagi</button>
            </div>
          ) : (
            pesan.map((m) => <Gelembung key={m.id} m={m} />)
          )}
          {mengirim && (
            <p className="flex items-center gap-2 px-1 text-sm text-saus-3"><Spinner /> Asisten sedang menjawab...</p>
          )}
          {gagal && (
            <div className="rounded-2xl bg-ume-muda px-4 py-3 text-sm" role="alert">
              <p className="font-semibold text-ume">Pertanyaan belum terjawab</p>
              <p className="mt-0.5">{gagal.pesan}</p>
              {gagal.pertanyaan && <button className="tautan mt-2" onClick={() => kirim(gagal.pertanyaan)}>Kirim ulang</button>}
            </div>
          )}
          <div ref={bawah} />
        </div>

        <form
          className="border-t-[1.5px] border-garis px-4 pb-4 pt-3"
          onSubmit={(e) => { e.preventDefault(); kirim(); }}
        >
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="tanya-asisten">Pertanyaan untuk asisten</label>
            <input
              id="tanya-asisten"
              ref={input}
              className="min-h-12 w-full rounded-full bg-kubis px-4 text-base outline-none placeholder:text-saus-3 focus:ring-2 focus:ring-saus"
              placeholder="Tanya soal penjualan atau cara pakai..."
              value={teks}
              maxLength={500}
              onChange={(e) => setTeks(e.target.value)}
              disabled={mengirim}
            />
            <button className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-panko text-saus hover:bg-panko-tua disabled:cursor-not-allowed disabled:opacity-50" disabled={mengirim || teks.trim().length < 2} aria-label="Kirim">
              {mengirim ? <Spinner className="h-5 w-5" /> : <Icon name="chevR" size={22} strokeWidth={2.5} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-saus-3">Jawaban asisten bisa keliru. Cek ulang angka di Beranda atau Riwayat.</p>
        </form>
      </section>
    </div>
  );
}

// Dipasang di Layout. Hanya admin yang mendapat asisten.
export function AsistenProvider({ children }) {
  const { user } = useAuth();
  const [buka, setBuka] = useState(false);
  const tersedia = user?.role === 'admin';
  return (
    <AsistenContext.Provider value={{ buka: () => setBuka(true), tersedia }}>
      {children}
      {tersedia && buka && <PanelAsisten onClose={() => setBuka(false)} />}
    </AsistenContext.Provider>
  );
}

// Tombol pembuka asisten
export function TombolAsisten({ ikonSaja, className = '' }) {
  const { buka, tersedia } = useAsisten();
  if (!tersedia) return null;
  if (ikonSaja) {
    return (
      <button className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-saus-terang text-panko ring-4 ring-saus-terang ${className}`} onClick={buka} aria-label="Tanya asisten">
        <Icon name="sparkle" size={20} />
      </button>
    );
  }
  return (
    <button className={`btn-asisten ${className}`} onClick={buka}>
      <Icon name="sparkle" className="text-panko" /> Tanya asisten
    </button>
  );
}
