import { useState, useEffect } from 'react';

const API = '/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function CrossRepoDeps() {
  const [repos, setRepos] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [indexForm, setIndexForm] = useState({ repository: '', ecosystem: 'npm', dependencies: '[\n  {"package_name": "react", "version": "18.2.0"},\n  {"package_name": "axios", "version": "1.6.0"}\n]' });
  const [aiResult, setAiResult] = useState(null);

  const load = async () => {
    const [r, c] = await Promise.all([
      fetch(`${API}/cross-repo-deps/repos`, { headers: headers() }).then(rr => rr.json()),
      fetch(`${API}/cross-repo-deps/conflicts`, { headers: headers() }).then(rr => rr.json()),
    ]);
    setRepos(r || []);
    setConflicts(c.data || []);
  };
  useEffect(() => { load(); }, []);

  const handleIndex = async () => {
    let parsed;
    try { parsed = JSON.parse(indexForm.dependencies); } catch { return alert('Invalid JSON'); }
    await fetch(`${API}/cross-repo-deps/index`, { method: 'POST', headers: headers(), body: JSON.stringify({ repository: indexForm.repository, ecosystem: indexForm.ecosystem, dependencies: parsed }) });
    await load();
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch(`${API}/cross-repo-deps/scan-conflicts`, { method: 'POST', headers: headers() });
      await load();
    } finally { setScanning(false); }
  };

  const handleSuggestUpdate = async (id) => {
    const r = await fetch(`${API}/cross-repo-deps/conflicts/${id}/suggest-update`, { method: 'POST', headers: headers() });
    setAiResult(await r.json());
    await load();
  };

  const handleResolve = async (id) => {
    await fetch(`${API}/cross-repo-deps/conflicts/${id}/resolve`, { method: 'POST', headers: headers() });
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cross-Repo Dependency Analyzer</h1>
      <p className="text-gray-600 dark:text-gray-400">Index dependencies across repos, detect version conflicts, suggest unified updates.</p>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Index Repository Dependencies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Repository name" value={indexForm.repository} onChange={(e) => setIndexForm({ ...indexForm, repository: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
          <select value={indexForm.ecosystem} onChange={(e) => setIndexForm({ ...indexForm, ecosystem: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
            <option>npm</option><option>pip</option><option>maven</option><option>gem</option><option>cargo</option>
          </select>
          <textarea value={indexForm.dependencies} onChange={(e) => setIndexForm({ ...indexForm, dependencies: e.target.value })} rows={6} className="md:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 font-mono text-xs" />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleIndex} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">Index</button>
          <button onClick={handleScan} disabled={scanning} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50">
            {scanning ? 'Scanning…' : 'Scan for Conflicts'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Indexed Repos ({repos.length})</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500"><tr><th className="py-2">Repository</th><th>Ecosystem</th><th>Deps</th><th>Last Scanned</th></tr></thead>
          <tbody className="text-gray-900 dark:text-white">
            {repos.map(r => (
              <tr key={`${r.repository}-${r.ecosystem}`} className="border-t border-gray-200 dark:border-gray-700/50">
                <td className="py-2">{r.repository}</td><td>{r.ecosystem}</td><td>{r.dependency_count}</td><td>{new Date(r.last_scanned).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Conflicts ({conflicts.length})</h2>
        {conflicts.map(c => (
          <div key={c.id} className="p-3 mb-2 rounded bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between">
              <div>
                <div className="font-bold">{c.package_name} ({c.ecosystem})</div>
                <div className="text-xs text-gray-500">Versions: {Array.isArray(c.versions) ? c.versions.join(', ') : c.versions}</div>
                <div className="text-xs text-gray-500">Affected: {Array.isArray(c.affected_repos) ? c.affected_repos.join(', ') : c.affected_repos}</div>
                {c.recommended_version && <div className="text-xs text-green-600">Recommended: {c.recommended_version}</div>}
              </div>
              <div className="flex flex-col gap-1">
                {c.status !== 'resolved' && <>
                  <button onClick={() => handleSuggestUpdate(c.id)} className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs">AI Suggest</button>
                  <button onClick={() => handleResolve(c.id)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs">Mark Resolved</button>
                </>}
                {c.status === 'resolved' && <span className="text-green-600 text-xs">✓ Resolved</span>}
              </div>
            </div>
          </div>
        ))}
        {conflicts.length === 0 && <p className="text-gray-500">No conflicts detected.</p>}
      </div>

      {aiResult && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
          <h3 className="font-bold mb-2">AI Suggestion</h3>
          <pre className="text-xs font-mono overflow-x-auto p-4 bg-gray-100 dark:bg-gray-900 rounded">{JSON.stringify(aiResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
