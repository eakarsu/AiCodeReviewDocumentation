import express from 'express';
import { TestGeneration } from '../models/index.js';
import { aiGenerateTests } from '../services/openRouterService.js';

const router = express.Router();

// Get all test generations
router.get('/', async (req, res) => {
  try {
    const tests = await TestGeneration.findAll();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await TestGeneration.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single test generation
router.get('/:id', async (req, res) => {
  try {
    const test = await TestGeneration.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test generation not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new test generation
router.post('/', async (req, res) => {
  try {
    const { title, description, source_code, language, test_framework } = req.body;
    const test = await TestGeneration.create({
      title,
      description,
      source_code,
      language,
      test_framework,
      status: 'pending'
    });
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI tests
router.post('/:id/generate', async (req, res) => {
  try {
    const test = await TestGeneration.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test generation not found' });
    }

    const result = await aiGenerateTests(
      test.source_code,
      test.language,
      test.test_framework
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await TestGeneration.update(req.params.id, {
      generated_tests: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update test generation
router.put('/:id', async (req, res) => {
  try {
    const updated = await TestGeneration.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Test generation not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete test generation
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await TestGeneration.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Test generation not found' });
    }
    res.json({ message: 'Test generation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
