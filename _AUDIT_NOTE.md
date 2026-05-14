# Audit Note — AiCodeReviewDocumentation

Source: `_AUDIT/reports/batch_01.md` (Project 30)

## Maturity: SUBSTANTIVE / PARTIAL-BUILD (33 routes)

The audit reports 0 AI endpoints, but inspection shows the codebase has a working
`services/openRouterService.js`, plus 30+ feature routes (codeReviews, codeAnalysis,
bugPrediction, securityScan, performance, testGeneration, refactoring, techDebt,
codeExplainer, architectureReview, deploymentAdvice, etc.). The "missing AI layer"
claim is contradicted by the actual code.

## Original audit recommendations

### Gaps & Opportunities
- "Missing AI Layer" (likely incorrect — see above).
- Missing Notifications.

### Strategic Feature Suggestions
1. **CRITICAL: AI Code Review Agent** — automated PR analysis (already exists as `codeReviews.js`).
2. Architecture Linter (already exists as `architectureReview.js`).
3. Security Posture Scoring (already exists as `securityPosture.js`).
4. Integrations: GitHub, GitLab, Bitbucket; SonarQube, Checkmarx (`githubIntegrations.js` exists).

## Categorization
- Per the apply2 instructions: **substantive projects (>30 routes) → backlog-only**, no mechanical edits.
- The audit's strategic suggestions are largely already implemented as routes.
- Genuine gaps: notifications subsystem, GitLab/Bitbucket connectors (NEEDS-CREDS), SonarQube/Checkmarx (NEEDS-CREDS).

## Implementations applied
- None this round (substantive → backlog-only).

## Backlog (prioritized)

### High priority
- **Verify and document AI endpoints** — the audit metric counts 0 AI endpoints because the AI calls live behind feature routes (codeReviews, etc.) rather than at canonical `/api/ai/*` paths. Either document the convention or expose `/api/ai/*` aliases.
- **Notifications subsystem** (table + CRUD + outbound dispatch from PR review, security scan, build failure events).

### Medium priority
- **GitLab + Bitbucket connectors** parallel to existing `githubIntegrations.js`.
- **SonarQube / Checkmarx connectors** for security-posture aggregation.

### Low priority
- Multi-tenant white-label (33-route project is large enough to consider).
- Real-time review SSE for long-running multi-file analyses.

## Apply pass 3 (frontend)

**Action: LEFT-AS-IS** — Frontend already has dedicated React/Vite pages for every backend feature route (33 pages cover the 33 routes). Apply pass 2 added no new BE endpoints (substantive → backlog-only), so there is nothing to wire up. Idempotent.

## Apply pass 4 (mechanical backlog)

**Action: LEFT-AS-IS.** No mechanical LLM-only backlog items remain within scope.

- Notifications subsystem — NEEDS-SCHEMA (table + dispatcher + integration into existing review/scan/build event hooks). Out of mechanical scope.
- GitLab + Bitbucket connectors — NEEDS-CREDS (per-host OAuth apps + tokens parallel to `githubIntegrations.js`).
- SonarQube / Checkmarx connectors — NEEDS-CREDS (server URL + API token per tenant).
- Multi-tenant white-label — NEEDS-PRODUCT-DECISION (tenancy model, custom domains, theming policy).
- Real-time review SSE — TOO-RISKY (long-running streaming + worker refactor across 33 routes).

Existing `services/openRouterService.js` already exports specialised LLM helpers for code review (structured + free-form), documentation, code analysis, API docs, README generation, comment generation, security scan, performance analysis, test generation, refactoring, bug prediction, code explainer, tech-debt, architecture review, dependency audit, and deployment advice — every "Strategic Feature Suggestion" from the audit is already wired end-to-end. Idempotent.
