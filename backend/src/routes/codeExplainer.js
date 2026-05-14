import express from 'express';
import { CodeExplanation } from '../models/index.js';
import { aiCodeExplainer, callOpenRouter } from '../services/openRouterService.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { validateCodeInput } from '../utils/inputValidation.js';

const router = express.Router();

// POST /api/explain — stateless code explanation at any level
router.post('/explain', aiRateLimiter, async (req, res) => {
  try {
    const { code, language, level } = req.body;
    const validation = validateCodeInput(code, language);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const validLevels = ['beginner', 'intermediate', 'expert'];
    const explanationLevel = (level && validLevels.includes(level.toLowerCase())) ? level.toLowerCase() : 'intermediate';

    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';
    const prompt = `Explain the following ${language} code at a ${explanationLevel} level.

\`\`\`${language}
${code}
\`\`\`

Target audience: ${explanationLevel === 'beginner' ? 'Someone new to programming with minimal coding experience' : explanationLevel === 'intermediate' ? 'A developer with 1-3 years experience familiar with basic concepts' : 'An experienced engineer comfortable with advanced patterns and system design'}

Provide explanation tailored to the level. Respond with ONLY valid JSON:
{
  "level": "${explanationLevel}",
  "overview": "What this code does in simple terms",
  "line_by_line": [
    { "lines": "1-5", "explanation": "..." }
  ],
  "key_concepts": [
    { "concept": "...", "explanation": "...", "analogy": "Real-world analogy (especially for beginner level)" }
  ],
  "how_it_works": "Step-by-step walkthrough of execution flow",
  "use_cases": ["When you would use this pattern/code"],
  "common_pitfalls": ["Things to watch out for"],
  "further_reading": ["Topics to learn next (beginner/intermediate) or advanced variations (expert)"],
  "summary": "One-sentence summary"
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

// Get all code explanations
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await CodeExplanation.findAllPaginated({
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
    const count = await CodeExplanation.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single code explanation
router.get('/:id', async (req, res) => {
  try {
    const explanation = await CodeExplanation.findById(req.params.id);
    if (!explanation) {
      return res.status(404).json({ error: 'Code explanation not found' });
    }
    res.json(explanation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new code explanation
router.post('/', async (req, res) => {
  try {
    const { title, description, code_snippet, language, context } = req.body;
    const explanation = await CodeExplanation.create({
      title,
      description,
      code_snippet,
      language,
      context: context || 'devops',
      status: 'pending'
    });
    res.status(201).json(explanation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI code explanation
router.post('/:id/explain', async (req, res) => {
  try {
    const explanation = await CodeExplanation.findById(req.params.id);
    if (!explanation) {
      return res.status(404).json({ error: 'Code explanation not found' });
    }

    const result = await aiCodeExplainer(explanation.code_snippet, explanation.language, explanation.context);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse complexity level from response
    const complexityMatch = result.content.match(/Complexity Level[:\s]*(Beginner|Intermediate|Advanced)/i);
    const complexityLevel = complexityMatch ? complexityMatch[1].toLowerCase() : null;

    const updated = await CodeExplanation.update(req.params.id, {
      explanation: result.content,
      complexity_level: complexityLevel,
      ai_analysis: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update code explanation
router.put('/:id', async (req, res) => {
  try {
    const updated = await CodeExplanation.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Code explanation not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete code explanation
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CodeExplanation.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Code explanation not found' });
    }
    res.json({ message: 'Code explanation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
