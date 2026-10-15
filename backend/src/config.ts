import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('127.0.0.1'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().int().positive().default(3306),
  DATABASE_NAME: z.string().default('kipi_marketplace'),
  DATABASE_USER: z.string().default('kipi_app'),
  DATABASE_PASSWORD: z.string().default(''),
  DATABASE_TLS: z.enum(['true', 'false']).default('false'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').default('development-only-session-secret-change-me-please'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(168),
});

export const config = envSchema.parse(process.env);
