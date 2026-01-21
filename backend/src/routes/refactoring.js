import express from 'express';
import { RefactoringSuggestion } from '../models/index.js';
import { aiRefactoringSuggestions } from '../services/openRouterService.js';

const router = express.Router();

// Get all refactoring suggestions
router.get('/', async (req, res) => {
  try {
    const suggestions = await RefactoringSuggestion.findAll();
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await RefactoringSuggestion.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single refactoring suggestion
router.get('/:id', async (req, res) => {
  try {
    const suggestion = await RefactoringSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Refactoring suggestion not found' });
    }
    res.json(suggestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new refactoring suggestion
router.post('/', async (req, res) => {
  try {
    const { title, description, original_code, language, improvement_type } = req.body;
    const suggestion = await RefactoringSuggestion.create({
      title,
      description,
      original_code,
      language,
      improvement_type,
      status: 'pending'
    });
    res.status(201).json(suggestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI refactoring suggestions
router.post('/:id/suggest', async (req, res) => {
  try {
    const suggestion = await RefactoringSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Refactoring suggestion not found' });
    }

    const result = await aiRefactoringSuggestions(
      suggestion.original_code,
      suggestion.language
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await RefactoringSuggestion.update(req.params.id, {
      refactored_code: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update refactoring suggestion
router.put('/:id', async (req, res) => {
  try {
    const updated = await RefactoringSuggestion.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Refactoring suggestion not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete refactoring suggestion
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await RefactoringSuggestion.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Refactoring suggestion not found' });
    }
    res.json({ message: 'Refactoring suggestion deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
