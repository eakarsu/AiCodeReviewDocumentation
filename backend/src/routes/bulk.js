import express from 'express';
import { query } from '../config/database.js';
import { aiCodeReviewStructured, callOpenRouter } from '../services/openRouterService.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { validateCodeInput } from '../utils/inputValidation.js';

const router = express.Router();

const VALID_TABLES = [
  'code_reviews', 'documentation', 'code_analysis', 'api_docs',
  'readme_projects', 'code_comments', 'security_scans', 'performance_reports',
  'test_generations', 'refactoring_suggestions', 'bug_predictions',
  'code_explanations', 'tech_debt_items', 'architecture_reviews',
  'dependency_audits', 'deployment_advices', 'teams', 'review_assignments',
  'webhooks'
];

// POST /api/bulk/reviews — bulk AI code review: accepts array of snippets, runs in parallel
router.post('/reviews', aiRateLimiter, async (req, res) => {
  try {
    const { snippets } = req.body;

    if (!Array.isArray(snippets) || snippets.length === 0) {
      return res.status(400).json({ error: 'snippets must be a non-empty array' });
    }

    if (snippets.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 snippets per bulk request' });
    }

    // Validate all snippets first
    for (let i = 0; i < snippets.length; i++) {
      const { code, language } = snippets[i];
      const validation = validateCodeInput(code, language);
      if (!validation.valid) {
        return res.status(400).json({ error: `snippets[${i}]: ${validation.error}` });
      }
    }

    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';

    // Run all reviews in parallel
    const results = await Promise.allSettled(
      snippets.map(async ({ code, language, label }, index) => {
        const prompt = `Review the following ${language} code${label ? ` (${label})` : ''}:

\`\`\`${language}
${code}
\`\`\`

Respond with ONLY valid JSON:
{
  "overall_rating": 7,
  "summary": "Brief code summary",
  "issues": [
    { "severity": "critical|high|medium|low|info", "category": "bug|security|performance|style|maintainability", "title": "...", "description": "...", "line_reference": "line X", "suggestion": "..." }
  ],
  "positives": ["..."],
  "recommendations": ["..."]
}`;

        const aiResult = await callOpenRouter(prompt, systemPrompt);
        if (!aiResult.success) {
          return { index, label: label || `snippet_${index}`, status: 'error', error: aiResult.error };
        }

        let review;
        try {
          review = JSON.parse(aiResult.content);
        } catch {
          review = { raw_review: aiResult.content };
        }

        return { index, label: label || `snippet_${index}`, language, status: 'success', review };
      })
    );

    const reviews = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return { index, status: 'error', error: result.reason?.message || 'Unknown error' };
    });

    const succeeded = reviews.filter(r => r.status === 'success').length;
    const failed = reviews.filter(r => r.status === 'error').length;

    res.json({
      total: snippets.length,
      succeeded,
      failed,
      reviews
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete
router.post('/delete', async (req, res) => {
  try {
    const { resource, ids } = req.body;
    if (!VALID_TABLES.includes(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(`DELETE FROM ${resource} WHERE id IN (${placeholders}) RETURNING id`, ids);
    res.json({ deleted: result.rows.length, ids: result.rows.map(r => r.id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update
router.post('/update', async (req, res) => {
  try {
    const { resource, ids, data } = req.body;
    if (!VALID_TABLES.includes(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'data must be a non-empty object' });
    }

    // Only allow updating status field for safety
    const allowedFields = ['status'];
    const filteredData = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        filteredData[key] = value;
      }
    }
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const columns = Object.keys(filteredData);
    const values = Object.values(filteredData);
    let paramIndex = 1;
    const setClause = columns.map((col) => `${col} = $${paramIndex++}`).join(', ');
    const placeholders = ids.map(() => `$${paramIndex++}`).join(', ');

    const result = await query(
      `UPDATE ${resource} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) RETURNING *`,
      [...values, ...ids]
    );
    res.json({ updated: result.rows.length, items: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
