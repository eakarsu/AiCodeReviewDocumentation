import express from 'express';
import { SecurityScan } from '../models/index.js';
import { aiSecurityScan, callOpenRouter } from '../services/openRouterService.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { validateCodeInput } from '../utils/inputValidation.js';

const router = express.Router();

// POST /api/security/scan — stateless OWASP Top 10 + CVE + secret detection scan
router.post('/scan', aiRateLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    const validation = validateCodeInput(code, language);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';
    const prompt = `Perform a comprehensive security scan on the following ${language} code.

\`\`\`${language}
${code}
\`\`\`

Analyze for:
1. **OWASP Top 10 Vulnerabilities**: Check each OWASP category (Injection, Broken Auth, Sensitive Data Exposure, XXE, Broken Access Control, Security Misconfiguration, XSS, Insecure Deserialization, Vulnerable Components, Insufficient Logging)
2. **CVE Patterns**: Known vulnerability patterns matching common CVEs
3. **Secret Detection**: Hardcoded API keys, passwords, tokens, private keys, connection strings
4. **Security Score** (0-100): Overall security posture

Respond with ONLY valid JSON:
{
  "security_score": 75,
  "owasp_findings": [
    { "category": "A01:2021 - Broken Access Control", "severity": "high", "description": "...", "line_reference": "line 12", "remediation": "..." }
  ],
  "cve_patterns": [
    { "pattern": "SQL Injection pattern", "cve_reference": "CWE-89", "severity": "critical", "location": "...", "remediation": "..." }
  ],
  "secrets_detected": [
    { "type": "API Key", "location": "line 5", "severity": "critical", "remediation": "Move to environment variable" }
  ],
  "summary": "Brief overall security assessment",
  "recommendations": ["Prioritized list of security improvements"]
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

// Get all security scans
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await SecurityScan.findAllPaginated({
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
