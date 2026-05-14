import express from 'express';
import { TestGeneration } from '../models/index.js';
import { aiGenerateTests, callOpenRouter } from '../services/openRouterService.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { validateCodeInput, ALLOWED_LANGUAGES } from '../utils/inputValidation.js';

const router = express.Router();

// POST /api/tests/generate — stateless test suite generation
router.post('/generate', aiRateLimiter, async (req, res) => {
  try {
    const { code, language, framework } = req.body;
    const validation = validateCodeInput(code, language);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';
    const prompt = `Generate a complete test suite for the following ${language} code${framework ? ` using ${framework}` : ''}.

\`\`\`${language}
${code}
\`\`\`

Generate:
1. **Unit Tests**: For every function/method
2. **Edge Cases**: Boundary conditions, empty inputs, null/undefined handling
3. **Mock Objects**: Where external dependencies need to be mocked
4. **Assertions**: Specific expected values and behaviors

Respond with ONLY valid JSON:
{
  "framework": "${framework || 'jest'}",
  "estimated_coverage": "85%",
  "test_file": "Complete ready-to-run test file as a string",
  "test_cases": [
    {
      "name": "should return correct result for valid input",
      "type": "unit|integration|edge_case",
      "function_under_test": "functionName",
      "description": "...",
      "setup": "mock/setup code",
      "test_code": "actual test code",
      "expected_behavior": "..."
    }
  ],
  "mocks": [
    { "dependency": "...", "mock_code": "...", "reason": "..." }
  ],
  "setup_instructions": "How to run these tests",
  "summary": "Overview of test coverage"
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

// Get all test generations
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await TestGeneration.findAllPaginated({
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
    const count = await TestGeneration.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single test generation
router.get('/:id', async (req, res) => {
  try {
    const test = await TestGeneration.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test generation not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new test generation
router.post('/', async (req, res) => {
  try {
    const { title, description, source_code, language, test_framework } = req.body;
    const test = await TestGeneration.create({
      title,
      description,
      source_code,
      language,
      test_framework,
      status: 'pending'
    });
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI tests
router.post('/:id/generate', async (req, res) => {
  try {
    const test = await TestGeneration.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test generation not found' });
    }

    const result = await aiGenerateTests(
      test.source_code,
      test.language,
      test.test_framework
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await TestGeneration.update(req.params.id, {
      generated_tests: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update test generation
router.put('/:id', async (req, res) => {
  try {
    const updated = await TestGeneration.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Test generation not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete test generation
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await TestGeneration.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Test generation not found' });
    }
    res.json({ message: 'Test generation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
