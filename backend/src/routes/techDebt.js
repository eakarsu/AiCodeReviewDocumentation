import express from 'express';
import { TechDebtItem } from '../models/index.js';
import { aiTechDebtAnalysis } from '../services/openRouterService.js';

const router = express.Router();

// Get all tech debt items
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await TechDebtItem.findAllPaginated({
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
    const count = await TechDebtItem.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tech debt item
router.get('/:id', async (req, res) => {
  try {
    const item = await TechDebtItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Tech debt item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new tech debt item
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language, project_name, debt_type } = req.body;
    const item = await TechDebtItem.create({
      title,
      description,
      code_snippet,
      language,
      project_name,
      debt_type,
      status: 'pending'
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI tech debt analysis
router.post('/:id/analyze', async (req, res) => {
  try {
    const item = await TechDebtItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Tech debt item not found' });
    }

    const projectContext = item.project_name ? `Project: ${item.project_name}` : '';
    const result = await aiTechDebtAnalysis(item.code_snippet, item.language, projectContext);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse severity and priority from response
    const severityMatch = result.content.match(/Severity[:\s]*(Critical|High|Medium|Low)/i);
    const priorityMatch = result.content.match(/Priority Score[:\s]*(\d+)/i);

    const updated = await TechDebtItem.update(req.params.id, {
      debt_analysis: result.content,
      severity: severityMatch ? severityMatch[1].toLowerCase() : null,
      priority_score: priorityMatch ? parseInt(priorityMatch[1]) : null,
      ai_analysis: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tech debt item
router.put('/:id', async (req, res) => {
  try {
    const updated = await TechDebtItem.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Tech debt item not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete tech debt item
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await TechDebtItem.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Tech debt item not found' });
    }
    res.json({ message: 'Tech debt item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
