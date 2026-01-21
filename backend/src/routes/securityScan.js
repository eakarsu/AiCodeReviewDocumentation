import express from 'express';
import { SecurityScan } from '../models/index.js';
import { aiSecurityScan } from '../services/openRouterService.js';

const router = express.Router();

// Get all security scans
router.get('/', async (req, res) => {
  try {
    const scans = await SecurityScan.findAll();
    res.json(scans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await SecurityScan.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single security scan
router.get('/:id', async (req, res) => {
  try {
    const scan = await SecurityScan.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Security scan not found' });
    }
    res.json(scan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new security scan
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language } = req.body;
    const scan = await SecurityScan.create({
      title,
      description,
      code_snippet,
      language,
      status: 'pending'
    });
    res.status(201).json(scan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI security scan
router.post('/:id/scan', async (req, res) => {
  try {
    const scan = await SecurityScan.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Security scan not found' });
    }

    const result = await aiSecurityScan(scan.code_snippet, scan.language);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await SecurityScan.update(req.params.id, {
      vulnerabilities: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update security scan
router.put('/:id', async (req, res) => {
  try {
    const updated = await SecurityScan.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Security scan not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete security scan
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await SecurityScan.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Security scan not found' });
    }
    res.json({ message: 'Security scan deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
