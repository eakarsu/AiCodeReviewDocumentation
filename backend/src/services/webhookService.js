// Webhook Service - Signature verification and event processing
import crypto from 'crypto';
import { query } from '../config/database.js';
import { CodeReview } from '../models/index.js';
import { aiCodeReviewStructured } from './openRouterService.js';
import { parseIssuesFromAI, calculateOverallSeverity } from './severityService.js';

// Generate a secure webhook secret
export const generateWebhookSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Verify GitHub webhook signature
export const verifyGitHubSignature = (payload, signature, secret) => {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
};

// Process push event
export const processPushEvent = async (webhookId, payload) => {
  const commits = payload.commits || [];
  const repository = payload.repository?.full_name;
  const branch = payload.ref?.replace('refs/heads/', '');

  // Create a code review for the pushed changes
  const changedFiles = [];
  commits.forEach(commit => {
    changedFiles.push(...(commit.added || []));
    changedFiles.push(...(commit.modified || []));
  });

  if (changedFiles.length === 0) {
    return { skipped: true, reason: 'No file changes' };
  }

  // Create a code review entry
  const codeSnippet = commits.map(c =>
    `// Commit: ${c.message}\n// Files: ${[...(c.added || []), ...(c.modified || [])].join(', ')}`
  ).join('\n\n');

  const review = await CodeReview.create({
    title: `Push to ${branch} in ${repository}`,
    description: `Automated review for ${commits.length} commit(s) pushed to ${branch}`,
    code_snippet: codeSnippet,
    language: 'javascript', // Default, could be detected from files
    status: 'pending'
  });

  // Log the webhook event
  await query(
    'INSERT INTO webhook_events (webhook_id, event_type, payload, status, review_id) VALUES ($1, $2, $3, $4, $5)',
    [webhookId, 'push', JSON.stringify({ repository, branch, commits: commits.length }), 'processed', review.id]
  );

  // Update webhook last triggered
  await query(
    'UPDATE webhooks SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = $1',
    [webhookId]
  );

  return { review_id: review.id, files_changed: changedFiles.length };
};

// Process pull request event
export const processPullRequestEvent = async (webhookId, payload, autoReview = true) => {
  const action = payload.action;
  const pr = payload.pull_request;
  const repository = payload.repository?.full_name;

  // Only process opened or synchronized PRs
  if (!['opened', 'synchronize', 'reopened'].includes(action)) {
    return { skipped: true, reason: `PR action ${action} ignored` };
  }

  // Create a code review for the PR
  const review = await CodeReview.create({
    title: `PR #${pr.number}: ${pr.title}`,
    description: `Automated review for pull request in ${repository}`,
    code_snippet: `// Pull Request: ${pr.title}\n// ${pr.head.ref} -> ${pr.base.ref}\n// ${pr.html_url}`,
    language: 'javascript',
    status: 'pending'
  });

  // Log the webhook event
  await query(
    'INSERT INTO webhook_events (webhook_id, event_type, payload, status, review_id) VALUES ($1, $2, $3, $4, $5)',
    [webhookId, 'pull_request', JSON.stringify({ repository, action, pr_number: pr.number }), 'processed', review.id]
  );

  // Update webhook last triggered
  await query(
    'UPDATE webhooks SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = $1',
    [webhookId]
  );

  // Run auto-review if enabled
  if (autoReview) {
    try {
      const result = await aiCodeReviewStructured(review.code_snippet, review.language);
      if (result.success) {
        const issues = parseIssuesFromAI(result.content);
        const severityScore = calculateOverallSeverity(issues);

        await CodeReview.update(review.id, {
          review_result: result.content,
          severity_score: severityScore,
          issues_count: issues.length,
          issues_data: JSON.stringify(issues),
          status: 'completed'
        });
      }
    } catch (error) {
      console.error('Auto-review error:', error);
    }
  }

  return { review_id: review.id, pr_number: pr.number };
};

export default {
  generateWebhookSecret,
  verifyGitHubSignature,
  processPushEvent,
  processPullRequestEvent
};
