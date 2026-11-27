import { Router } from 'express';
import { query } from '../db.js';
import { AppError, wrap } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { askSchema } from '../validators/schemas.js';
import { buildAiBusinessContext } from '../services/ai-business-context.js';

// Asisten AI, khusus admin. Frontend tidak memanggil layanan AI langsung:
// pertanyaan masuk ke sini, disimpan di tabel ai_history, lalu diteruskan ke layanan AI tim AE
// (FastAPI/Flask) di alamat AI_API_URL. Selama AI_API_URL kosong, asisten menjawab bahwa
// layanannya belum tersambung, jadi tampilan sudah bisa dipakai dan dicoba.
const router = Router();

const BELUM_TERSAMBUNG =
  'Asisten belum tersambung ke layanan AI. Pertanyaanmu sudah tersimpan. Setelah tim AI menyambungkan layanannya, ' +
  'asisten bisa menjawab soal penjualan Raja Katsu dan cara memakai aplikasi ini.';

const tersambung = () => Boolean(process.env.AI_API_URL);
const FIELDS = `id, role, content, source, to_char(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') AS created_at`;

const simpan = async (userId, role, content, source = null) =>
  (await query(
    `INSERT INTO ai_history (user_id, role, content, source) VALUES ($1, $2, $3, $4) RETURNING ${FIELDS}`,
    [userId, role, content, source]
  )).rows[0];

// Meneruskan pertanyaan ke layanan AI. Kontrak request/response ada di docs/api-contract.md bagian Asisten AI.
const tanyaLayananAI = async (user, question, history, businessContext) => {
  const timeout = Number(process.env.AI_TIMEOUT_MS) || 20000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(process.env.AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
      },
      body: JSON.stringify({ question, history, user: { role: user.role }, business_context: businessContext }),
      signal: ctrl.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new AppError(504, 'Asisten terlalu lama menjawab. Coba tanyakan lagi sebentar lagi.');
    throw new AppError(502, 'Asisten sedang tidak bisa dihubungi. Coba lagi sebentar lagi.');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new AppError(503, 'Asisten sedang sibuk karena batas pemakaian. Coba lagi beberapa menit lagi.');
  if (!res.ok) throw new AppError(502, 'Asisten sedang bermasalah dan belum bisa menjawab. Coba lagi sebentar lagi.');
  const body = await res.json().catch(() => null);
  const answer = typeof body?.answer === 'string' ? body.answer.trim() : '';
  if (!answer) throw new AppError(502, 'Asisten mengirim jawaban kosong. Coba ajukan pertanyaan dengan kalimat lain.');
  const source = typeof body?.source === 'string' ? body.source.slice(0, 200) : null;
  return { answer: answer.slice(0, 4000), source };
};

// Riwayat percakapan admin yang sedang masuk (50 pesan terakhir, urut dari yang lama)
router.get('/chat', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM (SELECT ${FIELDS}, created_at AS t FROM ai_history WHERE user_id = $1 ORDER BY t DESC, id DESC LIMIT 50) x ORDER BY t, id`,
    [req.user.id]
  );
  res.json({ status: 'success', data: { connected: tersambung(), messages: rows.map(({ t, ...m }) => m) } });
}));

// Mengirim satu pertanyaan. Pertanyaan selalu disimpan; jawaban disimpan kalau asisten berhasil menjawab.
router.post('/chat', validate(askSchema), wrap(async (req, res) => {
  const { question } = req.body;
  const { rows: history } = await query(
    `SELECT role, content FROM (SELECT role, content, created_at, id FROM ai_history WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 10) x ORDER BY created_at, id`,
    [req.user.id]
  );
  const pertanyaan = await simpan(req.user.id, 'user', question);
  const businessContext = tersambung() ? await buildAiBusinessContext(question) : null;
  const { answer, source } = tersambung()
    ? await tanyaLayananAI(req.user, question, history, businessContext)
    : { answer: BELUM_TERSAMBUNG, source: null };
  const jawaban = await simpan(req.user.id, 'assistant', answer, source);
  res.status(201).json({ status: 'success', data: { connected: tersambung(), messages: [pertanyaan, jawaban] } });
}));

// Menghapus seluruh percakapan admin yang sedang masuk
router.delete('/chat', wrap(async (req, res) => {
  await query('DELETE FROM ai_history WHERE user_id = $1', [req.user.id]);
  res.json({ status: 'success', message: 'Percakapan dihapus.' });
}));

export default router;
