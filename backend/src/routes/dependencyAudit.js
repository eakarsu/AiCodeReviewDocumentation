import express from 'express';
import { DependencyAudit } from '../models/index.js';
import { aiDependencyAudit } from '../services/openRouterService.js';

const router = express.Router();

// Get all dependency audits
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await DependencyAudit.findAllPaginated({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search: search || '',
      searchFields: ['title', 'description'],
      sort: sort || 'created_at',
      order: order || 'DESC',
      filters
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await DependencyAudit.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single dependency audit
router.get('/:id', async (req, res) => {
  try {
    const audit = await DependencyAudit.findById(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Dependency audit not found' });
    }
    res.json(audit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new dependency audit
router.post('/', async (req, res) => {
  try {
    const { title, description, dependencies_list, package_manager, project_type } = req.body;
    const audit = await DependencyAudit.create({
      title,
      description,
      dependencies_list,
      package_manager,
      project_type,
      status: 'pending'
    });
    res.status(201).json(audit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI dependency audit
router.post('/:id/audit', async (req, res) => {
  try {
    const audit = await DependencyAudit.findById(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Dependency audit not found' });
    }

    const result = await aiDependencyAudit(
      audit.dependencies_list,
      audit.package_manager,
      audit.project_type
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse risk score from response
    const riskMatch = result.content.match(/Risk Score[:\s]*(\d+)/i);

    const updated = await DependencyAudit.update(req.params.id, {
      audit_result: result.content,
      risk_score: riskMatch ? parseInt(riskMatch[1]) : null,
      ai_analysis: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update dependency audit
router.put('/:id', async (req, res) => {
  try {
    const updated = await DependencyAudit.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Dependency audit not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete dependency audit
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await DependencyAudit.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Dependency audit not found' });
    }
    res.json({ message: 'Dependency audit deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
