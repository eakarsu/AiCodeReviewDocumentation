import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export const query = (text, params) => pool.query(text, params);

export const initDatabase = async () => {
  const createTablesSQL = `
    -- Code Reviews table
    CREATE TABLE IF NOT EXISTS code_reviews (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code_snippet TEXT,
      language VARCHAR(50),
      review_result TEXT,
      suggestions TEXT,
      severity VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Documentation table
    CREATE TABLE IF NOT EXISTS documentation (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      source_code TEXT,
      generated_docs TEXT,
      doc_type VARCHAR(50),
      language VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Code Analysis table
    CREATE TABLE IF NOT EXISTS code_analysis (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code_snippet TEXT,
      language VARCHAR(50),
      complexity_score INTEGER,
      quality_score INTEGER,
      analysis_result TEXT,
      metrics JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- API Docs table
    CREATE TABLE IF NOT EXISTS api_docs (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      endpoint VARCHAR(255),
      method VARCHAR(10),
      request_body TEXT,
      response_body TEXT,
      generated_docs TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- README Projects table
    CREATE TABLE IF NOT EXISTS readme_projects (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      project_structure TEXT,
      tech_stack TEXT,
      generated_readme TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Code Comments table
    CREATE TABLE IF NOT EXISTS code_comments (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code_snippet TEXT,
      language VARCHAR(50),
      generated_comments TEXT,
      comment_style VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Security Scans table
    CREATE TABLE IF NOT EXISTS security_scans (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code_snippet TEXT,
      language VARCHAR(50),
      vulnerabilities TEXT,
      risk_level VARCHAR(20),
      recommendations TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Performance Reports table
    CREATE TABLE IF NOT EXISTS performance_reports (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code_snippet TEXT,
      language VARCHAR(50),
      bottlenecks TEXT,
      optimization_suggestions TEXT,
      performance_score INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Test Generations table
    CREATE TABLE IF NOT EXISTS test_generations (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      source_code TEXT,
      language VARCHAR(50),
      test_framework VARCHAR(50),
      generated_tests TEXT,
      coverage_estimate INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Refactoring Suggestions table
    CREATE TABLE IF NOT EXISTS refactoring_suggestions (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      original_code TEXT,
      language VARCHAR(50),
      refactored_code TEXT,
      improvement_type VARCHAR(50),
      rationale TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Review Issues table (for severity scoring)
    CREATE TABLE IF NOT EXISTS review_issues (
      id SERIAL PRIMARY KEY,
      review_id INTEGER REFERENCES code_reviews(id) ON DELETE CASCADE,
      category VARCHAR(50),
      severity VARCHAR(20),
      severity_score INTEGER,
      title VARCHAR(255),
      description TEXT,
      line_number INTEGER,
      suggestion TEXT,
      fixed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- GitHub Integrations table
    CREATE TABLE IF NOT EXISTS github_integrations (
      id SERIAL PRIMARY KEY,
      access_token TEXT NOT NULL,
      username VARCHAR(255),
      avatar_url VARCHAR(500),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Pull Requests table
    CREATE TABLE IF NOT EXISTS pull_requests (
      id SERIAL PRIMARY KEY,
      integration_id INTEGER REFERENCES github_integrations(id) ON DELETE SET NULL,
      pr_number INTEGER,
      title VARCHAR(500),
      author VARCHAR(255),
      repository VARCHAR(500),
      base_branch VARCHAR(255),
      head_branch VARCHAR(255),
      diff_content TEXT,
      files_changed JSONB,
      pr_url VARCHAR(500),
      state VARCHAR(20),
      review_id INTEGER REFERENCES code_reviews(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Teams table
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Team Members table
    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'member',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, email)
    );

    -- Review Assignments table
    CREATE TABLE IF NOT EXISTS review_assignments (
      id SERIAL PRIMARY KEY,
      review_id INTEGER REFERENCES code_reviews(id) ON DELETE CASCADE,
      assigned_to VARCHAR(255) NOT NULL,
      assigned_by VARCHAR(255),
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      due_date TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Webhooks table
    CREATE TABLE IF NOT EXISTS webhooks (
      id SERIAL PRIMARY KEY,
      integration_id INTEGER REFERENCES github_integrations(id) ON DELETE CASCADE,
      secret_token VARCHAR(255) NOT NULL,
      events JSONB DEFAULT '["push", "pull_request"]',
      auto_review BOOLEAN DEFAULT TRUE,
      status VARCHAR(20) DEFAULT 'active',
      last_triggered_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Webhook Events table
    CREATE TABLE IF NOT EXISTS webhook_events (
      id SERIAL PRIMARY KEY,
      webhook_id INTEGER REFERENCES webhooks(id) ON DELETE CASCADE,
      event_type VARCHAR(50),
      payload JSONB,
      status VARCHAR(20),
      review_id INTEGER REFERENCES code_reviews(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Review Metrics table (for analytics)
    CREATE TABLE IF NOT EXISTS review_metrics (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      total_reviews INTEGER DEFAULT 0,
      completed_reviews INTEGER DEFAULT 0,
      avg_severity_score DECIMAL(5,2),
      issues_by_category JSONB,
      top_languages JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Bug Predictions table
    CREATE TABLE IF NOT EXISTS bug_predictions (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code_snippet TEXT,
      language VARCHAR(50),
      predicted_bugs TEXT,
      bug_probability INTEGER,
      risk_areas JSONB,
      ai_analysis TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Code Explanations table (DevOps)
    CREATE TABLE IF NOT EXISTS code_explanations (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code_snippet TEXT,
      language VARCHAR(50),
      context VARCHAR(100) DEFAULT 'devops',
      explanation TEXT,
      key_concepts JSONB,
      complexity_level VARCHAR(20),
      ai_analysis TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Tech Debt Items table (DevOps)
    CREATE TABLE IF NOT EXISTS tech_debt_items (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code_snippet TEXT,
      language VARCHAR(50),
      project_name VARCHAR(255),
      debt_type VARCHAR(50),
      severity VARCHAR(20),
      estimated_effort VARCHAR(50),
      debt_analysis TEXT,
      remediation_plan TEXT,
      priority_score INTEGER,
      ai_analysis TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Architecture Reviews table (DevOps)
    CREATE TABLE IF NOT EXISTS architecture_reviews (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      architecture_diagram TEXT,
      tech_stack TEXT,
      system_type VARCHAR(100),
      review_result TEXT,
      recommendations JSONB,
      scalability_score INTEGER,
      maintainability_score INTEGER,
      security_score INTEGER,
      ai_analysis TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Dependency Audits table (DevOps)
    CREATE TABLE IF NOT EXISTS dependency_audits (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      dependencies_list TEXT,
      package_manager VARCHAR(50),
      project_type VARCHAR(50),
      vulnerabilities JSONB,
      outdated_packages JSONB,
      license_issues JSONB,
      audit_result TEXT,
      risk_score INTEGER,
      ai_analysis TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Deployment Advices table (DevOps)
    CREATE TABLE IF NOT EXISTS deployment_advices (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      current_setup TEXT,
      target_environment VARCHAR(100),
      deployment_type VARCHAR(50),
      infrastructure_config TEXT,
      deployment_strategy TEXT,
      recommendations JSONB,
      checklist JSONB,
      risk_assessment TEXT,
      ai_analysis TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name VARCHAR(255),
      role VARCHAR(20) DEFAULT 'viewer',
      avatar_url VARCHAR(500),
      email_verified BOOLEAN DEFAULT FALSE,
      email_verification_token VARCHAR(255),
      password_reset_token VARCHAR(255),
      password_reset_expires TIMESTAMP,
      two_factor_secret VARCHAR(255),
      two_factor_enabled BOOLEAN DEFAULT FALSE,
      last_login_at TIMESTAMP,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- API Keys table
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      key_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_email VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(100),
      resource_id VARCHAR(100),
      details JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Add severity columns to code_reviews if not exists
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='code_reviews' AND column_name='severity_score') THEN
        ALTER TABLE code_reviews ADD COLUMN severity_score INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='code_reviews' AND column_name='issues_count') THEN
        ALTER TABLE code_reviews ADD COLUMN issues_count INTEGER DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='code_reviews' AND column_name='issues_data') THEN
        ALTER TABLE code_reviews ADD COLUMN issues_data JSONB;
      END IF;
      -- Add updated_at to tables that might be missing it
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='review_assignments' AND column_name='updated_at') THEN
        ALTER TABLE review_assignments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='review_issues' AND column_name='updated_at') THEN
        ALTER TABLE review_issues ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='updated_at') THEN
        ALTER TABLE teams ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_members' AND column_name='updated_at') THEN
        ALTER TABLE team_members ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='webhooks' AND column_name='updated_at') THEN
        ALTER TABLE webhooks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='webhook_events' AND column_name='updated_at') THEN
        ALTER TABLE webhook_events ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='review_metrics' AND column_name='updated_at') THEN
        ALTER TABLE review_metrics ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      END IF;
    END $$;
  `;

  try {
    await pool.query(createTablesSQL);
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export default pool;
