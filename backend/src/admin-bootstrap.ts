import { hashPassword } from './auth.js';
import { pool } from './db.js';

const [emailArg, passwordArg, nameArg = 'Kipi Super Admin'] = process.argv.slice(2);
if (!emailArg || !passwordArg || passwordArg.length < 12) {
  console.error('Usage: npm run bootstrap:admin -- admin@example.com "a-password-at-least-12-chars" "Admin Name"');
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  const [existing] = await connection.execute('SELECT id, role FROM users WHERE email = ? FOR UPDATE', [email]);
  const row = (existing as any[])[0];
  if (row && row.role !== 'ADMIN') throw new Error('That email already belongs to a non-admin user.');
  if (row) throw new Error('An admin already exists for that email.');
  await connection.execute('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, \'ADMIN\', \'ACTIVE\')', [nameArg.trim(), email, await hashPassword(passwordArg)]);
  await connection.commit();
  console.log(`Super Admin created: ${email}`);
} catch (error) { await connection.rollback(); console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
finally { connection.release(); await pool.end(); }
