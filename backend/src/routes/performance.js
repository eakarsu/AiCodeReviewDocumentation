import express from 'express';
import { PerformanceReport } from '../models/index.js';
import { aiPerformanceAnalysis } from '../services/openRouterService.js';

const router = express.Router();

// Get all performance reports
router.get('/', async (req, res) => {
  try {
    const reports = await PerformanceReport.findAll();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await PerformanceReport.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single performance report
router.get('/:id', async (req, res) => {
  try {
    const report = await PerformanceReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Performance report not found' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new performance report
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language } = req.body;
    const report = await PerformanceReport.create({
      title,
      description,
      code_snippet,
      language,
      status: 'pending'
    });
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI performance analysis
router.post('/:id/analyze', async (req, res) => {
  try {
    const report = await PerformanceReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Performance report not found' });
    }

    const result = await aiPerformanceAnalysis(report.code_snippet, report.language);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await PerformanceReport.update(req.params.id, {
      optimization_suggestions: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update performance report
router.put('/:id', async (req, res) => {
  try {
    const updated = await PerformanceReport.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Performance report not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete performance report
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await PerformanceReport.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Performance report not found' });
    }
    res.json({ message: 'Performance report deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
