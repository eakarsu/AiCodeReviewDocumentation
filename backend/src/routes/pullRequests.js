import express from 'express';
import { PullRequest, CodeReview, GitHubIntegration } from '../models/index.js';
import { createGitHubService } from '../services/githubService.js';
import GitHubService from '../services/githubService.js';
import { query } from '../config/database.js';
import { aiCodeReviewStructured } from '../services/openRouterService.js';
import { parseIssuesFromAI, calculateOverallSeverity } from '../services/severityService.js';

const router = express.Router();

// Get count
router.get('/count', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) FROM pull_requests');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active GitHub integration
async function getActiveIntegration() {
  const result = await query('SELECT * FROM github_integrations WHERE status = $1 LIMIT 1', ['active']);
  if (result.rows.length === 0) {
    throw new Error('Not connected to GitHub');
  }
  return result.rows[0];
}

// Fetch a PR by URL
router.post('/fetch', async (req, res) => {
  try {
    const { pr_url } = req.body;

    if (!pr_url) {
      return res.status(400).json({ error: 'PR URL is required' });
    }

    // Parse the URL
    const { owner, repo, pullNumber } = GitHubService.parsePullRequestUrl(pr_url);

    // Get integration
    const integration = await getActiveIntegration();
    const github = createGitHubService(integration.access_token);

    // Fetch complete PR data
    const prData = await github.fetchPullRequestComplete(owner, repo, pullNumber);

    // Check if PR already exists
    const existing = await query(
      'SELECT * FROM pull_requests WHERE repository = $1 AND pr_number = $2',
      [prData.repository, prData.pr_number]
    );

    let pullRequest;
    if (existing.rows.length > 0) {
      // Update existing
      pullRequest = await PullRequest.update(existing.rows[0].id, {
        title: prData.title,
        author: prData.author,
        base_branch: prData.base_branch,
        head_branch: prData.head_branch,
        diff_content: prData.diff_content,
        files_changed: JSON.stringify(prData.files_changed),
        pr_url: prData.pr_url,
        state: prData.state
      });
    } else {
      // Create new
      pullRequest = await PullRequest.create({
        integration_id: integration.id,
        pr_number: prData.pr_number,
        title: prData.title,
        author: prData.author,
        repository: prData.repository,
        base_branch: prData.base_branch,
        head_branch: prData.head_branch,
        diff_content: prData.diff_content,
        files_changed: JSON.stringify(prData.files_changed),
        pr_url: prData.pr_url,
        state: prData.state
      });
    }

    res.json(pullRequest);
  } catch (error) {
    console.error('Fetch PR error:', error);
    res.status(400).json({ error: error.message });
  }
});

// List all fetched PRs
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT pr.*, cr.status as review_status, cr.severity_score
      FROM pull_requests pr
      LEFT JOIN code_reviews cr ON pr.review_id = cr.id
      ORDER BY pr.created_at DESC
    `);

    res.json(result.rows.map(row => ({
      ...row,
      files_changed: typeof row.files_changed === 'string'
        ? JSON.parse(row.files_changed)
        : row.files_changed
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single PR
router.get('/:id', async (req, res) => {
  try {
    const pr = await PullRequest.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    pr.files_changed = typeof pr.files_changed === 'string'
      ? JSON.parse(pr.files_changed)
      : pr.files_changed;

    res.json(pr);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create review from PR
router.post('/:id/review', async (req, res) => {
  try {
    const pr = await PullRequest.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    // Combine all file patches into a single code snippet for review
    const filesChanged = typeof pr.files_changed === 'string'
      ? JSON.parse(pr.files_changed)
      : pr.files_changed;

    const codeSnippet = filesChanged
      .filter(f => f.patch)
      .map(f => `// File: ${f.filename}\n${f.patch}`)
      .join('\n\n');

    // Detect primary language
    const languages = filesChanged.map(f => {
      const ext = f.filename.split('.').pop();
      const langMap = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', java: 'java', go: 'go', rs: 'rust', rb: 'ruby',
        php: 'php', cpp: 'c++', c: 'c', cs: 'c#', swift: 'swift',
        kt: 'kotlin', sql: 'sql'
      };
      return langMap[ext] || ext;
    });

    const primaryLanguage = languages[0] || 'javascript';

    // Create code review
    const codeReview = await CodeReview.create({
      title: `PR Review: ${pr.title}`,
      description: `Code review for pull request #${pr.pr_number} in ${pr.repository}`,
      code_snippet: codeSnippet,
      language: primaryLanguage,
      status: 'pending'
    });

    // Link PR to review
    await PullRequest.update(pr.id, { review_id: codeReview.id });

    // Run AI analysis if requested
    if (req.body.auto_analyze) {
      const result = await aiCodeReviewStructured(codeSnippet, primaryLanguage);

      if (result.success) {
        const issues = parseIssuesFromAI(result.content);
        const severityScore = calculateOverallSeverity(issues);

        await CodeReview.update(codeReview.id, {
          review_result: result.content,
          severity_score: severityScore,
          issues_count: issues.length,
          issues_data: JSON.stringify(issues),
          status: 'completed'
        });

        const updated = await CodeReview.findById(codeReview.id);
        return res.json({
          pull_request: pr,
          code_review: { ...updated, parsed_issues: issues }
        });
      }
    }

    res.json({
      pull_request: pr,
      code_review: codeReview
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh PR data from GitHub
router.post('/:id/refresh', async (req, res) => {
  try {
    const pr = await PullRequest.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    const integration = await getActiveIntegration();
    const github = createGitHubService(integration.access_token);

    const [owner, repo] = pr.repository.split('/');
    const prData = await github.fetchPullRequestComplete(owner, repo, pr.pr_number);

    const updated = await PullRequest.update(pr.id, {
      title: prData.title,
      state: prData.state,
      diff_content: prData.diff_content,
      files_changed: JSON.stringify(prData.files_changed)
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete PR
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await PullRequest.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Pull request not found' });
    }
    res.json({ message: 'Pull request deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
