import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { realpathSync } from 'fs';
import { fileURLToPath } from 'url';

const modulePath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(modulePath), '../../.env');
dotenv.config({ path: root });

const { query, pool } = await import('./config/database.js');
const { authMiddleware } = await import('./middleware/auth.js');
const { rateLimit } = await import('./middleware/rateLimit.js');
const authRouter = (await import('./routes/auth.js')).default;
const authoritative = (await import('./routes/authoritative.js')).default;
const runtimeAi = (await import('./routes/runtimeAi.js')).default;
const app = express();
const PORT = Number(process.env.PORT || 5001);
const origins = (process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);

if (!origins.length) throw new Error('CORS_ORIGINS is required');
if (!process.env.DOCUMENT_ENCRYPTION_KEY) throw new Error('DOCUMENT_ENCRYPTION_KEY is required');

app.use(helmet());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unready' });
  }
});
app.use('/api/auth', rateLimit({ max: 20 }), authRouter);
app.use('/api/authoritative/knowledge', authMiddleware, rateLimit({ max: Number(process.env.API_RATE_LIMIT || 120) }), authoritative);
app.use('/api/runtime-ai', authMiddleware, rateLimit({ max: Number(process.env.API_RATE_LIMIT || 120) }), runtimeAi);
app.use('/api', authMiddleware, (_req, res) => res.status(410).json({ error: 'legacy_route_quarantined', replacement: '/api/authoritative/knowledge' }));
app.use((error, _req, res, _next) => {
  console.error(error.message);
  const status = /scope_denied/.test(error.message)
    ? 403
    : /budget_exceeded/.test(error.message)
      ? 429
      : /missing_|required|invalid_|unresolved|mismatch|not_indexed/.test(error.message)
        ? 422
        : 500;
  res.status(status).json({ error: status === 500 ? 'internal_error' : error.message });
});

async function start() {
  if (!(await query("SELECT to_regclass('knowledge_sources') AS table_name")).rows[0].table_name) {
    throw new Error('Database migration missing; run npm run migrate');
  }
  app.listen(PORT, () => console.log(`knowledge workflow API listening on ${PORT}`));
}

const invokedPath = process.argv[1] ? realpathSync(process.argv[1]) : '';
if (invokedPath === modulePath) start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

export { app, start, pool };
