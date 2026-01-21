import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = pg;

// Configure pool - works with local PostgreSQL (no password needed on macOS)
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_code_review',
};

// Only add user/password if provided (local PostgreSQL on macOS uses peer auth)
if (process.env.DB_USER) {
  poolConfig.user = process.env.DB_USER;
}
if (process.env.DB_PASSWORD) {
  poolConfig.password = process.env.DB_PASSWORD;
}

const pool = new Pool(poolConfig);

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
