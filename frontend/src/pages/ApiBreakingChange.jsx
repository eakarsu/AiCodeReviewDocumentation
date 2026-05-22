import { useState } from 'react';
import { api } from '../services/api';

export default function ApiBreakingChange() {
  const [payload, setPayload] = useState(JSON.stringify({ endpoints: [
    { path: '/users/{id}', old_method: 'GET', new_method: 'GET', removed_fields: ['email'], required_fields_added: ['tenant_id'] },
    { path: '/teams', old_method: 'POST', new_method: 'POST', removed_fields: [], required_fields_added: [] }
  ] }, null, 2));
  const [result, setResult] = useState(null);
  const run = async () => setResult(await api.post('/api-breaking-change/detect', JSON.parse(payload)));
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">API Breaking Change Detector</h1>
      <p className="text-gray-500 mb-4">Detect removed fields, new required fields, and method changes before publishing API docs.</p>
      <textarea className="w-full min-h-[260px] border rounded p-3 font-mono text-sm" value={payload} onChange={(event) => setPayload(event.target.value)} />
      <button className="mt-3 px-4 py-2 rounded bg-primary-600 text-white" onClick={run}>Detect Changes</button>
      {result && <section className="mt-4 rounded border p-4"><h2>{result.breakingCount} breaking</h2>{result.endpoints.map((row) => <p key={row.path}>{row.path}: {row.tier} · {row.findings.join(', ') || 'no issue'}</p>)}</section>}
    </div>
  );
}
