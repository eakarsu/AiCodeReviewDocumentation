// NEW: Team Coding Standards Enforcer
// Define team standards, run AI compliance checks against code reviews.

import express from 'express';
import { query } from '../config/database.js';
import { callOpenRouter } from '../services/openRouterService.js';
import { parseAIJson } from '../utils/parseAIJson.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { team_id, language } = req.query;

    const conditions = [];
    const params = [];
    if (team_id) { conditions.push(`team_id = $${params.length + 1}`); params.push(parseInt(team_id)); }
    if (language) { conditions.push(`language = $${params.length + 1}`); params.push(language); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(`SELECT ts.*, t.name AS team_name FROM team_standards ts LEFT JOIN teams t ON ts.team_id = t.id ${where} ORDER BY ts.team_id, ts.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
      query(`SELECT COUNT(*)::int AS total FROM team_standards ${where}`, params),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { team_id, language, standard_type, rule_text, enforcement_level } = req.body;
    if (!team_id || !rule_text) return res.status(400).json({ error: 'team_id and rule_text are required' });

    const result = await query(`
      INSERT INTO team_standards (team_id, language, standard_type, rule_text, enforcement_level)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [team_id, language, standard_type || 'naming', rule_text, enforcement_level || 'warning']);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rule_text, enforcement_level, language, standard_type } = req.body;
    const result = await query(`
      UPDATE team_standards SET rule_text = COALESCE($1, rule_text), enforcement_level = COALESCE($2, enforcement_level), language = COALESCE($3, language), standard_type = COALESCE($4, standard_type), updated_at = NOW()
      WHERE id = $5 RETURNING *
    `, [rule_text, enforcement_level, language, standard_type, parseInt(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ error: 'Standard not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(`DELETE FROM team_standards WHERE id = $1 RETURNING id`, [parseInt(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ error: 'Standard not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI-Learn standards from a team's recent merged PRs (rate-limited)
router.post('/learn/:team_id', aiRateLimiter, async (req, res) => {
  try {
    const teamId = parseInt(req.params.team_id);
    const { code_samples = [], language } = req.body;
    if (!Array.isArray(code_samples) || code_samples.length === 0) {
      return res.status(400).json({ error: 'code_samples array required' });
    }

    const systemPrompt = 'You are a senior coding standards expert. Always respond with valid JSON only.';
    const prompt = `Analyze these merged-PR code samples to infer the team's coding standards. Respond ONLY with valid JSON:
{
  "inferred_standards": [
    {"rule": "rule text", "category": "naming|formatting|structure|imports|comments", "enforcement": "warning|error|info"}
  ],
  "summary": "brief"
}

Language: ${language || 'auto'}
Samples:
${code_samples.slice(0, 5).map((s, i) => `Sample ${i+1}:\n\`\`\`\n${s.slice(0, 1500)}\n\`\`\``).join('\n\n')}`;

    const aiRes = await callOpenRouter(prompt, systemPrompt);
    if (!aiRes.success) return res.status(502).json({ error: aiRes.error });
    const parsed = parseAIJson(aiRes.content);

    const learned = parsed.data?.inferred_standards || [];
    let inserted = 0;
    for (const std of learned) {
      try {
        await query(`
          INSERT INTO team_standards (team_id, language, standard_type, rule_text, enforcement_level, ai_results)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [teamId, language, std.category || 'naming', std.rule, std.enforcement || 'warning', JSON.stringify(std)]);
        inserted++;
      } catch (e) { /* skip dupes */ }
    }

    res.json({ team_id: teamId, learned: learned.length, inserted, summary: parsed.data?.summary, raw: aiRes.content });
  } catch (err) {
    console.error('Standards learn error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Run standards compliance check against a review (rate-limited)
router.post('/check/:review_id', aiRateLimiter, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.review_id);
    const { team_id } = req.body;
    if (!team_id) return res.status(400).json({ error: 'team_id is required' });

    const review = await query(`SELECT * FROM code_reviews WHERE id = $1`, [reviewId]);
    if (!review.rows.length) return res.status(404).json({ error: 'Review not found' });

    const standards = await query(`
      SELECT * FROM team_standards
      WHERE team_id = $1 AND (language = $2 OR language IS NULL)
    `, [team_id, review.rows[0].language]);

    if (!standards.rows.length) return res.status(404).json({ error: 'No standards defined for this team/language' });

    const systemPrompt = 'You are a coding standards enforcement bot. Always respond with valid JSON only.';
    const prompt = `Check the code below against the team standards listed. Respond ONLY with valid JSON:
{
  "violations_count": 3,
  "compliance_pct": 85,
  "violations": [{"rule": "rule text", "line_hint": "near line X", "severity": "low|medium|high", "fix_suggestion": "how to fix"}],
  "compliant_practices": ["practice 1"]
}

Standards:
${standards.rows.map((s, i) => `${i+1}. [${s.standard_type}/${s.enforcement_level}] ${s.rule_text}`).join('\n')}

Code:
\`\`\`${review.rows[0].language}
${review.rows[0].code_snippet}
\`\`\``;

    const aiRes = await callOpenRouter(prompt, systemPrompt);
    if (!aiRes.success) return res.status(502).json({ error: aiRes.error });
    const parsed = parseAIJson(aiRes.content);

    await query(`
      INSERT INTO standards_compliance (team_id, review_id, violations_count, compliance_pct, ai_results)
      VALUES ($1,$2,$3,$4,$5)
    `, [team_id, reviewId, parsed.data?.violations_count || 0, parsed.data?.compliance_pct || 100, JSON.stringify(parsed.data || {})]);

    res.json({ review_id: reviewId, team_id, parsed: parsed.data, raw: aiRes.content });
  } catch (err) {
    console.error('Standards check error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/compliance/:team_id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.team_id);
    const result = await query(`
      SELECT
        COUNT(*)::int AS total_checks,
        ROUND(AVG(compliance_pct)::numeric, 2) AS avg_compliance,
        SUM(violations_count)::int AS total_violations,
        COUNT(*) FILTER (WHERE compliance_pct >= 90)::int AS high_compliance_reviews,
        COUNT(*) FILTER (WHERE compliance_pct < 50)::int AS low_compliance_reviews
      FROM standards_compliance
      WHERE team_id = $1
    `, [teamId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
