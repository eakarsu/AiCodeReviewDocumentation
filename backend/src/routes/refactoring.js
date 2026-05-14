import express from 'express';
import { RefactoringSuggestion } from '../models/index.js';
import { aiRefactoringSuggestions, callOpenRouter } from '../services/openRouterService.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { validateCodeInput } from '../utils/inputValidation.js';

const router = express.Router();

// POST /api/refactoring/suggest — stateless refactoring suggestions
router.post('/suggest', aiRateLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    const validation = validateCodeInput(code, language);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';
    const prompt = `Analyze the following ${language} code and provide comprehensive refactoring suggestions.

\`\`\`${language}
${code}
\`\`\`

Identify and suggest:
1. **DRY Violations**: Repeated code that should be extracted
2. **Design Patterns**: Applicable patterns (Factory, Strategy, Observer, etc.)
3. **Code Smells**: Long methods, large classes, feature envy, etc.
4. **Before/After**: Refactored version of the code

Respond with ONLY valid JSON:
{
  "refactoring_score": 65,
  "dry_violations": [
    { "description": "...", "locations": ["line 10-15", "line 30-35"], "suggested_extraction": "extracted function code" }
  ],
  "design_patterns": [
    { "pattern": "Strategy Pattern", "rationale": "...", "implementation_example": "...", "benefit": "..." }
  ],
  "code_smells": [
    { "smell": "Long Method", "location": "functionName (line 10-50)", "severity": "medium", "suggestion": "..." }
  ],
  "refactored_code": "Complete refactored version of the code",
  "changes_summary": ["List of all changes made"],
  "summary": "Overall refactoring assessment"
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

// Get all refactoring suggestions
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await RefactoringSuggestion.findAllPaginated({
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
