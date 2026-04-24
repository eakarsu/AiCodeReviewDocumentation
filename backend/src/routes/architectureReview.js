import express from 'express';
import { ArchitectureReview } from '../models/index.js';
import { aiArchitectureReview } from '../services/openRouterService.js';

const router = express.Router();

// Get all architecture reviews
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await ArchitectureReview.findAllPaginated({
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
    const count = await ArchitectureReview.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single architecture review
router.get('/:id', async (req, res) => {
  try {
    const review = await ArchitectureReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Architecture review not found' });
    }
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new architecture review
router.post('/', async (req, res) => {
  try {
    const { title, description, architecture_diagram, tech_stack, system_type } = req.body;
    const review = await ArchitectureReview.create({
      title,
      description,
      architecture_diagram,
      tech_stack,
      system_type,
      status: 'pending'
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI architecture review
router.post('/:id/review', async (req, res) => {
  try {
    const review = await ArchitectureReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Architecture review not found' });
    }

    const result = await aiArchitectureReview(
      review.architecture_diagram,
      review.tech_stack,
      review.system_type
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse scores from response
    const scalabilityMatch = result.content.match(/Scalability[^:]*:[^\d]*(\d+)/i);
    const maintainabilityMatch = result.content.match(/Maintainability[^:]*:[^\d]*(\d+)/i);
    const securityMatch = result.content.match(/Security[^:]*:[^\d]*(\d+)/i);

    const updated = await ArchitectureReview.update(req.params.id, {
      review_result: result.content,
      scalability_score: scalabilityMatch ? parseInt(scalabilityMatch[1]) : null,
      maintainability_score: maintainabilityMatch ? parseInt(maintainabilityMatch[1]) : null,
      security_score: securityMatch ? parseInt(securityMatch[1]) : null,
      ai_analysis: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update architecture review
router.put('/:id', async (req, res) => {
  try {
    const updated = await ArchitectureReview.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Architecture review not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete architecture review
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ArchitectureReview.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Architecture review not found' });
    }
    res.json({ message: 'Architecture review deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
