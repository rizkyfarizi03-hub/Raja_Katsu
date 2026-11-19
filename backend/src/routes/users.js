import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { AppError, wrap } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { idParam, userCreateSchema, userUpdateSchema } from '../validators/schemas.js';

// Kelola akun, khusus admin. Tidak ada pendaftaran sendiri: akun dibuat oleh admin.
const router = Router();
const FIELDS = 'id, username, name, role, is_active';

const usernameTaken = (err) =>
  err.code === '23505' ? new AppError(409, 'Nama pengguna itu sudah dipakai. Pilih yang lain.') : err;

router.get('/', wrap(async (req, res) => {
  const { rows } = await query(`SELECT ${FIELDS} FROM users ORDER BY role, name`);
  res.json({ status: 'success', data: rows });
}));

router.post('/', validate(userCreateSchema), wrap(async (req, res) => {
  const { name, username, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      `INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING ${FIELDS}`,
      [name, username, hash, role]
    );
    res.status(201).json({ status: 'success', message: 'Pengguna berhasil ditambahkan.', data: rows[0] });
  } catch (err) {
    throw usernameTaken(err);
  }
}));

// Kata sandi hanya diganti kalau kolom password diisi.
router.put('/:id', validate(idParam, 'params'), validate(userUpdateSchema), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { name, username, password, role, is_active } = req.body;
  if (id === req.user.id && (role !== 'admin' || !is_active)) {
    throw new AppError(400, 'Akun yang sedang dipakai tidak bisa dinonaktifkan atau diubah perannya.');
  }
  try {
    const { rows } = await query(
      `UPDATE users SET name = $1, username = $2, role = $3, is_active = $4 WHERE id = $5 RETURNING ${FIELDS}`,
      [name, username, role, is_active, id]
    );
    if (!rows[0]) throw new AppError(404, 'Pengguna tidak ditemukan.');
    if (password) {
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(password, 10), id]);
    }
    res.json({
      status: 'success',
      message: password ? 'Pengguna diperbarui dan kata sandi diganti.' : 'Pengguna diperbarui.',
      data: rows[0],
    });
  } catch (err) {
    throw usernameTaken(err);
  }
}));

export default router;
