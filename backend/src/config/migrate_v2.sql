-- Migration v2 for AiCodeReviewDocumentation
-- Adds tables for the 7 NEW custom non-CRUD features
-- and ai_results JSONB columns for richer analytics.

-- 1. Review Consensus Engine (multi-model)
CREATE TABLE IF NOT EXISTS review_consensus (
  id SERIAL PRIMARY KEY,
  review_id INTEGER REFERENCES code_reviews(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  rating INTEGER,
  issues_count INTEGER DEFAULT 0,
  ai_results JSONB,
  raw_response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consensus_summaries (
  id SERIAL PRIMARY KEY,
  review_id INTEGER UNIQUE REFERENCES code_reviews(id) ON DELETE CASCADE,
  models_used JSONB NOT NULL,
  avg_rating NUMERIC(4,2),
  rating_variance NUMERIC(5,2),
  disagreement_score NUMERIC(5,2),
  contentious_issues JSONB,
  consensus_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Code Quality Trend Tracker
CREATE TABLE IF NOT EXISTS quality_snapshots (
  id SERIAL PRIMARY KEY,
  repository VARCHAR(255),
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  snapshot_date DATE NOT NULL,
  avg_severity NUMERIC(5,2),
  total_issues INTEGER,
  critical_count INTEGER,
  high_count INTEGER,
  medium_count INTEGER,
  low_count INTEGER,
  reviews_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(repository, team_id, snapshot_date)
);

-- 3. Issue Remediation Bot
CREATE TABLE IF NOT EXISTS remediation_patterns (
  id SERIAL PRIMARY KEY,
  issue_signature TEXT NOT NULL,
  category VARCHAR(50),
  severity VARCHAR(20),
  language VARCHAR(50),
  fix_template TEXT,
  example_before TEXT,
  example_after TEXT,
  ai_results JSONB,
  applied_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_suggestions (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER REFERENCES review_issues(id) ON DELETE CASCADE,
  pattern_id INTEGER REFERENCES remediation_patterns(id) ON DELETE SET NULL,
  suggested_fix TEXT,
  confidence_pct NUMERIC(5,2),
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP,
  ai_results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Team Coding Standards Enforcer
CREATE TABLE IF NOT EXISTS team_standards (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  language VARCHAR(50),
  standard_type VARCHAR(50),
  rule_text TEXT,
  enforcement_level VARCHAR(20) DEFAULT 'warning',
  ai_results JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS standards_compliance (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  review_id INTEGER REFERENCES code_reviews(id) ON DELETE CASCADE,
  rule_id INTEGER REFERENCES team_standards(id) ON DELETE SET NULL,
  violations_count INTEGER DEFAULT 0,
  compliance_pct NUMERIC(5,2),
  ai_results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Cross-Repo Dependency Analyzer
CREATE TABLE IF NOT EXISTS repo_dependencies (
  id SERIAL PRIMARY KEY,
  repository VARCHAR(255) NOT NULL,
  package_name VARCHAR(255) NOT NULL,
  version VARCHAR(100),
  ecosystem VARCHAR(50),
  is_dev BOOLEAN DEFAULT FALSE,
  ai_results JSONB,
  scanned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(repository, package_name, ecosystem)
);

CREATE TABLE IF NOT EXISTS dependency_conflicts (
  id SERIAL PRIMARY KEY,
  package_name VARCHAR(255) NOT NULL,
  ecosystem VARCHAR(50),
  conflict_type VARCHAR(50),
  affected_repos JSONB,
  versions JSONB,
  recommended_version VARCHAR(100),
  ai_results JSONB,
  status VARCHAR(20) DEFAULT 'open',
  detected_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- 6. Code Review SLA Tracker
CREATE TABLE IF NOT EXISTS review_sla_records (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES review_assignments(id) ON DELETE CASCADE,
  reviewer VARCHAR(255),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  turnaround_hours NUMERIC(8,2),
  was_on_time BOOLEAN,
  was_escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMP,
  ai_predicted_hours NUMERIC(8,2),
  ai_results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviewer_leaderboard (
  id SERIAL PRIMARY KEY,
  reviewer VARCHAR(255) UNIQUE NOT NULL,
  reviews_completed INTEGER DEFAULT 0,
  on_time_count INTEGER DEFAULT 0,
  avg_turnaround_hours NUMERIC(8,2),
  total_score INTEGER DEFAULT 0,
  rank INTEGER,
  badge VARCHAR(50),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Security Posture Scorer
CREATE TABLE IF NOT EXISTS security_posture (
  id SERIAL PRIMARY KEY,
  repository VARCHAR(255) NOT NULL,
  scan_date DATE NOT NULL,
  vulnerability_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  posture_score INTEGER,
  industry_benchmark INTEGER,
  ranking_pct NUMERIC(5,2),
  ai_results JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(repository, scan_date)
);

CREATE INDEX IF NOT EXISTS idx_quality_snapshots_repo_date ON quality_snapshots(repository, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_review_consensus_review ON review_consensus(review_id);
CREATE INDEX IF NOT EXISTS idx_remediation_suggestions_issue ON remediation_suggestions(issue_id);
CREATE INDEX IF NOT EXISTS idx_review_sla_reviewer ON review_sla_records(reviewer);
CREATE INDEX IF NOT EXISTS idx_security_posture_repo ON security_posture(repository);
