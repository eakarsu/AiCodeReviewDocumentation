import express from 'express';
import { CodeAnalysis } from '../models/index.js';
import { aiCodeAnalysis } from '../services/openRouterService.js';

const router = express.Router();

// Get all code analysis entries
router.get('/', async (req, res) => {
  try {
    const analyses = await CodeAnalysis.findAll();
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await CodeAnalysis.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single analysis
router.get('/:id', async (req, res) => {
  try {
    const analysis = await CodeAnalysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Code analysis not found' });
    }
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new analysis
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language } = req.body;
    const analysis = await CodeAnalysis.create({
      title,
      description,
      code_snippet,
      language,
      status: 'pending'
    });
    res.status(201).json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI analysis
router.post('/:id/analyze', async (req, res) => {
  try {
    const analysis = await CodeAnalysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Code analysis not found' });
    }

    const result = await aiCodeAnalysis(analysis.code_snippet, analysis.language);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await CodeAnalysis.update(req.params.id, {
      analysis_result: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update analysis
router.put('/:id', async (req, res) => {
  try {
    const updated = await CodeAnalysis.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Code analysis not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete analysis
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CodeAnalysis.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Code analysis not found' });
    }
    res.json({ message: 'Code analysis deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
