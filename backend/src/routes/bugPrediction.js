import express from 'express';
import { BugPrediction } from '../models/index.js';
import { aiBugPrediction } from '../services/openRouterService.js';

const router = express.Router();

// Get all bug predictions
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await BugPrediction.findAllPaginated({
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
    const count = await BugPrediction.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single bug prediction
router.get('/:id', async (req, res) => {
  try {
    const prediction = await BugPrediction.findById(req.params.id);
    if (!prediction) {
      return res.status(404).json({ error: 'Bug prediction not found' });
    }
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new bug prediction
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language } = req.body;
    const prediction = await BugPrediction.create({
      title,
      description,
      code_snippet,
      language,
      status: 'pending'
    });
    res.status(201).json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI bug prediction
router.post('/:id/predict', async (req, res) => {
  try {
    const prediction = await BugPrediction.findById(req.params.id);
    if (!prediction) {
      return res.status(404).json({ error: 'Bug prediction not found' });
    }

    const result = await aiBugPrediction(prediction.code_snippet, prediction.language);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse probability from response if possible
    const probabilityMatch = result.content.match(/Bug Probability Score[:\s]*(\d+)/i);
    const bugProbability = probabilityMatch ? parseInt(probabilityMatch[1]) : null;

    const updated = await BugPrediction.update(req.params.id, {
      predicted_bugs: result.content,
      bug_probability: bugProbability,
      ai_analysis: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update bug prediction
router.put('/:id', async (req, res) => {
  try {
    const updated = await BugPrediction.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Bug prediction not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bug prediction
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await BugPrediction.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Bug prediction not found' });
    }
    res.json({ message: 'Bug prediction deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
