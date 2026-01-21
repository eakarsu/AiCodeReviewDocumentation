import express from 'express';
import { Documentation } from '../models/index.js';
import { aiGenerateDocumentation } from '../services/openRouterService.js';

const router = express.Router();

// Get all documentation entries
router.get('/', async (req, res) => {
  try {
    const docs = await Documentation.findAll();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await Documentation.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single documentation entry
router.get('/:id', async (req, res) => {
  try {
    const doc = await Documentation.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Documentation not found' });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new documentation entry
router.post('/', async (req, res) => {
  try {
    const { title, description, source_code, doc_type, language } = req.body;
    const doc = await Documentation.create({
      title,
      description,
      source_code,
      doc_type,
      language,
      status: 'pending'
    });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI documentation
router.post('/:id/generate', async (req, res) => {
  try {
    const doc = await Documentation.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Documentation not found' });
    }

    const result = await aiGenerateDocumentation(doc.source_code, doc.language);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await Documentation.update(req.params.id, {
      generated_docs: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update documentation
router.put('/:id', async (req, res) => {
  try {
    const updated = await Documentation.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Documentation not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete documentation
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Documentation.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Documentation not found' });
    }
    res.json({ message: 'Documentation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
