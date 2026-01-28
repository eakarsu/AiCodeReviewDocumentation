import express from 'express';
import { CodeReview, ReviewIssue } from '../models/index.js';
import { aiCodeReview, aiCodeReviewStructured } from '../services/openRouterService.js';
import { parseIssuesFromAI, calculateOverallSeverity } from '../services/severityService.js';
import { query } from '../config/database.js';

const router = express.Router();

// Get all code reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await CodeReview.findAll();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await CodeReview.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single code review
router.get('/:id', async (req, res) => {
  try {
    const review = await CodeReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Code review not found' });
    }
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new code review
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language } = req.body;
    const review = await CodeReview.create({
      title,
      description,
      code_snippet,
      language,
      status: 'pending'
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI review
router.post('/:id/analyze', async (req, res) => {
  try {
    const review = await CodeReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Code review not found' });
    }

    const result = await aiCodeReview(review.code_snippet, review.language);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await CodeReview.update(req.params.id, {
      review_result: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update code review
router.put('/:id', async (req, res) => {
  try {
    const updated = await CodeReview.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Code review not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete code review
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CodeReview.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Code review not found' });
    }
    res.json({ message: 'Code review deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI review with structured severity scoring
router.post('/:id/analyze-structured', async (req, res) => {
  try {
    const review = await CodeReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Code review not found' });
    }

    const result = await aiCodeReviewStructured(review.code_snippet, review.language);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse issues from AI response
    const issues = parseIssuesFromAI(result.content);
    const severityScore = calculateOverallSeverity(issues);

    // Save issues to database
    for (const issue of issues) {
      await ReviewIssue.create({
        review_id: parseInt(req.params.id),
        category: issue.category,
        severity: issue.severity,
        severity_score: issue.severity_score,
        title: issue.title,
        description: issue.description,
        line_number: issue.line_number,
        suggestion: issue.suggestion
      });
    }

    // Update review with severity score and issues data
    const updated = await CodeReview.update(req.params.id, {
      review_result: result.content,
      severity_score: severityScore,
      issues_count: issues.length,
      issues_data: JSON.stringify(issues),
      status: 'completed'
    });

    res.json({ ...updated, parsed_issues: issues });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get issues for a code review
router.get('/:id/issues', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM review_issues WHERE review_id = $1 ORDER BY severity_score DESC, created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an issue (mark as fixed)
router.patch('/:reviewId/issues/:issueId', async (req, res) => {
  try {
    const { fixed } = req.body;
    const result = await query(
      'UPDATE review_issues SET fixed = $1 WHERE id = $2 AND review_id = $3 RETURNING *',
      [fixed, req.params.issueId, req.params.reviewId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get severity statistics
router.get('/stats/severity', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_reviews,
        AVG(severity_score) as avg_severity,
        SUM(issues_count) as total_issues,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_reviews
      FROM code_reviews
      WHERE severity_score IS NOT NULL
    `);

    const categoryResult = await query(`
      SELECT category, COUNT(*) as count
      FROM review_issues
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      ...result.rows[0],
      issues_by_category: categoryResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
