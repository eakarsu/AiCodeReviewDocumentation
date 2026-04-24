import express from 'express';
import { DeploymentAdvice } from '../models/index.js';
import { aiDeploymentAdvice } from '../services/openRouterService.js';

const router = express.Router();

// Get all deployment advices
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await DeploymentAdvice.findAllPaginated({
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
    const count = await DeploymentAdvice.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single deployment advice
router.get('/:id', async (req, res) => {
  try {
    const advice = await DeploymentAdvice.findById(req.params.id);
    if (!advice) {
      return res.status(404).json({ error: 'Deployment advice not found' });
    }
    res.json(advice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new deployment advice
router.post('/', async (req, res) => {
  try {
    const { title, description, current_setup, target_environment, deployment_type, infrastructure_config } = req.body;
    const advice = await DeploymentAdvice.create({
      title,
      description,
      current_setup,
      target_environment,
      deployment_type,
      infrastructure_config,
      status: 'pending'
    });
    res.status(201).json(advice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI deployment advice
router.post('/:id/advise', async (req, res) => {
  try {
    const advice = await DeploymentAdvice.findById(req.params.id);
    if (!advice) {
      return res.status(404).json({ error: 'Deployment advice not found' });
    }

    const result = await aiDeploymentAdvice(
      advice.current_setup,
      advice.target_environment,
      advice.deployment_type
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse strategy from response
    const strategyMatch = result.content.match(/Deployment Strategy[:\s]*([^\n]+)/i);

    const updated = await DeploymentAdvice.update(req.params.id, {
      deployment_strategy: strategyMatch ? strategyMatch[1].trim() : null,
      ai_analysis: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update deployment advice
router.put('/:id', async (req, res) => {
  try {
    const updated = await DeploymentAdvice.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Deployment advice not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete deployment advice
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await DeploymentAdvice.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Deployment advice not found' });
    }
    res.json({ message: 'Deployment advice deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
