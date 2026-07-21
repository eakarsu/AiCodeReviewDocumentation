BEGIN;
CREATE TABLE IF NOT EXISTS users (
 id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL, name VARCHAR(255),
 role VARCHAR(20) NOT NULL DEFAULT 'viewer', tenant_id TEXT, avatar_url VARCHAR(500), email_verified BOOLEAN DEFAULT FALSE,
 email_verification_token VARCHAR(255), password_reset_token VARCHAR(255), password_reset_expires TIMESTAMP,
 two_factor_secret VARCHAR(255), two_factor_enabled BOOLEAN DEFAULT FALSE, last_login_at TIMESTAMP,
 failed_login_attempts INTEGER DEFAULT 0, locked_until TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS knowledge_users_tenant_idx ON users (tenant_id, id);
CREATE TABLE IF NOT EXISTS knowledge_sources (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, repository TEXT NOT NULL, commit_sha TEXT NOT NULL, path TEXT NOT NULL,
 source_version CHAR(64) NOT NULL, content_checksum CHAR(64) NOT NULL, parser_version TEXT NOT NULL, permissions JSONB NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('source_registered','ingesting','indexed','querying','answered','abstained','feedback','failed','retrying','retired')), object_uri TEXT, retention_days INTEGER NOT NULL DEFAULT 90 CHECK(retention_days BETWEEN 1 AND 3650),
 deletion_requested_at TIMESTAMPTZ, expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '90 days', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(tenant_id, repository, commit_sha, path)
);
CREATE TABLE IF NOT EXISTS knowledge_chunks (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, source_id TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE RESTRICT,
 source_version CHAR(64) NOT NULL, ordinal INTEGER NOT NULL, content_hash CHAR(64) NOT NULL, content_ciphertext BYTEA NOT NULL,
 content_iv BYTEA NOT NULL, content_auth_tag BYTEA NOT NULL, permissions JSONB NOT NULL, index_receipt JSONB,
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(source_id, ordinal, content_hash)
);
CREATE TABLE IF NOT EXISTS knowledge_deliveries (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, source_id TEXT REFERENCES knowledge_sources(id), provider TEXT NOT NULL,
 operation TEXT NOT NULL, idempotency_key TEXT NOT NULL, payload_hash CHAR(64) NOT NULL, payload JSONB NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','leased','retrying','confirmed','dead_letter')),
 attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 5, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 last_error TEXT, receipt JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(tenant_id, provider, idempotency_key)
);
CREATE TABLE IF NOT EXISTS knowledge_answers (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, actor_id TEXT NOT NULL, query_hash CHAR(64) NOT NULL, source_versions JSONB NOT NULL,
 answer_ciphertext BYTEA, answer_iv BYTEA, answer_auth_tag BYTEA, citations JSONB NOT NULL, status TEXT NOT NULL CHECK(status IN ('answered','abstained')),
 evaluation JSONB NOT NULL, evaluation_hash CHAR(64) NOT NULL, cost_micros BIGINT NOT NULL DEFAULT 0 CHECK(cost_micros>=0),
 feedback JSONB, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS knowledge_usage (
 tenant_id TEXT NOT NULL, actor_id TEXT NOT NULL, usage_date DATE NOT NULL DEFAULT CURRENT_DATE, request_count INTEGER NOT NULL DEFAULT 0,
 cost_micros BIGINT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(tenant_id,actor_id,usage_date)
);
CREATE TABLE IF NOT EXISTS knowledge_audit (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL,
 resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, before_hash CHAR(64), after_hash CHAR(64), metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION knowledge_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'knowledge_audit is append-only'; END; $$;
DROP TRIGGER IF EXISTS knowledge_audit_no_update ON knowledge_audit;
CREATE TRIGGER knowledge_audit_no_update BEFORE UPDATE OR DELETE ON knowledge_audit FOR EACH ROW EXECUTE FUNCTION knowledge_audit_immutable();
COMMIT;
