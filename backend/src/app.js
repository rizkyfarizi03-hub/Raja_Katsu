import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import productRoutes, { sendPhoto } from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import reportRoutes from './routes/reports.js';
import aiRoutes from './routes/ai.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();

const origins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
// Simpan menu boleh membawa foto, jadi batas ukurannya lebih besar dari endpoint lain.
app.use('/api/v1/products', express.json({ limit: '1mb' }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/v1/health', (req, res) => res.json({ status: 'success', data: { ok: true } }));
app.use('/api/v1/auth', authRoutes);
app.get('/api/v1/products/:id/photo', sendPhoto);
app.use('/api/v1/products', requireAuth, productRoutes);
app.use('/api/v1/orders', requireAuth, orderRoutes);
app.use('/api/v1/users', requireAuth, requireRole('admin'), userRoutes);
app.use('/api/v1/transactions', requireAuth, requireRole('admin'), transactionRoutes);
app.use('/api/v1/reports', requireAuth, reportRoutes);
app.use('/api/v1/ai', requireAuth, requireRole('admin'), aiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
