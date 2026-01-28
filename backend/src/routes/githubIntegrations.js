import express from 'express';
import { GitHubIntegration } from '../models/index.js';
import { createGitHubService } from '../services/githubService.js';
import { query } from '../config/database.js';

const router = express.Router();

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
