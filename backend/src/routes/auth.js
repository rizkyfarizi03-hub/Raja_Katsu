import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { AppError, wrap } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/schemas.js';

const router = Router();

router.post('/login', validate(loginSchema), wrap(async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await query('SELECT id, username, name, role, is_active, password_hash FROM users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError(401, 'Nama pengguna atau kata sandi salah.');
  }
  if (!user.is_active) throw new AppError(401, 'Akun ini sudah tidak aktif. Hubungi admin.');
  const payload = { id: user.id, username: user.username, name: user.name, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });
  res.json({ status: 'success', data: { token, user: payload } });
}));

router.get('/me', requireAuth, (req, res) => {
  const { id, username, name, role } = req.user;
  res.json({ status: 'success', data: { id, username, name, role } });
});

export default router;
