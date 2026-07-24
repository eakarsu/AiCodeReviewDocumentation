import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(root, '.env') });
const { pool, query } = await import('../src/config/database.js');
const { hashPassword } = await import('../src/utils/crypto.js');

try {
  if (process.env.ALLOW_SCHEMA_MIGRATION !== 'true') throw new Error('ALLOW_SCHEMA_MIGRATION=true is required');
  await query(fs.readFileSync(path.join(root, 'backend/migrations/001_authoritative_knowledge.sql'), 'utf8'));
  await query(`CREATE TABLE IF NOT EXISTS knowledge_ai_results (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id text NOT NULL, user_id integer NOT NULL REFERENCES users(id),
    input jsonb NOT NULL, result jsonb NOT NULL, model text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  const email = (process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';
  const tenantId = (process.env.TENANT_ID || process.env.GOVERNANCE_TENANT_ID || '').trim();
  if (!email || !tenantId || password.length < 12) throw new Error('Runtime administrator credentials are required');
  await query(
    `INSERT INTO users(email,password_hash,name,role,tenant_id,email_verified)
     VALUES($1,$2,$3,'admin',$4,true)
     ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,role='admin',tenant_id=EXCLUDED.tenant_id,email_verified=true`,
    [email, await hashPassword(password), 'Runtime Administrator', tenantId],
  );
} finally { await pool.end(); }
