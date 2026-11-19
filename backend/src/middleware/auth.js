import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { AppError } from './error.js';

// Memeriksa token, lalu mengambil data pengguna terbaru dari database
// supaya akun yang dinonaktifkan atau diubah perannya langsung berlaku.
export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError(401, 'Silakan masuk terlebih dahulu.'));
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new AppError(401, 'Sesi sudah berakhir. Silakan masuk lagi.'));
  }
  try {
    const { rows } = await query('SELECT id, username, name, role, is_active FROM users WHERE id = $1', [payload.id]);
    if (!rows[0] || !rows[0].is_active) return next(new AppError(401, 'Akun ini sudah tidak aktif. Hubungi admin.'));
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

// requireRole('admin') -> hanya admin yang boleh lewat
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError(403, 'Fitur ini hanya untuk admin.'));
