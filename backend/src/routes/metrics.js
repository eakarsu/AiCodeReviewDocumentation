import express from 'express';
import {
  getDashboardStats,
  getReviewTrends,
  getIssuesByCategory,
  getIssuesBySeverity,
  getTopLanguages,
  getRecentActivity,
  getAssignmentStats,
  getWeeklyComparison
} from '../services/metricsService.js';

const router = express.Router();

// Get dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const [stats, weekly, assignments] = await Promise.all([
      getDashboardStats(),
      getWeeklyComparison(),
      getAssignmentStats()
    ]);

    res.json({
      ...stats,
      weekly_comparison: weekly,
      assignments: assignments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get review trends over time
router.get('/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = await getReviewTrends(days);
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get issues breakdown by category
router.get('/categories', async (req, res) => {
  try {
    const categories = await getIssuesByCategory();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get issues breakdown by severity
router.get('/severity', async (req, res) => {
  try {
    const severity = await getIssuesBySeverity();
    res.json(severity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top languages
router.get('/languages', async (req, res) => {
  try {
    const languages = await getTopLanguages();
    res.json(languages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent activity feed
router.get('/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activity = await getRecentActivity(limit);
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get full analytics report
router.get('/report', async (req, res) => {
  try {
    const [
      dashboard,
      trends,
      categories,
      severity,
      languages,
      activity
    ] = await Promise.all([
      getDashboardStats(),
      getReviewTrends(30),
      getIssuesByCategory(),
      getIssuesBySeverity(),
      getTopLanguages(),
      getRecentActivity(10)
    ]);

    res.json({
      dashboard,
      trends,
      issues: {
        by_category: categories,
        by_severity: severity
      },
      languages,
      recent_activity: activity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
