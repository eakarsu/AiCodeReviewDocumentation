import express from 'express';
import { TechDebtItem } from '../models/index.js';
import { aiTechDebtAnalysis, callOpenRouter } from '../services/openRouterService.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { validateCodeInput } from '../utils/inputValidation.js';

const router = express.Router();

// POST /api/tech-debt/analyze — stateless tech debt analysis
router.post('/analyze', aiRateLimiter, async (req, res) => {
  try {
    const { code, codebase_size_kloc } = req.body;
    // language is optional for tech debt, default to 'javascript'
    const language = req.body.language || 'javascript';
    const validation = validateCodeInput(code, language);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';
    const prompt = `Analyze the following ${language} code for technical debt.

\`\`\`${language}
${code}
\`\`\`
${codebase_size_kloc ? `\nCodebase size: approximately ${codebase_size_kloc}K lines of code` : ''}

Analyze and provide:
1. **Debt Score** (0-100): Overall technical debt level
2. **Interest Rate**: Time cost — how much extra work this debt causes per sprint/month
3. **Payoff Priority List**: Ordered list of what to fix first

Respond with ONLY valid JSON:
{
  "debt_score": 68,
  "debt_level": "high|medium|low",
  "interest_rate": {
    "hours_per_sprint": 4,
    "description": "This debt costs approximately X hours per sprint in extra debugging and workarounds"
  },
  "debt_items": [
    {
      "category": "Code Debt|Design Debt|Documentation Debt|Test Debt|Infrastructure Debt",
      "title": "...",
      "location": "line/function reference",
      "severity": "critical|high|medium|low",
      "estimated_fix_hours": 2,
      "impact": "...",
      "description": "..."
    }
  ],
  "payoff_priority": [
    { "rank": 1, "item": "debt item title", "rationale": "Fix this first because...", "roi": "High — saves X hours/month" }
  ],
  "quick_wins": ["Easy fixes with high impact"],
  "long_term_strategy": "How to prevent future debt accumulation",
  "summary": "Overall tech debt assessment"
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

// Get all tech debt items
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await TechDebtItem.findAllPaginated({
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
    const count = await TechDebtItem.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tech debt item
router.get('/:id', async (req, res) => {
  try {
    const item = await TechDebtItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Tech debt item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new tech debt item
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language, project_name, debt_type } = req.body;
    const item = await TechDebtItem.create({
      title,
      description,
      code_snippet,
      language,
      project_name,
      debt_type,
      status: 'pending'
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI tech debt analysis
router.post('/:id/analyze', async (req, res) => {
  try {
    const item = await TechDebtItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Tech debt item not found' });
    }

    const projectContext = item.project_name ? `Project: ${item.project_name}` : '';
    const result = await aiTechDebtAnalysis(item.code_snippet, item.language, projectContext);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse severity and priority from response
    const severityMatch = result.content.match(/Severity[:\s]*(Critical|High|Medium|Low)/i);
    const priorityMatch = result.content.match(/Priority Score[:\s]*(\d+)/i);

    const updated = await TechDebtItem.update(req.params.id, {
      debt_analysis: result.content,
      severity: severityMatch ? severityMatch[1].toLowerCase() : null,
      priority_score: priorityMatch ? parseInt(priorityMatch[1]) : null,
      ai_analysis: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tech debt item
router.put('/:id', async (req, res) => {
  try {
    const updated = await TechDebtItem.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Tech debt item not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete tech debt item
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await TechDebtItem.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Tech debt item not found' });
    }
    res.json({ message: 'Tech debt item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
