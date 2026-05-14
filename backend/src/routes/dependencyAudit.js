import express from 'express';
import { DependencyAudit } from '../models/index.js';
import { aiDependencyAudit, callOpenRouter } from '../services/openRouterService.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { validatePackageJson } from '../utils/inputValidation.js';

const router = express.Router();

// POST /api/dependencies/audit — stateless dependency audit
router.post('/audit', aiRateLimiter, async (req, res) => {
  try {
    const { package_json_content } = req.body;
    const validation = validatePackageJson(package_json_content);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    let parsedPkg;
    try {
      parsedPkg = JSON.parse(package_json_content);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON in package_json_content' });
    }

    const systemPrompt = 'You are an expert software engineer and code quality specialist. Provide detailed, actionable analysis with specific line references and concrete improvement suggestions.';
    const prompt = `Audit the following package.json dependencies for security, outdatedness, and license risks.

\`\`\`json
${package_json_content}
\`\`\`

Analyze:
1. **Outdated Packages**: Packages that have newer versions available
2. **Known CVEs**: Security vulnerabilities in listed package versions
3. **License Risks**: GPL contamination, proprietary conflicts, missing licenses
4. **Upgrade Priority**: Which packages to update first

Respond with ONLY valid JSON:
{
  "overall_risk_score": 45,
  "package_manager": "npm",
  "total_dependencies": ${Object.keys({ ...(parsedPkg.dependencies || {}), ...(parsedPkg.devDependencies || {}) }).length},
  "outdated_packages": [
    { "name": "express", "current_version": "4.17.1", "latest_version": "4.18.2", "severity": "medium", "breaking_changes": false, "upgrade_notes": "..." }
  ],
  "cve_findings": [
    { "package": "lodash", "version": "4.17.15", "cve_id": "CVE-2021-23337", "severity": "critical", "description": "...", "fix_version": "4.17.21" }
  ],
  "license_risks": [
    { "package": "...", "license": "GPL-3.0", "risk": "Copyleft contamination", "recommendation": "..." }
  ],
  "upgrade_priority": [
    { "rank": 1, "package": "...", "reason": "Critical CVE", "action": "Update to X.Y.Z immediately" }
  ],
  "recommended_alternatives": [
    { "package": "...", "alternative": "...", "reason": "..." }
  ],
  "summary": "Overall dependency health assessment"
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

// Get all dependency audits
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, sort, order, ...filters } = req.query;
    delete filters._;
    const result = await DependencyAudit.findAllPaginated({
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
    const count = await DependencyAudit.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single dependency audit
router.get('/:id', async (req, res) => {
  try {
    const audit = await DependencyAudit.findById(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Dependency audit not found' });
    }
    res.json(audit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new dependency audit
router.post('/', async (req, res) => {
  try {
    const { title, description, dependencies_list, package_manager, project_type } = req.body;
    const audit = await DependencyAudit.create({
      title,
      description,
      dependencies_list,
      package_manager,
      project_type,
      status: 'pending'
    });
    res.status(201).json(audit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI dependency audit
router.post('/:id/audit', async (req, res) => {
  try {
    const audit = await DependencyAudit.findById(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Dependency audit not found' });
    }

    const result = await aiDependencyAudit(
      audit.dependencies_list,
      audit.package_manager,
      audit.project_type
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Parse risk score from response
    const riskMatch = result.content.match(/Risk Score[:\s]*(\d+)/i);

    const updated = await DependencyAudit.update(req.params.id, {
      audit_result: result.content,
      risk_score: riskMatch ? parseInt(riskMatch[1]) : null,
      ai_analysis: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update dependency audit
router.put('/:id', async (req, res) => {
  try {
    const updated = await DependencyAudit.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Dependency audit not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete dependency audit
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await DependencyAudit.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Dependency audit not found' });
    }
    res.json({ message: 'Dependency audit deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
