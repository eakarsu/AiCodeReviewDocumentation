import express from 'express';

const router = express.Router();

router.post('/detect', (req, res) => {
  const endpoints = Array.isArray(req.body?.endpoints) ? req.body.endpoints : [
    { path: '/users/{id}', old_method: 'GET', new_method: 'GET', removed_fields: ['email'], required_fields_added: ['tenant_id'] },
    { path: '/teams', old_method: 'POST', new_method: 'POST', removed_fields: [], required_fields_added: [] },
  ];
  const rows = endpoints.map((endpoint) => {
    const removed = endpoint.removed_fields || [];
    const required = endpoint.required_fields_added || [];
    const score = removed.length * 35 + required.length * 28 + (endpoint.old_method !== endpoint.new_method ? 40 : 0);
    return {
      path: endpoint.path,
      score,
      tier: score >= 60 ? 'breaking' : score >= 25 ? 'migration_needed' : 'compatible',
      findings: [...removed.map((field) => `removed:${field}`), ...required.map((field) => `new_required:${field}`)],
    };
  });
  res.json({ breakingCount: rows.filter((row) => row.tier === 'breaking').length, endpoints: rows });
});

export default router;
