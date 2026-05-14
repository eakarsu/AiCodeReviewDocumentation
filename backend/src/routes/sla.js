// NEW: Code Review SLA Tracker
// Track turnaround per reviewer, AI-predicted ETA, escalate stale reviews, leaderboard.

import express from 'express';
import { query } from '../config/database.js';
import { callOpenRouter } from '../services/openRouterService.js';
import { parseAIJson } from '../utils/parseAIJson.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Record an SLA event when an assignment is created or completed
router.post('/record', async (req, res) => {
  try {
    const { assignment_id, reviewer, due_date, completed_at, ai_predicted_hours } = req.body;
    if (!assignment_id) return res.status(400).json({ error: 'assignment_id is required' });

    let turnaround_hours = null;
    let was_on_time = null;
    if (completed_at && due_date) {
      turnaround_hours = (new Date(completed_at) - new Date(due_date)) / 3600000;
      // Compare completed_at to due_date: on time if completed before due
      was_on_time = new Date(completed_at) <= new Date(due_date);
    }

    const result = await query(`
      INSERT INTO review_sla_records (assignment_id, reviewer, due_date, completed_at, turnaround_hours, was_on_time, ai_predicted_hours)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [assignment_id, reviewer, due_date, completed_at, turnaround_hours, was_on_time, ai_predicted_hours]);

    // Update reviewer leaderboard
    if (reviewer && completed_at) {
      await query(`
        INSERT INTO reviewer_leaderboard (reviewer, reviews_completed, on_time_count, avg_turnaround_hours, total_score, updated_at)
        VALUES ($1, 1, $2, $3, $4, NOW())
        ON CONFLICT (reviewer) DO UPDATE
          SET reviews_completed = reviewer_leaderboard.reviews_completed + 1,
              on_time_count = reviewer_leaderboard.on_time_count + $2,
              avg_turnaround_hours = (
                (COALESCE(reviewer_leaderboard.avg_turnaround_hours, 0) * reviewer_leaderboard.reviews_completed + COALESCE($3, 0))
                / (reviewer_leaderboard.reviews_completed + 1)
              ),
              total_score = reviewer_leaderboard.total_score + $4,
              updated_at = NOW()
      `, [
        reviewer,
        was_on_time ? 1 : 0,
        turnaround_hours,
        was_on_time ? 10 : 5,
      ]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('SLA record error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI-predict turnaround for a new review (rate-limited)
router.post('/predict/:assignment_id', aiRateLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.assignment_id);
    const assignment = await query(`
      SELECT ra.*, cr.title, cr.code_snippet, cr.language
      FROM review_assignments ra
      LEFT JOIN code_reviews cr ON ra.review_id = cr.id
      WHERE ra.id = $1
    `, [id]);
    if (!assignment.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    const a = assignment.rows[0];

    // Reviewer history
    const history = await query(`
      SELECT AVG(turnaround_hours) AS avg_hours, COUNT(*)::int AS total
      FROM review_sla_records WHERE reviewer = $1
    `, [a.assigned_to]).catch(() => ({ rows: [{ avg_hours: null, total: 0 }] }));

    const systemPrompt = 'You are a code review SLA predictor. Always respond with valid JSON only.';
    const prompt = `Predict turnaround time. Respond ONLY with valid JSON:
{
  "predicted_hours": 12,
  "confidence_pct": 70,
  "rationale": "brief",
  "risk_factors": ["factor 1"]
}

Reviewer: ${a.assigned_to}
Reviewer History: ${history.rows[0].total} past reviews, avg ${history.rows[0].avg_hours || 'N/A'}h
Priority: ${a.priority}
Language: ${a.language}
Code Length: ${(a.code_snippet || '').length} chars`;

    const aiRes = await callOpenRouter(prompt, systemPrompt);
    if (!aiRes.success) return res.status(502).json({ error: aiRes.error });
    const parsed = parseAIJson(aiRes.content);

    res.json({
      assignment_id: id,
      predicted_hours: parsed.data?.predicted_hours,
      confidence_pct: parsed.data?.confidence_pct,
      rationale: parsed.data?.rationale,
      risk_factors: parsed.data?.risk_factors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detect stale assignments and mark them for escalation
router.post('/escalate-stale', async (req, res) => {
  try {
    const result = await query(`
      WITH stale AS (
        SELECT ra.id AS assignment_id, ra.assigned_to AS reviewer, ra.due_date
        FROM review_assignments ra
        WHERE ra.status = 'pending'
          AND ra.due_date IS NOT NULL
          AND ra.due_date < NOW() - INTERVAL '4 hours'
      )
      INSERT INTO review_sla_records (assignment_id, reviewer, due_date, was_escalated, escalated_at)
      SELECT s.assignment_id, s.reviewer, s.due_date, true, NOW()
      FROM stale s
      WHERE NOT EXISTS (
        SELECT 1 FROM review_sla_records rsr WHERE rsr.assignment_id = s.assignment_id AND rsr.was_escalated = true
      )
      RETURNING *
    `);

    res.json({ escalated: result.rows.length, records: result.rows });
  } catch (err) {
    console.error('Escalate stale error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        reviewer,
        reviews_completed,
        on_time_count,
        ROUND(avg_turnaround_hours::numeric, 2) AS avg_turnaround_hours,
        total_score,
        CASE
          WHEN reviews_completed >= 50 AND on_time_count::float / reviews_completed > 0.9 THEN 'gold'
          WHEN reviews_completed >= 20 AND on_time_count::float / reviews_completed > 0.8 THEN 'silver'
          WHEN reviews_completed >= 5 THEN 'bronze'
          ELSE 'rookie'
        END AS badge,
        ROW_NUMBER() OVER (ORDER BY total_score DESC) AS rank
      FROM reviewer_leaderboard
      ORDER BY total_score DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const offset = (page - 1) * limit;

    const [data, count] = await Promise.all([
      query(`SELECT * FROM review_sla_records ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      query(`SELECT COUNT(*)::int AS total FROM review_sla_records`),
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
