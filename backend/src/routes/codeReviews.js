import express from 'express';
import { CodeReview } from '../models/index.js';
import { aiCodeReview } from '../services/openRouterService.js';

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

export default router;
