import { Router } from 'express';
import { query } from '../db.js';
import { AppError, wrap } from '../middleware/error.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, productQuery, productSchema } from '../validators/schemas.js';

const router = Router();
// photo_version berubah setiap foto diganti; kosong (null) kalau menu belum punya foto.
const FIELDS = `id, name, category, unit_price, unit_cost, is_active,
  (SELECT extract(epoch FROM ph.updated_at)::bigint FROM product_photos ph WHERE ph.product_id = products.id) AS photo_version`;
const MAX_PHOTO_BYTES = 400 * 1024;

const getOne = async (id) => (await query(`SELECT ${FIELDS} FROM products WHERE id = $1`, [id])).rows[0];

// photo: undefined = tidak diubah, null atau '' = hapus, data URL = simpan
const savePhoto = async (id, photo) => {
  if (photo === undefined) return;
  if (!photo) {
    await query('DELETE FROM product_photos WHERE product_id = $1', [id]);
    return;
  }
  const [, mime, b64] = photo.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  const data = Buffer.from(b64, 'base64');
  if (data.length > MAX_PHOTO_BYTES) throw new AppError(400, 'Ukuran foto terlalu besar. Maksimal 400 KB.');
  await query(
    `INSERT INTO product_photos (product_id, mime, data) VALUES ($1, $2, $3)
     ON CONFLICT (product_id) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, updated_at = now()`,
    [id, mime, data]
  );
};

// Foto menu. Dibuka tanpa login karena dipakai langsung oleh tag <img>.
export const sendPhoto = wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new AppError(404, 'Foto tidak ditemukan.');
  const { rows } = await query('SELECT mime, data FROM product_photos WHERE product_id = $1', [id]);
  if (!rows[0]) throw new AppError(404, 'Foto tidak ditemukan.');
  res.setHeader('Content-Type', rows[0].mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(rows[0].data);
});

// ?all=true ikut menampilkan produk yang sudah dinonaktifkan
router.get('/', validate(productQuery, 'query'), wrap(async (req, res) => {
  const active = req.validQuery.all ? '' : 'AND is_active';
  const { rows } = await query(`SELECT ${FIELDS} FROM products WHERE deleted_at IS NULL ${active} ORDER BY category, name`);
  // Kasir tidak boleh melihat modal.
  if (req.user.role !== 'admin') rows.forEach((r) => delete r.unit_cost);
  res.json({ status: 'success', data: rows });
}));

router.post('/', requireRole('admin'), validate(productSchema), wrap(async (req, res) => {
  const { name, category, unit_price, unit_cost, photo } = req.body;
  const { rows } = await query(
    'INSERT INTO products (name, category, unit_price, unit_cost) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, category, unit_price, unit_cost]
  );
  await savePhoto(rows[0].id, photo || undefined);
  res.status(201).json({ status: 'success', message: 'Menu berhasil ditambahkan.', data: await getOne(rows[0].id) });
}));

router.put('/:id', requireRole('admin'), validate(idParam, 'params'), validate(productSchema), wrap(async (req, res) => {
  const { name, category, unit_price, unit_cost, is_active = true, photo } = req.body;
  const { rows } = await query(
    `UPDATE products SET name = $1, category = $2, unit_price = $3, unit_cost = $4, is_active = $5, updated_at = now()
     WHERE id = $6 AND deleted_at IS NULL RETURNING id`,
    [name, category, unit_price, unit_cost, is_active, req.params.id]
  );
  if (!rows[0]) throw new AppError(404, 'Menu tidak ditemukan.');
  await savePhoto(rows[0].id, photo);
  res.json({ status: 'success', message: 'Menu berhasil diperbarui.', data: await getOne(rows[0].id) });
}));

// Produk yang belum pernah terjual dihapus permanen. Produk yang sudah punya penjualan
// disembunyikan dari semua daftar, tapi barisnya disimpan supaya laporan lama tidak berubah.
router.delete('/:id', requireRole('admin'), validate(idParam, 'params'), wrap(async (req, res) => {
  const { id } = req.params;
  const { rows: [found] } = await query(
    `SELECT EXISTS (SELECT 1 FROM transactions WHERE product_id = $1) AS has_sales
     FROM products WHERE id = $1 AND deleted_at IS NULL`, [id]
  );
  if (!found) throw new AppError(404, 'Produk tidak ditemukan.');

  if (found.has_sales) {
    await query('UPDATE products SET deleted_at = now(), is_active = FALSE, updated_at = now() WHERE id = $1', [id]);
  } else {
    await query('DELETE FROM products WHERE id = $1', [id]);
  }
  res.json({ status: 'success', message: 'Produk dihapus.', data: { id: Number(id), history_kept: found.has_sales } });
}));

export default router;
