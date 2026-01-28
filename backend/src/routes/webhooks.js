import express from 'express';
import { Webhook, WebhookEvent } from '../models/index.js';
import { query } from '../config/database.js';
import {
  generateWebhookSecret,
  verifyGitHubSignature,
  processPushEvent,
  processPullRequestEvent
} from '../services/webhookService.js';

const router = express.Router();

// Get all webhooks
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT w.id, w.integration_id, w.events, w.auto_review, w.status, w.last_triggered_at, w.created_at,
             gi.username as github_username,
             (SELECT COUNT(*) FROM webhook_events WHERE webhook_id = w.id) as event_count
      FROM webhooks w
      LEFT JOIN github_integrations gi ON w.integration_id = gi.id
      ORDER BY w.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get webhook count
router.get('/count', async (req, res) => {
  try {
    const count = await Webhook.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single webhook (with secret for setup)
router.get('/:id', async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      ...webhook,
      events: typeof webhook.events === 'string' ? JSON.parse(webhook.events) : webhook.events,
      webhook_url: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/webhooks/github/${webhook.id}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create webhook
router.post('/', async (req, res) => {
  try {
    const { integration_id, events, auto_review } = req.body;

    // Get active GitHub integration if not provided
    let integrationId = integration_id;
    if (!integrationId) {
      const result = await query('SELECT id FROM github_integrations WHERE status = $1 LIMIT 1', ['active']);
      if (result.rows.length > 0) {
        integrationId = result.rows[0].id;
      }
    }

    const secretToken = generateWebhookSecret();

    const webhook = await Webhook.create({
      integration_id: integrationId,
      secret_token: secretToken,
      events: JSON.stringify(events || ['push', 'pull_request']),
      auto_review: auto_review !== false,
      status: 'active'
    });

    res.status(201).json({
      ...webhook,
      events: typeof webhook.events === 'string' ? JSON.parse(webhook.events) : webhook.events,
      webhook_url: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/webhooks/github/${webhook.id}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update webhook
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.events && Array.isArray(updateData.events)) {
      updateData.events = JSON.stringify(updateData.events);
    }

    const updated = await Webhook.update(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      ...updated,
      events: typeof updated.events === 'string' ? JSON.parse(updated.events) : updated.events
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete webhook
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Webhook.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get webhook events
router.get('/:id/events', async (req, res) => {
  try {
    const result = await query(`
      SELECT we.*, cr.title as review_title, cr.status as review_status
      FROM webhook_events we
      LEFT JOIN code_reviews cr ON we.review_id = cr.id
      WHERE we.webhook_id = $1
      ORDER BY we.created_at DESC
      LIMIT 50
    `, [req.params.id]);

    res.json(result.rows.map(row => ({
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Regenerate webhook secret
router.post('/:id/regenerate-secret', async (req, res) => {
  try {
    const newSecret = generateWebhookSecret();
    const updated = await Webhook.update(req.params.id, { secret_token: newSecret });

    if (!updated) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      id: updated.id,
      secret_token: newSecret,
      message: 'Secret regenerated. Update your GitHub webhook settings.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GitHub webhook receiver
router.post('/github/:id', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookId = req.params.id;

    // Get webhook config
    const webhook = await Webhook.findById(webhookId);
    if (!webhook || webhook.status !== 'active') {
      return res.status(404).json({ error: 'Webhook not found or inactive' });
    }

    // Verify signature
    const signature = req.headers['x-hub-signature-256'];
    const payload = req.body.toString();

    if (!verifyGitHubSignature(payload, signature, webhook.secret_token)) {
      // Log failed attempt
      await query(
        'INSERT INTO webhook_events (webhook_id, event_type, payload, status) VALUES ($1, $2, $3, $4)',
        [webhookId, 'signature_failed', '{}', 'failed']
      );
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'];
    const body = JSON.parse(payload);

    // Check if event type is enabled
    const enabledEvents = typeof webhook.events === 'string'
      ? JSON.parse(webhook.events)
      : webhook.events;

    if (!enabledEvents.includes(event)) {
      return res.json({ skipped: true, reason: `Event ${event} not enabled` });
    }

    // Process event
    let result;
    switch (event) {
      case 'push':
        result = await processPushEvent(webhookId, body);
        break;
      case 'pull_request':
        result = await processPullRequestEvent(webhookId, body, webhook.auto_review);
        break;
      case 'ping':
        result = { success: true, message: 'Pong!' };
        break;
      default:
        result = { skipped: true, reason: `Event ${event} not supported` };
    }

    res.json(result);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
