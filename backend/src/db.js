import 'dotenv/config';
import pg from 'pg';

// BIGINT (hasil SUM/COUNT) dibaca sebagai number, DATE dibaca sebagai string 'YYYY-MM-DD'.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export const query = (text, params) => pool.query(text, params);
