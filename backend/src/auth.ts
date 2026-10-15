import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { pool } from './db.js';
import { config } from './config.js';

export type Role = 'CUSTOMER' | 'SELLER' | 'ADMIN';
export type AuthUser = { id: number; name: string; email: string; role: Role; status: 'ACTIVE' | 'SUSPENDED' };
const hashToken = (token: string) => createHash('sha256').update(`${token}:${config.SESSION_SECRET}`).digest('hex');
const publicUser = (user: AuthUser) => ({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status });
export const sessionCookie = 'kipi_session';
export const csrfCookie = 'kipi_csrf';

export async function hashPassword(password: string) { return argon2.hash(password, { type: argon2.argon2id }); }
export async function verifyPassword(hash: string, password: string) { return argon2.verify(hash, password); }
export function newToken() { return randomBytes(32).toString('base64url'); }
export function safeUser(user: AuthUser) { return publicUser(user); }

export async function createSession(userId: number, response: Response) {
  const token = newToken(); const csrf = newToken(); const expires = new Date(Date.now() + config.SESSION_TTL_HOURS * 3600000);
  await pool.execute('INSERT INTO sessions (user_id, session_token_hash, expires_at) VALUES (?, ?, ?)', [userId, hashToken(token), expires]);
  response.cookie(sessionCookie, token, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', expires, path: '/' });
  response.cookie(csrfCookie, csrf, { httpOnly: false, secure: config.NODE_ENV === 'production', sameSite: 'lax', expires, path: '/' });
}
export async function revokeSession(token?: string) { if (token) await pool.execute('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE session_token_hash = ? AND revoked_at IS NULL', [hashToken(token)]); }
export async function currentUser(token?: string): Promise<AuthUser | null> {
  if (!token) return null;
  const [rows] = await pool.execute('SELECT u.id, u.name, u.email, u.role, u.status FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.session_token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP LIMIT 1', [hashToken(token)]);
  const row = (rows as AuthUser[])[0]; return row?.status === 'ACTIVE' ? row : null;
}
export async function requireAuth(req: Request, res: Response, next: NextFunction) { try { const user = await currentUser(req.cookies?.[sessionCookie]); if (!user) return res.status(401).json({ message: 'Authentication required' }); req.user = user; return next(); } catch { return res.status(503).json({ message: 'Authentication service unavailable' }); } }
export function requireRole(...roles: Role[]) { return (req: Request, res: Response, next: NextFunction) => { if (!req.user) return res.status(401).json({ message: 'Authentication required' }); if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Insufficient permissions' }); return next(); }; }
export function requireCsrf(req: Request, res: Response, next: NextFunction) { if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next(); if (!req.cookies?.[csrfCookie] || req.cookies[csrfCookie] !== req.get('x-csrf-token')) return res.status(403).json({ message: 'Invalid CSRF token' }); return next(); }
declare global { namespace Express { interface Request { user?: AuthUser } } }
