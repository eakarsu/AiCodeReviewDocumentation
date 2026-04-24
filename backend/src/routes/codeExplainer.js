import express from 'express';
import { CodeExplanation } from '../models/index.js';
import { aiCodeExplainer } from '../services/openRouterService.js';

const router = express.Router();

// Get all code explanations
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await CodeExplanation.findAllPaginated({
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
    const count = await CodeExplanation.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single code explanation
router.get('/:id', async (req, res) => {
  try {
    const explanation = await CodeExplanation.findById(req.params.id);
    if (!explanation) {
      return res.status(404).json({ error: 'Code explanation not found' });
    }
    res.json(explanation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new code explanation
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language, context } = req.body;
    const explanation = await CodeExplanation.create({
      title,
      description,
      code_snippet,
      language,
      context: context || 'devops',
      status: 'pending'
    });
    res.status(201).json(explanation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI code explanation
router.post('/:id/explain', async (req, res) => {
  try {
    const explanation = await CodeExplanation.findById(req.params.id);
    if (!explanation) {
      return res.status(404).json({ error: 'Code explanation not found' });
    }

    const result = await aiCodeExplainer(explanation.code_snippet, explanation.language, explanation.context);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse complexity level from response
    const complexityMatch = result.content.match(/Complexity Level[:\s]*(Beginner|Intermediate|Advanced)/i);
    const complexityLevel = complexityMatch ? complexityMatch[1].toLowerCase() : null;

    const updated = await CodeExplanation.update(req.params.id, {
      explanation: result.content,
      complexity_level: complexityLevel,
      ai_analysis: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update code explanation
router.put('/:id', async (req, res) => {
  try {
    const updated = await CodeExplanation.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Code explanation not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete code explanation
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CodeExplanation.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Code explanation not found' });
    }
    res.json({ message: 'Code explanation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
