import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { CARA_BAYAR, hariTanggal, jam, rupiah, tanggal } from '../lib/format';
import { ErrorState, Icon, Loading, Modal, Spinner } from './ui';

function Baris({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-sm">
      <span className="text-saus-2">{label}</span>
      <span className="font-bold">{children}</span>
    </div>
  );
}

// Jendela rincian satu penjualan. Admin bisa membatalkan penjualan dengan alasan;
// penjualan tidak pernah dihapus, supaya selalu ada jejaknya.
export default function RincianPesanan({ code, onClose, onDeleted }) {
  const { user } = useAuth();
  const order = useFetch(() => api.get(`/orders/${code}`).then((r) => r.data.data), [code]);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const o = order.data;
  const admin = user.role === 'admin';
  const bolehBatal = o && admin && !o.voided_at;

  const batalkan = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await api.post(`/orders/${code}/void`, { reason });
      toast.success('Penjualan dibatalkan');
      onDeleted?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <Modal
      title="Rincian penjualan"
      subtitle={o ? `${hariTanggal(o.date)}${o.time ? `, ${jam(o.time)}` : ''}` : undefined}
      onClose={deleting ? () => {} : onClose}
      wide
    >
      {order.loading ? (
        <Loading text="Memuat rincian..." />
      ) : order.error ? (
        <ErrorState message={order.error} onRetry={order.reload} />
      ) : (
        <>
          <ul className="divide-y divide-garis rounded-[18px] border-[1.5px] border-garis px-4">
            {o.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{i.product_name}</p>
                  <p className="text-[13px] text-saus-3">{i.units_sold} × {rupiah(i.unit_price)}</p>
                </div>
                <span className="font-bold">{rupiah(i.revenue)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] bg-panko-muda px-4 py-4">
            <span className="text-sm font-semibold">Total, {o.units_sold} porsi</span>
            <span className="font-display text-[26px] font-black leading-none">{rupiah(o.total)}</span>
          </div>

          <div className="mt-3 px-0.5">
            <Baris label="Cara bayar">{CARA_BAYAR[o.payment_method]}</Baris>
            {o.change != null && (
              <>
                <Baris label="Uang diterima">{rupiah(o.cash_received)}</Baris>
                <Baris label="Kembalian">{rupiah(o.change)}</Baris>
              </>
            )}
            <Baris label="Dicatat oleh">{o.created_by_name || 'Data awal'}</Baris>
            <Baris label="Nomor penjualan">{o.order_code}</Baris>
            {admin && (
              <>
                <Baris label="Modal menu">{rupiah(o.cost)}</Baris>
                <Baris label="Laba kotor"><span className="text-daun">{rupiah(o.profit)}</span></Baris>
              </>
            )}
          </div>

          {o.voided_at ? (
            <div className="mt-4 rounded-[18px] bg-ume-muda p-4 text-sm">
              <p className="font-bold text-ume">Penjualan ini dibatalkan</p>
              <p className="mt-1">Oleh {o.voided_by_name || 'admin'} pada {tanggal(o.voided_at.slice(0, 10))} pukul {jam(o.voided_at.slice(11))}.</p>
              <p className="mt-1">Alasan: {o.void_reason}</p>
              <p className="mt-1 text-saus-2">Tidak ikut dihitung di laporan.</p>
              <button className="btn-ghost mt-3 w-full" onClick={onClose}>Tutup</button>
            </div>
          ) : confirm ? (
            <form onSubmit={batalkan} className="mt-4 rounded-[18px] bg-ume-muda p-4">
              <p className="mb-3 font-bold text-ume">Batalkan penjualan ini?</p>
              <label className="label" htmlFor="alasan">Alasan pembatalan (wajib)</label>
              <input id="alasan" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: salah pilih menu" minLength={3} maxLength={200} required autoFocus />
              <p className="mt-1.5 text-xs text-saus-2">Minimal 3 huruf. Alasan tidak bisa diubah setelah disimpan.</p>
              <p className="mt-3 text-xs text-saus-2">Penjualan tetap tersimpan di Riwayat › Dibatalkan, lengkap dengan alasan dan nama kamu, tapi tidak dihitung di laporan.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-ghost flex-1" disabled={deleting} onClick={() => setConfirm(false)}>Kembali</button>
                <button className="btn-ume flex-1" disabled={deleting}>
                  {deleting ? <Spinner /> : <Icon name="x" size={18} />} {deleting ? 'Membatalkan...' : 'Ya, batalkan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 flex gap-2">
              {bolehBatal && <button className="btn-danger flex-1" onClick={() => setConfirm(true)}><Icon name="x" size={18} /> Batalkan penjualan</button>}
              <button className="btn-ghost flex-1" onClick={onClose}>Tutup</button>
            </div>
          )}
          {!admin && !o.voided_at && <p className="mt-3 text-center text-xs text-saus-2">Salah catat? Laporkan ke admin. Hanya admin yang bisa membatalkan penjualan.</p>}
        </>
      )}
    </Modal>
  );
}
