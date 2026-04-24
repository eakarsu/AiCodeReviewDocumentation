import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

const VALID_TABLES = [
  'code_reviews', 'documentation', 'code_analysis', 'api_docs',
  'readme_projects', 'code_comments', 'security_scans', 'performance_reports',
  'test_generations', 'refactoring_suggestions', 'bug_predictions',
  'code_explanations', 'tech_debt_items', 'architecture_reviews',
  'dependency_audits', 'deployment_advices', 'teams', 'review_assignments',
  'webhooks'
];

// Bulk delete
router.post('/delete', async (req, res) => {
  try {
    const { resource, ids } = req.body;
    if (!VALID_TABLES.includes(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(`DELETE FROM ${resource} WHERE id IN (${placeholders}) RETURNING id`, ids);
    res.json({ deleted: result.rows.length, ids: result.rows.map(r => r.id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update
router.post('/update', async (req, res) => {
  try {
    const { resource, ids, data } = req.body;
    if (!VALID_TABLES.includes(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'data must be a non-empty object' });
    }

    // Only allow updating status field for safety
    const allowedFields = ['status'];
    const filteredData = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        filteredData[key] = value;
      }
    }
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const columns = Object.keys(filteredData);
    const values = Object.values(filteredData);
    let paramIndex = 1;
    const setClause = columns.map((col) => `${col} = $${paramIndex++}`).join(', ');
    const placeholders = ids.map(() => `$${paramIndex++}`).join(', ');

    const result = await query(
      `UPDATE ${resource} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) RETURNING *`,
      [...values, ...ids]
    );
    res.json({ updated: result.rows.length, items: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
