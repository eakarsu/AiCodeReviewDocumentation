// NEW: Security Posture Scorer
// Aggregate security scan results across repos, trend over time, benchmark, ranking.

import express from 'express';
import { query } from '../config/database.js';
import { callOpenRouter } from '../services/openRouterService.js';
import { parseAIJson } from '../utils/parseAIJson.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Compute today's posture from existing security_scans
router.post('/compute', async (req, res) => {
  try {
    const { repository = 'global' } = req.body;

    // Aggregate from security_scans table
    const stats = await query(`
      SELECT
        COUNT(*)::int AS scan_count,
        SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END)::int AS critical_count,
        SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END)::int AS high_count,
        SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END)::int AS medium_count,
        SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END)::int AS low_count
      FROM security_scans
      WHERE created_at::date = CURRENT_DATE
    `);

    const s = stats.rows[0];
    const vulnTotal = (s.critical_count || 0) + (s.high_count || 0) + (s.medium_count || 0) + (s.low_count || 0);

    // Posture score: 100 - (weighted penalty); critical = 20pts, high = 10pts, etc.
    const penalty = (s.critical_count || 0) * 20 + (s.high_count || 0) * 10 + (s.medium_count || 0) * 4 + (s.low_count || 0) * 1;
    const postureScore = Math.max(0, Math.min(100, 100 - penalty));

    // Industry benchmark (heuristic - could be configurable)
    const industryBenchmark = 75;
    const rankingPct = ((postureScore - industryBenchmark) / industryBenchmark) * 100;

    const result = await query(`
      INSERT INTO security_posture (repository, scan_date, vulnerability_count, critical_count, high_count, medium_count, low_count, posture_score, industry_benchmark, ranking_pct)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (repository, scan_date) DO UPDATE
        SET vulnerability_count = EXCLUDED.vulnerability_count,
            critical_count = EXCLUDED.critical_count,
            high_count = EXCLUDED.high_count,
            medium_count = EXCLUDED.medium_count,
            low_count = EXCLUDED.low_count,
            posture_score = EXCLUDED.posture_score,
            industry_benchmark = EXCLUDED.industry_benchmark,
            ranking_pct = EXCLUDED.ranking_pct
      RETURNING *
    `, [repository, vulnTotal, s.critical_count || 0, s.high_count || 0, s.medium_count || 0, s.low_count || 0, postureScore, industryBenchmark, rankingPct]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Security posture compute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Trend across time
router.get('/trend', async (req, res) => {
  try {
    const { repository = 'global', days = 30 } = req.query;
    const result = await query(`
      SELECT * FROM security_posture
      WHERE repository = $1 AND scan_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY scan_date ASC
    `, [repository]);
    res.json({ repository, days: parseInt(days), trend: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Repo ranking by latest posture score
router.get('/ranking', async (req, res) => {
  try {
    const result = await query(`
      WITH latest AS (
        SELECT DISTINCT ON (repository) *
        FROM security_posture
        ORDER BY repository, scan_date DESC
      )
      SELECT
        repository,
        posture_score,
        vulnerability_count,
        critical_count,
        high_count,
        ranking_pct,
        scan_date,
        ROW_NUMBER() OVER (ORDER BY posture_score DESC) AS rank
      FROM latest
      ORDER BY posture_score DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 30));
    const offset = (page - 1) * limit;
    const { repository } = req.query;

    const conditions = [];
    const params = [];
    if (repository) { conditions.push(`repository = $${params.length + 1}`); params.push(repository); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(`SELECT * FROM security_posture ${where} ORDER BY scan_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
      query(`SELECT COUNT(*)::int AS total FROM security_posture ${where}`, params),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI-driven posture summary (rate-limited)
router.post('/summary', aiRateLimiter, async (req, res) => {
  try {
    const { repository = 'global' } = req.body;
    const trend = await query(`
      SELECT * FROM security_posture WHERE repository = $1 ORDER BY scan_date DESC LIMIT 14
    `, [repository]);

    if (!trend.rows.length) return res.status(404).json({ error: 'No posture data for repository' });

    const systemPrompt = 'You are a security posture analyst. Always respond with valid JSON only.';
    const prompt = `Analyze the security posture trend for the repository. Respond ONLY with valid JSON:
{
  "executive_summary": "brief",
  "current_grade": "A|B|C|D|F",
  "trend_direction": "improving|stable|declining",
  "top_risks": ["risk 1"],
  "recommended_actions": ["action 1"],
  "compared_to_industry": "above_average|average|below_average"
}

Trend Data:
${JSON.stringify(trend.rows, null, 2).slice(0, 3000)}`;

    const aiRes = await callOpenRouter(prompt, systemPrompt);
    if (!aiRes.success) return res.status(502).json({ error: aiRes.error });
    const parsed = parseAIJson(aiRes.content);

    if (parsed.data && trend.rows[0]) {
      await query(`
        UPDATE security_posture SET ai_results = $1 WHERE id = $2
      `, [JSON.stringify(parsed.data), trend.rows[0].id]);
    }

    res.json({ repository, summary: parsed.data, raw: aiRes.content });
  } catch (err) {
    console.error('Security posture summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
