import express from 'express';
import { CodeComment } from '../models/index.js';
import { aiGenerateComments } from '../services/openRouterService.js';

const router = express.Router();

// Get all code comments
router.get('/', async (req, res) => {
  try {
    const comments = await CodeComment.findAll();
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await CodeComment.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single code comment entry
router.get('/:id', async (req, res) => {
  try {
    const comment = await CodeComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Code comment entry not found' });
    }
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new code comment entry
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language, comment_style } = req.body;
    const comment = await CodeComment.create({
      title,
      description,
      code_snippet,
      language,
      comment_style,
      status: 'pending'
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI comments
router.post('/:id/generate', async (req, res) => {
  try {
    const comment = await CodeComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Code comment entry not found' });
    }

    const result = await aiGenerateComments(
      comment.code_snippet,
      comment.language,
      comment.comment_style
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await CodeComment.update(req.params.id, {
      generated_comments: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update code comment
router.put('/:id', async (req, res) => {
  try {
    const updated = await CodeComment.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Code comment entry not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete code comment
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CodeComment.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Code comment entry not found' });
    }
    res.json({ message: 'Code comment entry deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
