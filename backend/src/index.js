import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { initDatabase } from './config/database.js';
import { optionalAuth } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import codeReviewsRouter from './routes/codeReviews.js';
import documentationRouter from './routes/documentation.js';
import codeAnalysisRouter from './routes/codeAnalysis.js';
import apiDocsRouter from './routes/apiDocs.js';
import readmeGeneratorRouter from './routes/readmeGenerator.js';
import codeCommentsRouter from './routes/codeComments.js';
import securityScanRouter from './routes/securityScan.js';
import performanceRouter from './routes/performance.js';
import testGenerationRouter from './routes/testGeneration.js';
import refactoringRouter from './routes/refactoring.js';
import githubIntegrationsRouter from './routes/githubIntegrations.js';
import pullRequestsRouter from './routes/pullRequests.js';
import teamsRouter from './routes/teams.js';
import assignmentsRouter from './routes/assignments.js';
import webhooksRouter from './routes/webhooks.js';
import metricsRouter from './routes/metrics.js';
import bugPredictionRouter from './routes/bugPrediction.js';
import codeExplainerRouter from './routes/codeExplainer.js';
import techDebtRouter from './routes/techDebt.js';
import architectureReviewRouter from './routes/architectureReview.js';
import dependencyAuditRouter from './routes/dependencyAudit.js';
import deploymentAdviceRouter from './routes/deploymentAdvice.js';
import authRouter from './routes/auth.js';
import auditLogsRouter from './routes/auditLogs.js';
import exportsRouter from './routes/exports.js';
import bulkRouter from './routes/bulk.js';
// NEW: 7 custom non-CRUD features
import consensusRouter from './routes/consensus.js';
import qualityTrendsRouter from './routes/qualityTrends.js';
import remediationRouter from './routes/remediation.js';
import standardsRouter from './routes/standards.js';
import crossRepoDepsRouter from './routes/crossRepoDeps.js';
import slaRouter from './routes/sla.js';
import securityPostureRouter from './routes/securityPosture.js';
// Apply pass 5 — Audit-recommended Notifications subsystem
import notificationsRouter from './routes/notifications.js';

import _route_aiCodeReviewer from './routes/aiCodeReviewer.js';
import _route_architectureLinter from './routes/architectureLinter.js';
import _route_securityPostureScore from './routes/securityPostureScore.js';
import _route_scmIntegrationsExt from './routes/scmIntegrationsExt.js';
import customViewsRouter from './routes/customViews.js';
import apiBreakingChangeRouter from './routes/apiBreakingChange.js';
const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware (helmet)
app.use(helmet({
  contentSecurityPolicy: false, // disabled for API server
  crossOriginEmbedderPolicy: false,
}));

// CORS — env-driven allowlist (CORS_ORIGINS=comma-separated, defaults to FRONTEND_URL or localhost)
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server / curl
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Optional auth on all routes - sets req.user if token present
app.use(optionalAuth);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes with rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' });
app.use('/api/auth', authLimiter, authRouter);

// Feature routes
app.use('/api/code-reviews', codeReviewsRouter);
app.use('/api/documentation', documentationRouter);
app.use('/api/code-analysis', codeAnalysisRouter);
app.use('/api/api-docs', apiDocsRouter);
app.use('/api/readme-generator', readmeGeneratorRouter);
app.use('/api/code-comments', codeCommentsRouter);
// Security: /api/security-scan (CRUD) + /api/security (stateless scan at POST /api/security/scan)
app.use('/api/security-scan', securityScanRouter);
app.use('/api/security', securityScanRouter);
// Performance: /api/performance (CRUD) + stateless POST /api/performance/analyze
app.use('/api/performance', performanceRouter);
// Tests: /api/test-generation (CRUD) + stateless POST /api/tests/generate
app.use('/api/test-generation', testGenerationRouter);
app.use('/api/tests', testGenerationRouter);
// Refactoring: /api/refactoring (CRUD) + stateless POST /api/refactoring/suggest
app.use('/api/refactoring', refactoringRouter);
// Bugs: /api/bug-prediction (CRUD) + stateless POST /api/bugs/predict
app.use('/api/bug-prediction', bugPredictionRouter);
app.use('/api/bugs', bugPredictionRouter);
// Tech debt: /api/tech-debt (CRUD) + stateless POST /api/tech-debt/analyze
app.use('/api/tech-debt', techDebtRouter);
// Code explainer: /api/code-explainer (CRUD) + stateless POST /api/explain
app.use('/api/code-explainer', codeExplainerRouter);
app.use('/api/explain', codeExplainerRouter);
// Dependencies: /api/dependency-audit (CRUD) + stateless POST /api/dependencies/audit
app.use('/api/dependency-audit', dependencyAuditRouter);
app.use('/api/dependencies', dependencyAuditRouter);
app.use('/api/github', githubIntegrationsRouter);
app.use('/api/pull-requests', pullRequestsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/architecture-review', architectureReviewRouter);
app.use('/api/deployment-advice', deploymentAdviceRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/exports', exportsRouter);
// Bulk: /api/bulk (delete/update) + /api/reviews/bulk (parallel AI reviews)
app.use('/api/bulk', bulkRouter);
app.use('/api/reviews', bulkRouter);

// NEW: 7 custom non-CRUD features
app.use('/api/consensus', consensusRouter);
app.use('/api/quality-trends', qualityTrendsRouter);
app.use('/api/remediation', remediationRouter);
app.use('/api/standards', standardsRouter);
app.use('/api/cross-repo-deps', crossRepoDepsRouter);
app.use('/api/sla', slaRouter);
app.use('/api/security-posture', securityPostureRouter);

// Apply pass 5 — Notifications inbox (audit gap)
app.use('/api/notifications', notificationsRouter);

// Custom Views — 4 features (diff viewer, review timeline, report pdf, auto-tag rules)
app.use('/api/custom-views', customViewsRouter);
app.use('/api/api-breaking-change', apiBreakingChangeRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
initDatabase()
  .then(() => {
    
app.use('/api/ai-code-reviewer', _route_aiCodeReviewer); // apply pass 6 — audit custom suggestion

app.use('/api/architecture-linter', _route_architectureLinter); // apply pass 6 — audit custom suggestion

app.use('/api/security-posture-score', _route_securityPostureScore); // apply pass 6 — audit custom suggestion

app.use('/api/scm-integrations-ext', _route_scmIntegrationsExt); // apply pass 6 — audit custom suggestion
app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });


// === Batch 01 Gaps & Frontend Mounts ===
// Use createRequire so legacy CommonJS gap_* routes can be loaded from this ESM file.
import { createRequire } from 'module';
const _gapRequire = createRequire(import.meta.url);
try {
  app.use('/api/gap-critical-0-mounted-chat-style-ai-endpoints-despite', _gapRequire('./routes/gap_critical_0_mounted_chat_style_ai_endpoints_despite'));
  app.use('/api/gap-no-ai-pr-summary-or-change-impact-analyzer-wired-t', _gapRequire('./routes/gap_no_ai_pr_summary_or_change_impact_analyzer_wired_t'));
  app.use('/api/gap-no-ai-vulnerability-secret-scan-integrated-with-co', _gapRequire('./routes/gap_no_ai_vulnerability_secret_scan_integrated_with_co'));
  app.use('/api/gap-no-ai-documentation-generator-from-source', _gapRequire('./routes/gap_no_ai_documentation_generator_from_source'));
  app.use('/api/gap-no-ai-test-generation-actually-wired', _gapRequire('./routes/gap_no_ai_test_generation_actually_wired'));
  app.use('/api/gap-notification-routes-exist-but-no-slack-email-deliv', _gapRequire('./routes/gap_notification_routes_exist_but_no_slack_email_deliv'));
  app.use('/api/gap-no-ide-plugin-vs-code-jetbrains', _gapRequire('./routes/gap_no_ide_plugin_vs_code_jetbrains'));
  app.use('/api/gap-no-gitlab-bitbucket-integration-parity-only-github', _gapRequire('./routes/gap_no_gitlab_bitbucket_integration_parity_only_github'));
  app.use('/api/gap-no-sbom-license-compliance-reporting-beyond-depend', _gapRequire('./routes/gap_no_sbom_license_compliance_reporting_beyond_depend'));
  app.use('/api/gap-no-ci-cd-plugin-jenkins-circleci', _gapRequire('./routes/gap_no_ci_cd_plugin_jenkins_circleci'));
} catch (e) {
  console.warn('Gap routes load skipped:', e.message);
}
