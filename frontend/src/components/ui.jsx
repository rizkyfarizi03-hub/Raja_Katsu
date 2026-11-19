import { useState } from 'react';

const IKON = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  cart: 'M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM2 3h3l2.6 12.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6.2',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  history: 'M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4.5h4.5M12 7.5V12l3 2',
  box: 'M12 3 20 7.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  utensils: 'M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 2-3 4.5-3 8h3zM17 11v10',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0',
  users: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.5a6.5 6.5 0 0 1 3 5.5',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8M12 17h.01',
  logout: 'M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
  check: 'm5 12 5 5L20 7',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.2l2.4 2.4 4.6-4.8',
  alert: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5v5.5M12 16.5h.01',
  chevR: 'm9 18 6-6-6-6',
  chevL: 'm15 18-6-6 6-6',
  chevD: 'm6 9 6 6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  cash: 'M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20.5 14v7M14 20.5h3',
  bank: 'M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  x: 'M6 6l12 12M18 6 6 18',
  sparkle: 'M10 3.5 11.6 8.4 16.5 10 11.6 11.6 10 16.5 8.4 11.6 3.5 10 8.4 8.4zM18 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  camera: 'M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.5 6.6A17.3 17.3 0 0 0 2 12s3.6 7 10 7a10.6 10.6 0 0 0 5.4-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2',
};

export function Icon({ name, size = 20, className = '', strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d={IKON[name]} />
    </svg>
  );
}

// Membuka kalender/jam bawaan browser saat kolom tanggal ditekan di mana saja,
// bukan hanya pada ikon kecil di ujung kanannya.
export const bukaPilihan = (e) => {
  try { e.currentTarget.showPicker?.(); } catch { /* browser lama: biarkan perilaku bawaan */ }
};

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Loading({ text = 'Memuat data...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-saus-3" role="status">
      <Spinner className="h-5 w-5" /> {text}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card mx-auto max-w-md p-6 text-center">
      <p className="font-display text-lg font-bold text-ume">Data gagal dimuat</p>
      <p className="mt-1 text-sm text-saus-2">{message}</p>
      {onRetry && <button className="btn-ghost mt-4" onClick={onRetry}>Coba lagi</button>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-saus-2">{children}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:mb-6">
      <h1 className="judul text-[28px] leading-tight sm:text-[34px]">{title}</h1>
      {children && <div className="row-span-2 flex items-center gap-2 max-sm:row-span-1">{children}</div>}
      {subtitle && <p className={`col-span-2 mt-1 text-sm text-saus-2 sm:text-[15px] ${children ? 'sm:col-span-1' : ''}`}>{subtitle}</p>}
    </div>
  );
}

export function InfoBanner({ children }) {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-[14px] bg-panko-muda px-4 py-3 text-sm text-saus">
      <Icon name="info" size={18} className="mt-px" />
      <p>{children}</p>
    </div>
  );
}

export function Badge({ tone = 'netral', children }) {
  const tones = {
    netral: 'bg-kubis text-saus-2',
    daun: 'bg-daun-muda text-saus',
    ume: 'bg-ume-muda text-ume',
    panko: 'bg-panko-muda text-saus',
  };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold ${tones[tone]}`}>{children}</span>;
}

// Pilihan yang berjajar berbentuk pil, misalnya Hari / Minggu / Bulan atau Tercatat / Dibatalkan.
// options: [{ value, label, count? }]
export function Segmented({ options, value, onChange, full }) {
  return (
    <div className={`flex gap-2 ${full ? 'w-full' : ''}`} role="group">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`chip justify-center ${full ? 'flex-1' : ''} ${on ? 'chip-aktif' : ''}`}
          >
            {o.label}
            {o.count != null && <span className={`text-[13px] font-medium ${on ? 'text-panko' : 'text-saus-3'}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Tombol − jumlah + yang dipakai di daftar menu dan slip pesanan.
export function Stepper({ qty, onChange, name, full, editable }) {
  return (
    <div className={`flex shrink-0 items-center rounded-[14px] border-[1.5px] border-garis bg-nasi p-0.5 ${full ? 'w-full justify-between' : ''}`}>
      <button type="button" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl hover:bg-kubis" onClick={() => onChange(qty - 1)} aria-label={`Kurangi ${name}`}>
        <Icon name="minus" />
      </button>
      {editable ? (
        <input
          className="angka h-11 w-10 bg-transparent text-center text-lg outline-none"
          inputMode="numeric"
          value={qty}
          onChange={(e) => onChange(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
          aria-label={`Jumlah ${name}`}
        />
      ) : (
        <span className="angka flex h-11 w-10 items-center justify-center text-lg" aria-live="polite">{qty}</span>
      )}
      <button type="button" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-panko hover:bg-panko-tua" onClick={() => onChange(qty + 1)} aria-label={`Tambah ${name}`}>
        <Icon name="plus" />
      </button>
    </div>
  );
}

// Cap bundar "Tersimpan" di slip setelah penjualan disimpan.
export function CapTersimpan({ jam }) {
  return (
    <div className="flex h-[120px] w-[120px] shrink-0 -rotate-12 items-center justify-center rounded-full border-[3px] border-ume p-[5px] sm:h-[136px] sm:w-[136px]" aria-hidden="true">
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full border-[1.5px] border-ume text-ume">
        <span className="font-display text-[19px] font-black leading-none sm:text-[21px]">Tersimpan</span>
        {jam && <span className="mt-1 text-sm font-bold">{jam}</span>}
      </div>
    </div>
  );
}

// Lingkaran berisi huruf depan nama.
export function Avatar({ name, admin, className = 'h-8 w-8 text-[15px]' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-bold ${admin ? 'bg-saus text-panko' : 'bg-panko text-saus'} ${className}`} aria-hidden="true">
      {(name || '?')[0].toUpperCase()}
    </span>
  );
}

// Sakelar nyala/mati
export function Toggle({ checked, onChange, label, hint, id }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3">
      <span className="relative inline-flex">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
        <span className="h-7 w-12 rounded-full bg-garis transition peer-checked:bg-daun peer-focus-visible:ring-2 peer-focus-visible:ring-saus" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-nasi transition peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="block text-[13px] text-saus-3">{hint}</span>}
      </span>
    </label>
  );
}

// Foto menu. Kalau belum ada foto (atau gagal dimuat), tampil kotak berwarna berisi inisial.
const WARNA_FOTO = ['bg-panko-muda', 'bg-ume-muda', 'bg-daun-muda', 'bg-kubis'];
export function FotoMenu({ name, src, className = '' }) {
  const [gagal, setGagal] = useState(null);
  if (src && gagal !== src) {
    return <img src={src} alt="" loading="lazy" className={`bg-kubis object-cover ${className}`} onError={() => setGagal(src)} />;
  }
  const k = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % WARNA_FOTO.length;
  const huruf = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className={`flex items-center justify-center font-display font-black text-saus/35 ${WARNA_FOTO[k]} ${className}`} aria-hidden="true">
      {huruf}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-saus/45 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-nasi p-5 sm:rounded-[28px] sm:p-6 ${wide ? 'sm:max-w-[560px]' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] font-black leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-saus-3">{subtitle}</p>}
          </div>
          <button className="btn-ikon" onClick={onClose} aria-label="Tutup">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Panel samping (laptop) untuk formulir tambah/ubah. Di HP isinya tampil sebagai Modal.
export function PanelForm({ title, onClose, children }) {
  return (
    <aside className="card h-fit p-5 lg:sticky lg:top-6 lg:p-6" aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[22px] font-black">{title}</h2>
        <button className="btn-ikon" onClick={onClose} aria-label="Tutup">
          <Icon name="x" />
        </button>
      </div>
      {children}
    </aside>
  );
}
