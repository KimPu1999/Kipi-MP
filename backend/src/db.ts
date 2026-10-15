import mysql, { type Pool, type PoolOptions } from 'mysql2/promise';
import { config } from './config.js';

const options: PoolOptions = {
  host: config.DATABASE_HOST,
  port: config.DATABASE_PORT,
  database: config.DATABASE_NAME,
  user: config.DATABASE_USER,
  password: config.DATABASE_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: config.DATABASE_TLS === 'true' ? {} : undefined,
};

export const pool: Pool = mysql.createPool(options);
export async function checkDatabase(): Promise<boolean> { const connection = await pool.getConnection(); try { await connection.query('SELECT 1'); return true; } finally { connection.release(); } }
export async function closeDatabase(): Promise<void> { await pool.end(); }
