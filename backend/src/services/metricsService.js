// Metrics Service - Aggregation and analytics logic
import { query } from '../config/database.js';

// Get dashboard summary stats
export const getDashboardStats = async () => {
  const result = await query(`
    SELECT
      (SELECT COUNT(*) FROM code_reviews) as total_reviews,
      (SELECT COUNT(*) FROM code_reviews WHERE status = 'completed') as completed_reviews,
      (SELECT COUNT(*) FROM code_reviews WHERE status = 'pending') as pending_reviews,
      (SELECT COALESCE(AVG(severity_score), 0) FROM code_reviews WHERE severity_score IS NOT NULL) as avg_severity,
      (SELECT COALESCE(SUM(issues_count), 0) FROM code_reviews) as total_issues,
      (SELECT COUNT(*) FROM pull_requests) as total_prs,
      (SELECT COUNT(*) FROM teams) as total_teams,
      (SELECT COUNT(*) FROM review_assignments WHERE status = 'pending') as pending_assignments,
      (SELECT COUNT(*) FROM webhooks WHERE status = 'active') as active_webhooks
  `);

  return result.rows[0];
};

// Get review trends over time
export const getReviewTrends = async (days = 30) => {
  const result = await query(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COALESCE(AVG(severity_score), 0) as avg_severity,
      COALESCE(SUM(issues_count), 0) as issues
    FROM code_reviews
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  return result.rows;
};

// Get issues by category
export const getIssuesByCategory = async () => {
  const result = await query(`
    SELECT category, COUNT(*) as count
    FROM review_issues
    GROUP BY category
    ORDER BY count DESC
  `);

  return result.rows;
};

// Get issues by severity
export const getIssuesBySeverity = async () => {
  const result = await query(`
    SELECT severity, COUNT(*) as count
    FROM review_issues
    GROUP BY severity
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        WHEN 'info' THEN 5
      END
  `);

  return result.rows;
};

// Get top languages
export const getTopLanguages = async () => {
  const result = await query(`
    SELECT language, COUNT(*) as count
    FROM code_reviews
    WHERE language IS NOT NULL AND language != ''
    GROUP BY language
    ORDER BY count DESC
    LIMIT 10
  `);

  return result.rows;
};

// Get recent activity
export const getRecentActivity = async (limit = 20) => {
  const result = await query(`
    (
      SELECT
        'review' as type,
        id,
        title,
        status,
        severity_score,
        created_at
      FROM code_reviews
      ORDER BY created_at DESC
      LIMIT $1
    )
    UNION ALL
    (
      SELECT
        'pull_request' as type,
        id,
        title,
        state as status,
        NULL as severity_score,
        created_at
      FROM pull_requests
      ORDER BY created_at DESC
      LIMIT $1
    )
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows;
};

// Get assignment stats
export const getAssignmentStats = async () => {
  const result = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
    FROM review_assignments
  `);

  return result.rows[0];
};

// Get weekly comparison
export const getWeeklyComparison = async () => {
  const result = await query(`
    SELECT
      (SELECT COUNT(*) FROM code_reviews WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as this_week,
      (SELECT COUNT(*) FROM code_reviews WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days') as last_week,
      (SELECT COALESCE(AVG(severity_score), 0) FROM code_reviews WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND severity_score IS NOT NULL) as avg_severity_this_week,
      (SELECT COALESCE(AVG(severity_score), 0) FROM code_reviews WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days' AND severity_score IS NOT NULL) as avg_severity_last_week
  `);

  return result.rows[0];
};

export default {
  getDashboardStats,
  getReviewTrends,
  getIssuesByCategory,
  getIssuesBySeverity,
  getTopLanguages,
  getRecentActivity,
  getAssignmentStats,
  getWeeklyComparison
};
