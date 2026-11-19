import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8');

await pool.query(sql);
console.log('Skema database siap.');
await pool.end();
