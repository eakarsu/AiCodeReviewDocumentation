// NEW: Review Consensus Engine
// Aggregates reviews from multiple AI models and computes a disagreement score.

import express from 'express';
import { CodeReview } from '../models/index.js';
import { aiCodeReviewStructured, callOpenRouter } from '../services/openRouterService.js';
import { parseAIJson } from '../utils/parseAIJson.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { query } from '../config/database.js';

const router = express.Router();

const MODEL_OPTIONS = [
  'anthropic/claude-3-5-sonnet-20241022',
  'openai/gpt-4o-mini',
  'google/gemini-flash-1.5',
];

// List consensus summaries (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [data, count] = await Promise.all([
      query(`SELECT cs.*, cr.title FROM consensus_summaries cs LEFT JOIN code_reviews cr ON cs.review_id = cr.id ORDER BY cs.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      query(`SELECT COUNT(*)::int AS total FROM consensus_summaries`),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:reviewId', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId);
    const summary = await query('SELECT * FROM consensus_summaries WHERE review_id = $1', [reviewId]);
    const models = await query('SELECT * FROM review_consensus WHERE review_id = $1 ORDER BY created_at', [reviewId]);
    if (!summary.rows.length) return res.status(404).json({ error: 'No consensus computed for this review' });
    res.json({ summary: summary.rows[0], model_responses: models.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run consensus across multiple models
router.post('/:reviewId/run', aiRateLimiter, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId);
    const review = await CodeReview.findById(reviewId);
    if (!review) return res.status(404).json({ error: 'Code review not found' });

    const { models } = req.body;
    const modelList = (Array.isArray(models) && models.length ? models : MODEL_OPTIONS).slice(0, 5);

    const responses = [];
    for (const model of modelList) {
      const systemPrompt = 'You are an expert code reviewer. Always respond with valid JSON only matching the requested schema.';
      const prompt = `Review the following ${review.language} code and respond ONLY with valid JSON:
{
  "rating": 7,
  "issues": [
    {"category": "bug|security|performance|style|maintainability", "severity": "critical|high|medium|low|info", "title": "title", "description": "desc"}
  ],
  "summary": "brief overall feedback"
}

Code:
\`\`\`${review.language}
${review.code_snippet}
\`\`\``;

      try {
        const result = await callOpenRouter(prompt, systemPrompt);
        if (result.success) {
          const parsed = parseAIJson(result.content);
          await query(
            `INSERT INTO review_consensus (review_id, model, rating, issues_count, ai_results, raw_response) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [
              reviewId,
              model,
              parsed.data?.rating || null,
              parsed.data?.issues?.length || 0,
              parsed.data ? JSON.stringify(parsed.data) : null,
              result.content,
            ]
          );
          responses.push({ model, rating: parsed.data?.rating, issues_count: parsed.data?.issues?.length || 0, parsed: parsed.data });
        } else {
          responses.push({ model, error: result.error });
        }
      } catch (err) {
        responses.push({ model, error: err.message });
      }
    }

    // Compute consensus statistics
    const ratings = responses.filter(r => r.rating != null).map(r => r.rating);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const variance = ratings.length > 1
      ? ratings.reduce((s, r) => s + Math.pow(r - avgRating, 2), 0) / ratings.length
      : 0;
    const disagreementScore = ratings.length > 1 ? Math.sqrt(variance) : 0;

    // Aggregate contentious issues (titles that appear in some models but not all)
    const allIssueTitles = new Map();
    responses.forEach(r => {
      if (r.parsed?.issues) {
        r.parsed.issues.forEach(iss => {
          const key = (iss.title || '').toLowerCase().trim();
          if (!key) return;
          if (!allIssueTitles.has(key)) allIssueTitles.set(key, { title: iss.title, models: [], severities: [] });
          const entry = allIssueTitles.get(key);
          entry.models.push(r.model);
          entry.severities.push(iss.severity);
        });
      }
    });
    const contentious = Array.from(allIssueTitles.values())
      .filter(e => e.models.length < responses.length && e.models.length >= 1)
      .slice(0, 10);

    const summary = await query(`
      INSERT INTO consensus_summaries (review_id, models_used, avg_rating, rating_variance, disagreement_score, contentious_issues, consensus_summary, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      ON CONFLICT (review_id) DO UPDATE
        SET models_used = EXCLUDED.models_used,
            avg_rating = EXCLUDED.avg_rating,
            rating_variance = EXCLUDED.rating_variance,
            disagreement_score = EXCLUDED.disagreement_score,
            contentious_issues = EXCLUDED.contentious_issues,
            consensus_summary = EXCLUDED.consensus_summary,
            updated_at = NOW()
      RETURNING *
    `, [
      reviewId,
      JSON.stringify(modelList),
      avgRating,
      variance,
      disagreementScore,
      JSON.stringify(contentious),
      `Consensus across ${ratings.length}/${modelList.length} models. Avg rating ${avgRating?.toFixed(2) || '—'}, disagreement ${disagreementScore.toFixed(2)}.`,
    ]);

    res.json({
      summary: summary.rows[0],
      model_responses: responses,
      contentious_issues: contentious,
    });
  } catch (err) {
    console.error('Consensus error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
