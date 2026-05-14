// NEW: Cross-Repo Dependency Analyzer
// Index dependencies across repos, detect version conflicts, suggest unified updates.

import express from 'express';
import { query } from '../config/database.js';
import { callOpenRouter } from '../services/openRouterService.js';
import { parseAIJson } from '../utils/parseAIJson.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Index a repo's dependencies (replaces existing entries for that repo+ecosystem)
router.post('/index', async (req, res) => {
  try {
    const { repository, ecosystem, dependencies } = req.body;
    if (!repository || !ecosystem || !Array.isArray(dependencies)) {
      return res.status(400).json({ error: 'repository, ecosystem, dependencies (array) required' });
    }

    // Clear out old entries for this repo/ecosystem
    await query(`DELETE FROM repo_dependencies WHERE repository = $1 AND ecosystem = $2`, [repository, ecosystem]);

    let inserted = 0;
    for (const dep of dependencies) {
      if (!dep.package_name) continue;
      try {
        await query(`
          INSERT INTO repo_dependencies (repository, package_name, version, ecosystem, is_dev)
          VALUES ($1, $2, $3, $4, $5)
        `, [repository, dep.package_name, dep.version || null, ecosystem, !!dep.is_dev]);
        inserted++;
      } catch (e) { /* skip dupes */ }
    }

    res.status(201).json({ repository, ecosystem, indexed: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all indexed repos
router.get('/repos', async (req, res) => {
  try {
    const result = await query(`
      SELECT repository, ecosystem, COUNT(*)::int AS dependency_count, MAX(scanned_at) AS last_scanned
      FROM repo_dependencies
      GROUP BY repository, ecosystem
      ORDER BY repository
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Find conflicts: same package, different versions across repos
router.post('/scan-conflicts', async (req, res) => {
  try {
    const result = await query(`
      SELECT package_name, ecosystem,
        COUNT(DISTINCT version)::int AS version_count,
        COUNT(DISTINCT repository)::int AS repo_count,
        json_agg(DISTINCT version) AS versions,
        json_agg(DISTINCT repository) AS affected_repos
      FROM repo_dependencies
      WHERE version IS NOT NULL
      GROUP BY package_name, ecosystem
      HAVING COUNT(DISTINCT version) > 1 AND COUNT(DISTINCT repository) > 1
      ORDER BY version_count DESC, repo_count DESC
      LIMIT 100
    `);

    let inserted = 0;
    for (const row of result.rows) {
      // Latest version is the recommended (lexicographic max as a simple heuristic)
      const versions = row.versions.filter(v => v).sort();
      const recommended = versions[versions.length - 1];

      try {
        await query(`
          INSERT INTO dependency_conflicts (package_name, ecosystem, conflict_type, affected_repos, versions, recommended_version)
          VALUES ($1, $2, 'version_mismatch', $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [row.package_name, row.ecosystem, JSON.stringify(row.affected_repos), JSON.stringify(versions), recommended]);
        inserted++;
      } catch (e) { /* skip */ }
    }

    res.json({ conflicts_found: result.rows.length, conflicts_recorded: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List conflicts (paginated)
router.get('/conflicts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const offset = (page - 1) * limit;
    const { status } = req.query;

    const conditions = [];
    const params = [];
    if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(`SELECT * FROM dependency_conflicts ${where} ORDER BY detected_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
      query(`SELECT COUNT(*)::int AS total FROM dependency_conflicts ${where}`, params),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI-driven unified update suggestion (rate-limited)
router.post('/conflicts/:id/suggest-update', aiRateLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const conflict = await query(`SELECT * FROM dependency_conflicts WHERE id = $1`, [id]);
    if (!conflict.rows.length) return res.status(404).json({ error: 'Conflict not found' });
    const c = conflict.rows[0];

    const systemPrompt = 'You are a dependency-management expert. Always respond with valid JSON only.';
    const prompt = `Recommend a unified update plan for this version conflict. Respond ONLY with valid JSON:
{
  "recommended_version": "x.y.z",
  "rationale": "brief",
  "breaking_changes_likely": true,
  "update_order": ["repo a", "repo b"],
  "migration_steps": ["step 1"],
  "risk_level": "low|medium|high"
}

Package: ${c.package_name} (${c.ecosystem})
Currently in use:
${JSON.stringify(c.versions)}
Affected repositories:
${JSON.stringify(c.affected_repos)}`;

    const aiRes = await callOpenRouter(prompt, systemPrompt);
    if (!aiRes.success) return res.status(502).json({ error: aiRes.error });
    const parsed = parseAIJson(aiRes.content);

    await query(`
      UPDATE dependency_conflicts
      SET recommended_version = COALESCE($1, recommended_version), ai_results = $2
      WHERE id = $3
    `, [parsed.data?.recommended_version, JSON.stringify(parsed.data || {}), id]);

    res.json({ conflict_id: id, suggestion: parsed.data, raw: aiRes.content });
  } catch (err) {
    console.error('Cross-repo suggest error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/conflicts/:id/resolve', async (req, res) => {
  try {
    const result = await query(`
      UPDATE dependency_conflicts SET status = 'resolved', resolved_at = NOW() WHERE id = $1 RETURNING *
    `, [parseInt(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ error: 'Conflict not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
