import express from 'express';
import { GitHubIntegration } from '../models/index.js';
import { createGitHubService } from '../services/githubService.js';
import { query } from '../config/database.js';
import { callOpenRouter } from '../services/openRouterService.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/github/pr-review — AI-powered PR review with inline comments
router.post('/pr-review', aiRateLimiter, async (req, res) => {
  try {
    const { pr_url, diff, pr_diff } = req.body;
    // Accept both 'pr_diff' and 'diff' field names
    const diffContent = pr_diff || diff;

    if (!diffContent || typeof diffContent !== 'string') {
      return res.status(400).json({ error: 'pr_diff (or diff) is required and must be a string' });
    }

    if (Buffer.byteLength(diffContent, 'utf8') > 200 * 1024) {
      return res.status(400).json({ error: 'pr_diff exceeds maximum size of 200KB' });
    }

    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';
    const prompt = `Review the following Pull Request diff${pr_url ? ` from ${pr_url}` : ''}.

\`\`\`diff
${diffContent}
\`\`\`

Provide a comprehensive PR review with:
1. **Overall Assessment**: Summary of the PR quality
2. **Inline Comments**: Specific comments for individual changed lines
3. **Approval Recommendation**: approve|request_changes|comment

Respond with ONLY valid JSON:
{
  "overall_assessment": {
    "recommendation": "approve|request_changes|comment",
    "confidence": "high|medium|low",
    "summary": "Brief overall PR assessment",
    "quality_score": 82
  },
  "inline_comments": [
    {
      "file": "src/example.js",
      "line": 42,
      "severity": "critical|warning|suggestion|nitpick",
      "category": "security|performance|bug|style|maintainability|logic",
      "comment": "Specific actionable comment",
      "suggestion": "Suggested code or fix"
    }
  ],
  "positives": ["Things done well in this PR"],
  "concerns": ["Issues that must be addressed before merging"],
  "nitpicks": ["Minor style/preference items"],
  "missing_items": ["Missing tests, docs, error handling, etc."],
  "security_flags": ["Any security concerns found"],
  "summary": "One paragraph PR review summary"
}`;

    const result = await callOpenRouter(prompt, systemPrompt);
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    let parsed;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      parsed = { raw_review: result.content };
    }

    res.json({ pr_url: pr_url || null, review: parsed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/github/webhook — process GitHub webhook for auto-review on PR events
router.post('/webhook', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    // Acknowledge webhook immediately
    res.status(200).json({ received: true, event });

    // Only process PR open/synchronize events
    if (event !== 'pull_request') return;
    if (!['opened', 'synchronize', 'reopened'].includes(payload.action)) return;

    const pr = payload.pull_request;
    if (!pr) return;

    // Log the webhook received
    console.log(`[GitHub Webhook] PR event: ${payload.action} — PR #${pr.number}: ${pr.title}`);

    // Get active GitHub integration token to fetch diff
    const integrationResult = await query(
      'SELECT * FROM github_integrations WHERE status = $1 LIMIT 1',
      ['active']
    );

    if (integrationResult.rows.length === 0) {
      console.log('[GitHub Webhook] No active GitHub integration — skipping auto-review');
      return;
    }

    const github = createGitHubService(integrationResult.rows[0].access_token);

    // Fetch the PR diff
    let diff = '';
    try {
      const [owner, repo] = pr.base.repo.full_name.split('/');
      diff = await github.getPullRequestDiff(owner, repo, pr.number);
    } catch (err) {
      console.error('[GitHub Webhook] Failed to fetch PR diff:', err.message);
      return;
    }

    if (!diff) {
      console.log('[GitHub Webhook] Empty diff — skipping review');
      return;
    }

    // Truncate diff if too large
    const maxDiffSize = 100 * 1024;
    const diffContent = Buffer.byteLength(diff, 'utf8') > maxDiffSize
      ? diff.substring(0, maxDiffSize) + '\n... (diff truncated)'
      : diff;

    // Run AI review
    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';
    const prompt = `Auto-review PR #${pr.number}: "${pr.title}"

Diff:
\`\`\`diff
${diffContent}
\`\`\`

Provide a concise but thorough review. Respond with ONLY valid JSON:
{
  "recommendation": "approve|request_changes|comment",
  "summary": "2-3 sentence PR summary",
  "key_issues": [{ "severity": "critical|warning|suggestion", "file": "...", "description": "..." }],
  "positives": ["..."],
  "quality_score": 80
}`;

    const aiResult = await callOpenRouter(prompt, systemPrompt);

    if (aiResult.success) {
      let review;
      try {
        review = JSON.parse(aiResult.content);
      } catch {
        review = { raw_review: aiResult.content };
      }
      console.log(`[GitHub Webhook] Auto-review complete for PR #${pr.number}:`, JSON.stringify(review, null, 2));

      // Store in audit log if available
      try {
        await query(
          'INSERT INTO audit_logs (action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4)',
          ['github_pr_auto_review', 'pull_request', String(pr.number), JSON.stringify({ pr_url: pr.html_url, review })]
        );
      } catch {
        // Audit log is best-effort
      }
    }
  } catch (error) {
    console.error('[GitHub Webhook] Error:', error.message);
    // Response already sent — just log
  }
});

// Get all GitHub integrations
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await GitHubIntegration.findAllPaginated({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search: search || '',
      searchFields: ['username'],
      sort: sort || 'created_at',
      order: order || 'DESC',
      filters
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connect with Personal Access Token
router.post('/connect', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    // Verify token by getting user info
    const github = createGitHubService(access_token);
    const user = await github.getAuthenticatedUser();

    // Check if integration already exists
    const existing = await query('SELECT * FROM github_integrations WHERE status = $1 LIMIT 1', ['active']);

    let integration;
    if (existing.rows.length > 0) {
      // Update existing integration
      integration = await GitHubIntegration.update(existing.rows[0].id, {
        access_token,
        username: user.login,
        avatar_url: user.avatar_url,
        status: 'active'
      });
    } else {
      // Create new integration
      integration = await GitHubIntegration.create({
        access_token,
        username: user.login,
        avatar_url: user.avatar_url,
        status: 'active'
      });
    }

    // Don't return the token in the response
    res.json({
      id: integration.id,
      username: integration.username,
      avatar_url: integration.avatar_url,
      status: integration.status,
      created_at: integration.created_at
    });
  } catch (error) {
    console.error('GitHub connect error:', error);
    res.status(400).json({ error: error.message || 'Failed to connect to GitHub' });
  }
});

// Get connection status
router.get('/status', async (req, res) => {
  try {
    const result = await query('SELECT id, username, avatar_url, status, created_at, updated_at FROM github_integrations WHERE status = $1 LIMIT 1', ['active']);

    if (result.rows.length === 0) {
      return res.json({ connected: false });
    }

    const integration = result.rows[0];

    // Verify the token is still valid
    const fullIntegration = await GitHubIntegration.findById(integration.id);
    const github = createGitHubService(fullIntegration.access_token);

    try {
      await github.getAuthenticatedUser();
      res.json({
        connected: true,
        ...integration
      });
    } catch {
      // Token is no longer valid
      await GitHubIntegration.update(integration.id, { status: 'expired' });
      res.json({ connected: false, reason: 'Token expired' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect (remove token)
router.delete('/disconnect', async (req, res) => {
  try {
    const result = await query('UPDATE github_integrations SET status = $1 WHERE status = $2 RETURNING id', ['disconnected', 'active']);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active integration found' });
    }

    res.json({ message: 'Disconnected from GitHub' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List user's repositories
router.get('/repos', async (req, res) => {
  try {
    const result = await query('SELECT * FROM github_integrations WHERE status = $1 LIMIT 1', ['active']);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Not connected to GitHub' });
    }

    const github = createGitHubService(result.rows[0].access_token);
    const repos = await github.listRepositories({
      sort: req.query.sort || 'updated',
      per_page: parseInt(req.query.per_page) || 30,
      page: parseInt(req.query.page) || 1
    });

    res.json(repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      private: repo.private,
      language: repo.language,
      updated_at: repo.updated_at,
      open_issues_count: repo.open_issues_count,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List pull requests for a repository
router.get('/repos/:owner/:repo/pulls', async (req, res) => {
  try {
    const result = await query('SELECT * FROM github_integrations WHERE status = $1 LIMIT 1', ['active']);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Not connected to GitHub' });
    }

    const { owner, repo } = req.params;
    const github = createGitHubService(result.rows[0].access_token);
    const pulls = await github.listPullRequests(owner, repo, {
      state: req.query.state || 'open'
    });

    res.json(pulls.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user.login,
      html_url: pr.html_url,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      head: pr.head.ref,
      base: pr.base.ref,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
