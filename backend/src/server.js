import 'dotenv/config';
import app from './app.js';

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error('JWT_SECRET dan DATABASE_URL wajib diisi di file .env (lihat .env.example).');
  process.exit(1);
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API Raja Katsu jalan di http://localhost:${port}/api/v1`));
