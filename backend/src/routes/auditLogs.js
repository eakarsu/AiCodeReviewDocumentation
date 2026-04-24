import express from 'express';
import { AuditLog } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = express.Router();

// Get all audit logs (admin only)
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sort = 'created_at', order = 'DESC' } = req.query;
    const result = await AuditLog.findAllPaginated({
      page, limit, search, searchFields: ['user_email', 'action', 'resource_type'],
      sort, order
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit log count
router.get('/count', async (req, res) => {
  try {
    const count = await AuditLog.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
