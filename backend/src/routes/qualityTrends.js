// NEW: Code Quality Trend Tracker
// Stores per-day quality snapshots; computes trajectory, regression detection, alerts.

import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// List quality snapshots (paginated, filtered)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 30));
    const offset = (page - 1) * limit;
    const { repository, team_id, days } = req.query;

    const conditions = [];
    const params = [];
    if (repository) { conditions.push(`repository = $${params.length + 1}`); params.push(repository); }
    if (team_id) { conditions.push(`team_id = $${params.length + 1}`); params.push(parseInt(team_id)); }
    if (days) { conditions.push(`snapshot_date >= NOW() - INTERVAL '${parseInt(days)} days'`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(`SELECT * FROM quality_snapshots ${where} ORDER BY snapshot_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
      query(`SELECT COUNT(*)::int AS total FROM quality_snapshots ${where}`, params),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compute today's snapshot from existing review_issues data
router.post('/compute', async (req, res) => {
  try {
    const { repository = 'global', team_id = null } = req.body;

    const stats = await query(`
      SELECT
        COUNT(DISTINCT cr.id)::int AS reviews_count,
        COUNT(ri.id)::int AS total_issues,
        COUNT(*) FILTER (WHERE ri.severity = 'critical')::int AS critical_count,
        COUNT(*) FILTER (WHERE ri.severity = 'high')::int AS high_count,
        COUNT(*) FILTER (WHERE ri.severity = 'medium')::int AS medium_count,
        COUNT(*) FILTER (WHERE ri.severity = 'low')::int AS low_count,
        ROUND(AVG(cr.severity_score)::numeric, 2) AS avg_severity
      FROM code_reviews cr
      LEFT JOIN review_issues ri ON ri.review_id = cr.id
      WHERE cr.created_at::date = CURRENT_DATE
    `);

    const s = stats.rows[0];
    const result = await query(`
      INSERT INTO quality_snapshots (repository, team_id, snapshot_date, avg_severity, total_issues, critical_count, high_count, medium_count, low_count, reviews_count)
      VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (repository, team_id, snapshot_date) DO UPDATE
        SET avg_severity = EXCLUDED.avg_severity,
            total_issues = EXCLUDED.total_issues,
            critical_count = EXCLUDED.critical_count,
            high_count = EXCLUDED.high_count,
            medium_count = EXCLUDED.medium_count,
            low_count = EXCLUDED.low_count,
            reviews_count = EXCLUDED.reviews_count
      RETURNING *
    `, [repository, team_id, s.avg_severity, s.total_issues, s.critical_count, s.high_count, s.medium_count, s.low_count, s.reviews_count]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Quality snapshot compute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Trajectory: day-over-day quality movement, with regression detection
router.get('/trajectory', async (req, res) => {
  try {
    const { repository = 'global', days = 30 } = req.query;
    const lookback = Math.min(365, parseInt(days));

    const snapshots = await query(`
      SELECT snapshot_date, avg_severity, total_issues, critical_count, high_count, reviews_count
      FROM quality_snapshots
      WHERE repository = $1 AND snapshot_date >= CURRENT_DATE - INTERVAL '${lookback} days'
      ORDER BY snapshot_date ASC
    `, [repository]);

    if (!snapshots.rows.length) {
      return res.json({ repository, days: lookback, snapshots: [], regressions: [], current_trend: 'no_data' });
    }

    // Detect regressions: 3-day moving average of avg_severity increased by >20%
    const regressions = [];
    const rows = snapshots.rows;
    for (let i = 5; i < rows.length; i++) {
      const recentAvg = (parseFloat(rows[i].avg_severity || 0) + parseFloat(rows[i - 1].avg_severity || 0) + parseFloat(rows[i - 2].avg_severity || 0)) / 3;
      const prevAvg = (parseFloat(rows[i - 3].avg_severity || 0) + parseFloat(rows[i - 4].avg_severity || 0) + parseFloat(rows[i - 5].avg_severity || 0)) / 3;
      if (prevAvg > 0 && (recentAvg - prevAvg) / prevAvg > 0.2) {
        regressions.push({
          date: rows[i].snapshot_date,
          previous_avg_severity: prevAvg.toFixed(2),
          current_avg_severity: recentAvg.toFixed(2),
          delta_pct: (((recentAvg - prevAvg) / prevAvg) * 100).toFixed(1),
        });
      }
    }

    // Current trend
    const last = rows[rows.length - 1];
    const first = rows[0];
    const trendDirection = (last.avg_severity || 0) > (first.avg_severity || 0) * 1.05 ? 'declining'
      : (last.avg_severity || 0) < (first.avg_severity || 0) * 0.95 ? 'improving'
      : 'stable';

    res.json({
      repository,
      days: lookback,
      snapshots: rows,
      regressions,
      current_trend: trendDirection,
      first_date: first.snapshot_date,
      last_date: last.snapshot_date,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alerts list (regressions detected today)
router.get('/alerts', async (req, res) => {
  try {
    const result = await query(`
      WITH recent AS (
        SELECT
          repository,
          snapshot_date,
          avg_severity,
          AVG(avg_severity) OVER (PARTITION BY repository ORDER BY snapshot_date ROWS BETWEEN 6 PRECEDING AND 1 PRECEDING) AS prev_avg
        FROM quality_snapshots
        WHERE snapshot_date >= CURRENT_DATE - INTERVAL '14 days'
      )
      SELECT repository, snapshot_date, avg_severity, prev_avg,
        ROUND(((avg_severity - prev_avg) / NULLIF(prev_avg, 0) * 100)::numeric, 1) AS delta_pct
      FROM recent
      WHERE prev_avg IS NOT NULL
        AND (avg_severity - prev_avg) / NULLIF(prev_avg, 0) > 0.2
      ORDER BY snapshot_date DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
