import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authRouter } from './routes.js';
import { ordersRouter } from './orders.js';
import { marketplaceAuthRouter } from './marketplace-auth.js';
import { checkDatabase, closeDatabase } from './db.js';
import { config } from './config.js';

export const app = express();
const products = [
  { id: 'p-001', name: 'Ceramic Morning Mug', description: 'Hand-finished stoneware for slow mornings.', price: 24, category: 'Home', imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80', rating: 4.8, stock: 18 },
  { id: 'p-002', name: 'Everyday Canvas Tote', description: 'A durable carry-all for daily adventures.', price: 32, category: 'Accessories', imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80', rating: 4.7, stock: 24 },
  { id: 'p-003', name: 'Botanical Desk Print', description: 'A calm, colorful accent for your workspace.', price: 18, category: 'Art', imageUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=800&q=80', rating: 4.9, stock: 12 },
  { id: 'p-004', name: 'Cloud Knit Throw', description: 'Soft texture and warm neutrals for your home.', price: 68, category: 'Home', imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', rating: 4.6, stock: 9 },
];
app.set('trust proxy', config.NODE_ENV === 'production' ? 1 : false);
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/api/health', async (_req, res) => { try { await checkDatabase(); return res.json({ status: 'ok', database: 'ok', service: 'kipi-api' }); } catch { return res.status(503).json({ status: 'degraded', database: 'unavailable', service: 'kipi-api' }); } });
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', marketplaceAuthRouter);
app.use('/api/v1', ordersRouter);
app.get('/api/products', (_req, res) => res.json(products));
app.get('/api/products/:id', (req, res) => { const product = products.find((item) => item.id === req.params.id); if (!product) return res.status(404).json({ message: 'Product not found' }); return res.json(product); });
const productQuery = z.object({ category: z.string().optional(), q: z.string().trim().max(100).optional() });
app.get('/api/search', (req, res) => { const parsed = productQuery.safeParse(req.query); if (!parsed.success) return res.status(400).json({ message: 'Invalid search parameters' }); const { category, q } = parsed.data; return res.json(products.filter((item) => (!category || item.category === category) && (!q || item.name.toLowerCase().includes(q.toLowerCase())))); });

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(config.PORT, config.HOST, () => console.log(`Kipi API listening on http://${config.HOST}:${config.PORT}`));
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${config.PORT} is already in use. Set PORT to another value, for example PORT=4001.`);
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      console.error(`Cannot listen on ${config.HOST}:${config.PORT}. Try HOST=127.0.0.1 and a different PORT.`);
    } else {
      console.error('Unable to start the Kipi API:', error);
    }
    process.exitCode = 1;
  });
  const shutdown = async () => { server.close(async () => { await closeDatabase(); process.exit(0); }); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}
