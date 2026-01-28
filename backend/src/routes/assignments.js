import express from 'express';
import { ReviewAssignment, CodeReview } from '../models/index.js';
import { query } from '../config/database.js';

const router = express.Router();

// Get all assignments with review info
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT ra.*, cr.title as review_title, cr.language, cr.status as review_status, cr.severity_score
      FROM review_assignments ra
      LEFT JOIN code_reviews cr ON ra.review_id = cr.id
      ORDER BY
        CASE ra.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        ra.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get assignments count
router.get('/count', async (req, res) => {
  try {
    const count = await ReviewAssignment.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my assignments (by email in query param)
router.get('/my', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await query(`
      SELECT ra.*, cr.title as review_title, cr.language, cr.status as review_status, cr.severity_score
      FROM review_assignments ra
      LEFT JOIN code_reviews cr ON ra.review_id = cr.id
      WHERE ra.assigned_to = $1
      ORDER BY
        CASE ra.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        ra.created_at DESC
    `, [email]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single assignment
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT ra.*, cr.title as review_title, cr.language, cr.status as review_status,
             cr.severity_score, cr.code_snippet, cr.review_result
      FROM review_assignments ra
      LEFT JOIN code_reviews cr ON ra.review_id = cr.id
      WHERE ra.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create assignment
router.post('/', async (req, res) => {
  try {
    const { review_id, assigned_to, assigned_by, priority, due_date, notes } = req.body;

    if (!review_id || !assigned_to) {
      return res.status(400).json({ error: 'Review ID and assigned_to are required' });
    }

    // Verify review exists
    const review = await CodeReview.findById(review_id);
    if (!review) {
      return res.status(404).json({ error: 'Code review not found' });
    }

    const assignment = await ReviewAssignment.create({
      review_id: parseInt(review_id),
      assigned_to,
      assigned_by,
      priority: priority || 'medium',
      due_date: due_date ? new Date(due_date) : null,
      notes,
      status: 'pending'
    });

    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update assignment
router.put('/:id', async (req, res) => {
  try {
    const updated = await ReviewAssignment.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update assignment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await ReviewAssignment.update(req.params.id, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete assignment
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ReviewAssignment.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending assignments for a review
router.get('/review/:reviewId', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM review_assignments WHERE review_id = $1 ORDER BY created_at DESC',
      [req.params.reviewId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
