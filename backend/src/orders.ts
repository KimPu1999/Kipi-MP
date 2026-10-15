import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db.js';
import { requireAuth, requireCsrf, requireRole } from './auth.js';

const router = Router();
const checkoutSchema = z.object({
  fullName: z.string().trim().min(2).max(150), phone: z.string().trim().min(5).max(50),
  address: z.string().trim().min(3).max(1000), city: z.string().trim().min(2).max(100),
  region: z.string().trim().min(2).max(100), postalCode: z.string().trim().min(2).max(30),
  country: z.string().trim().min(2).max(100), instructions: z.string().trim().max(1000).optional(),
  paymentMethod: z.literal('COD'), idempotencyKey: z.string().trim().min(16).max(100),
  items: z.array(z.object({ productId: z.string().trim().min(1).max(64), quantity: z.number().int().positive().max(99) })).min(1).max(50),
});

const orderNumber = () => `KIP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
const orderSelect = `SELECT o.id, o.order_number AS orderNumber, o.status AS orderStatus, o.payment_method AS paymentMethod, o.payment_status AS paymentStatus, o.subtotal, o.total, o.shipping_name AS fullName, o.shipping_phone AS phone, o.shipping_address AS address, o.shipping_city AS city, o.shipping_region AS region, o.shipping_postal_code AS postalCode, o.shipping_country AS country, o.shipping_instructions AS instructions, o.created_at AS createdAt FROM orders o`;

router.post('/checkout', requireAuth, requireCsrf, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid checkout details. Use Cash on Delivery and provide a valid address and cart.' });
  const input = parsed.data;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(`${orderSelect} WHERE o.customer_id = ? AND o.idempotency_key = ? LIMIT 1`, [req.user!.id, input.idempotencyKey]);
    const prior = (existing as any[])[0];
    if (prior) { await connection.rollback(); return res.json({ ...prior, paymentStatus: prior.paymentStatus, items: [] }); }
    const quantities = new Map<string, number>();
    for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    const locked: any[] = [];
    for (const [productId, quantity] of quantities) {
      const [rows] = await connection.execute('SELECT id, name, price, stock, seller_id AS sellerId FROM products WHERE id = ? FOR UPDATE', [productId]);
      const product = (rows as any[])[0];
      if (!product) { await connection.rollback(); return res.status(400).json({ message: `Product ${productId} is no longer available.` }); }
      if (product.stock < quantity) { await connection.rollback(); return res.status(409).json({ message: `${product.name} has only ${product.stock} left in stock.` }); }
      locked.push({ ...product, quantity, lineTotal: Number(product.price) * quantity });
    }
    const subtotal = locked.reduce((sum, item) => sum + item.lineTotal, 0);
    const [created] = await connection.execute('INSERT INTO orders (order_number, customer_id, status, payment_method, payment_status, subtotal, total, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_region, shipping_postal_code, shipping_country, shipping_instructions, idempotency_key) VALUES (?, ?, \'PENDING\', \'COD\', \'PENDING\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [orderNumber(), req.user!.id, subtotal, subtotal, input.fullName, input.phone, input.address, input.city, input.region, input.postalCode, input.country, input.instructions ?? null, input.idempotencyKey]);
    const orderId = (created as any).insertId;
    const [orderRows] = await connection.execute('SELECT order_number AS orderNumber FROM orders WHERE id = ?', [orderId]);
    for (const item of locked) {
      await connection.execute('INSERT INTO order_items (order_id, product_id, seller_id, product_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)', [orderId, item.id, item.sellerId ?? null, item.name, item.price, item.quantity, item.lineTotal]);
      await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
    }
    await connection.execute('INSERT INTO payments (order_id, method, status, amount) VALUES (?, \'COD\', \'PENDING\', ?)', [orderId, subtotal]);
    await connection.commit();
    return res.status(201).json({ orderId, orderNumber: (orderRows as any[])[0].orderNumber, orderStatus: 'PENDING', paymentMethod: 'COD', paymentStatus: 'PENDING', subtotal, total: subtotal, items: locked });
  } catch (error: any) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      const [rows] = await pool.execute(`${orderSelect} WHERE customer_id = ? AND idempotency_key = ? LIMIT 1`, [req.user!.id, input.idempotencyKey]);
      return res.json((rows as any[])[0]);
    }
    return res.status(503).json({ message: 'Order could not be created. No payment was captured.' });
  } finally { connection.release(); }
});

router.get('/orders', requireAuth, async (req, res) => {
  const [orders] = await pool.execute(`${orderSelect} WHERE o.customer_id = ? ORDER BY o.created_at DESC`, [req.user!.id]);
  return res.json(orders);
});
router.get('/seller/orders', requireAuth, requireRole('SELLER'), async (req, res) => {
  const [orders] = await pool.execute(`${orderSelect} JOIN order_items oi ON oi.order_id = o.id WHERE oi.seller_id = ? GROUP BY o.id ORDER BY o.created_at DESC`, [req.user!.id]);
  return res.json(orders);
});
router.get('/admin/orders', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const [orders] = await pool.execute(`${orderSelect} ORDER BY o.created_at DESC`);
  return res.json(orders);
});

export { router as ordersRouter };
