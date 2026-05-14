// NEW: Issue Remediation Bot
// Learns issue->fix patterns; suggests automated fixes for known issues.

import express from 'express';
import { query } from '../config/database.js';
import { callOpenRouter } from '../services/openRouterService.js';
import { parseAIJson } from '../utils/parseAIJson.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// List remediation patterns (paginated)
router.get('/patterns', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { category, language } = req.query;

    const conditions = [];
    const params = [];
    if (category) { conditions.push(`category = $${params.length + 1}`); params.push(category); }
    if (language) { conditions.push(`language = $${params.length + 1}`); params.push(language); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(`SELECT * FROM remediation_patterns ${where} ORDER BY applied_count DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
      query(`SELECT COUNT(*)::int AS total FROM remediation_patterns ${where}`, params),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or upsert a remediation pattern
router.post('/patterns', async (req, res) => {
  try {
    const { issue_signature, category, severity, language, fix_template, example_before, example_after } = req.body;
    if (!issue_signature) return res.status(400).json({ error: 'issue_signature is required' });

    const result = await query(`
      INSERT INTO remediation_patterns (issue_signature, category, severity, language, fix_template, example_before, example_after)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [issue_signature, category, severity, language, fix_template, example_before, example_after]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/patterns/:id', async (req, res) => {
  try {
    const result = await query(`DELETE FROM remediation_patterns WHERE id = $1 RETURNING id`, [parseInt(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ error: 'Pattern not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suggest an AI fix for an existing issue (rate-limited)
router.post('/suggest/:issueId', aiRateLimiter, async (req, res) => {
  try {
    const issueId = parseInt(req.params.issueId);
    const issueResult = await query(`
      SELECT ri.*, cr.code_snippet, cr.language
      FROM review_issues ri
      JOIN code_reviews cr ON ri.review_id = cr.id
      WHERE ri.id = $1
    `, [issueId]);
    if (!issueResult.rows.length) return res.status(404).json({ error: 'Issue not found' });
    const issue = issueResult.rows[0];

    // Look for an existing pattern match
    const patternMatch = await query(`
      SELECT * FROM remediation_patterns
      WHERE LOWER(issue_signature) LIKE LOWER($1)
        AND (language = $2 OR language IS NULL)
      ORDER BY applied_count DESC LIMIT 1
    `, [`%${(issue.title || '').slice(0, 60)}%`, issue.language]);

    let patternId = null;
    let suggestedFix = null;
    let confidence = 50;

    if (patternMatch.rows.length) {
      patternId = patternMatch.rows[0].id;
      suggestedFix = patternMatch.rows[0].fix_template;
      confidence = 80;
    } else {
      // Use AI to generate a fix
      const systemPrompt = 'You are a senior code-fix expert. Always respond with valid JSON only.';
      const prompt = `Generate a fix for this code issue. Respond ONLY with valid JSON:
{
  "suggested_fix": "the fix as code",
  "explanation": "why",
  "confidence_pct": 80,
  "applies_to_pattern": "issue signature pattern"
}

Language: ${issue.language}
Issue Category: ${issue.category}
Issue Severity: ${issue.severity}
Issue Title: ${issue.title}
Issue Description: ${issue.description}
Affected Code (snippet):
\`\`\`${issue.language}
${(issue.code_snippet || '').slice(0, 2000)}
\`\`\``;

      const aiRes = await callOpenRouter(prompt, systemPrompt);
      if (!aiRes.success) return res.status(502).json({ error: aiRes.error });
      const parsed = parseAIJson(aiRes.content);
      suggestedFix = parsed.data?.suggested_fix || aiRes.content;
      confidence = parsed.data?.confidence_pct || 60;

      // Persist as a new pattern (learning)
      if (parsed.data?.applies_to_pattern) {
        const pat = await query(`
          INSERT INTO remediation_patterns (issue_signature, category, severity, language, fix_template, ai_results)
          VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
        `, [parsed.data.applies_to_pattern, issue.category, issue.severity, issue.language, suggestedFix, JSON.stringify(parsed.data)]).catch(() => null);
        if (pat) patternId = pat.rows[0].id;
      }
    }

    const suggestion = await query(`
      INSERT INTO remediation_suggestions (issue_id, pattern_id, suggested_fix, confidence_pct)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [issueId, patternId, suggestedFix, confidence]);

    res.json({
      suggestion: suggestion.rows[0],
      from_pattern: !!patternMatch.rows.length,
      pattern_id: patternId,
    });
  } catch (err) {
    console.error('Remediation suggest error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark suggestion as applied (records a learning event)
router.post('/suggestions/:id/apply', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query(`
      UPDATE remediation_suggestions SET applied = TRUE, applied_at = NOW() WHERE id = $1 RETURNING *
    `, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Suggestion not found' });

    // Update pattern stats
    if (result.rows[0].pattern_id) {
      await query(`
        UPDATE remediation_patterns
        SET applied_count = applied_count + 1, updated_at = NOW()
        WHERE id = $1
      `, [result.rows[0].pattern_id]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [data, count] = await Promise.all([
      query(`SELECT rs.*, ri.title AS issue_title, ri.severity FROM remediation_suggestions rs LEFT JOIN review_issues ri ON rs.issue_id = ri.id ORDER BY rs.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      query(`SELECT COUNT(*)::int AS total FROM remediation_suggestions`),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
