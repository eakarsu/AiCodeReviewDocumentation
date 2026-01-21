import express from 'express';
import { ApiDoc } from '../models/index.js';
import { aiGenerateApiDocs } from '../services/openRouterService.js';

const router = express.Router();

// Get all API docs
router.get('/', async (req, res) => {
  try {
    const docs = await ApiDoc.findAll();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await ApiDoc.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single API doc
router.get('/:id', async (req, res) => {
  try {
    const doc = await ApiDoc.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'API documentation not found' });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new API doc
router.post('/', async (req, res) => {
  try {
    const { title, description, endpoint, method, request_body, response_body } = req.body;
    const doc = await ApiDoc.create({
      title,
      description,
      endpoint,
      method,
      request_body,
      response_body,
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
    const doc = await ApiDoc.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'API documentation not found' });
    }

    const result = await aiGenerateApiDocs(
      doc.endpoint,
      doc.method,
      doc.request_body,
      doc.response_body
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await ApiDoc.update(req.params.id, {
      generated_docs: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update API doc
router.put('/:id', async (req, res) => {
  try {
    const updated = await ApiDoc.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'API documentation not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete API doc
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ApiDoc.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'API documentation not found' });
    }
    res.json({ message: 'API documentation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
