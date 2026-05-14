import express from 'express';
import { PerformanceReport } from '../models/index.js';
import { aiPerformanceAnalysis, callOpenRouter } from '../services/openRouterService.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { validateCodeInput } from '../utils/inputValidation.js';

const router = express.Router();

// POST /api/performance/analyze — stateless performance analysis
router.post('/analyze', aiRateLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    const validation = validateCodeInput(code, language);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';
    const prompt = `Perform a comprehensive performance analysis on the following ${language} code.

\`\`\`${language}
${code}
\`\`\`

Analyze for:
1. **Time Complexity**: Big-O notation for each function/algorithm
2. **Memory Usage**: Space complexity and memory allocation patterns
3. **Bottlenecks**: Specific performance bottlenecks with line references
4. **Optimization Suggestions**: Concrete improvements with before/after examples

Respond with ONLY valid JSON:
{
  "performance_score": 72,
  "time_complexity": {
    "overall": "O(n²)",
    "breakdown": [{ "function": "functionName", "complexity": "O(n log n)", "line_reference": "line 10-25", "explanation": "..." }]
  },
  "memory_usage": {
    "overall": "O(n)",
    "breakdown": [{ "location": "...", "issue": "...", "line_reference": "line 5" }]
  },
  "bottlenecks": [
    { "severity": "high", "location": "line 15", "description": "Nested loop causes quadratic growth", "impact": "..." }
  ],
  "optimizations": [
    { "priority": "high", "title": "...", "description": "...", "before": "code snippet", "after": "optimized snippet", "expected_improvement": "..." }
  ],
  "summary": "Overall performance assessment"
}`;

    const result = await callOpenRouter(prompt, systemPrompt);
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    let parsed;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      parsed = { raw_analysis: result.content };
    }

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all performance reports
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await PerformanceReport.findAllPaginated({
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
