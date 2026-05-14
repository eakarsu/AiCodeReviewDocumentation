import { useState, useEffect } from 'react';

const API = '/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function Remediation() {
  const [patterns, setPatterns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [issueId, setIssueId] = useState('');
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    const [p, s] = await Promise.all([
      fetch(`${API}/remediation/patterns`, { headers: headers() }).then(r => r.json()),
      fetch(`${API}/remediation/suggestions`, { headers: headers() }).then(r => r.json()),
    ]);
    setPatterns(p.data || []);
    setSuggestions(s.data || []);
  };

  useEffect(() => { load(); }, []);

  const handleSuggest = async () => {
    if (!issueId) return;
    setWorking(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/remediation/suggest/${issueId}`, { method: 'POST', headers: headers() });
      const data = await r.json();
      setResult(data);
      await load();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setWorking(false);
    }
  };

  const handleApply = async (id) => {
    await fetch(`${API}/remediation/suggestions/${id}/apply`, { method: 'POST', headers: headers() });
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Issue Remediation Bot</h1>
      <p className="text-gray-600 dark:text-gray-400">Learns issue→fix patterns. Suggests automated fixes for known issues.</p>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Issue ID</label>
            <input value={issueId} onChange={(e) => setIssueId(e.target.value)} placeholder="e.g. 42" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
          </div>
          <button onClick={handleSuggest} disabled={!issueId || working} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50">
            {working ? 'Generating…' : 'Suggest Fix'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Suggested Fix</h2>
          <pre className="text-xs font-mono overflow-x-auto p-4 bg-gray-100 dark:bg-gray-900 rounded">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent Suggestions</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 dark:text-gray-400">
            <tr><th className="py-2">Issue</th><th>Confidence</th><th>Applied?</th><th>Action</th></tr>
          </thead>
          <tbody className="text-gray-900 dark:text-white">
            {suggestions.length === 0 && <tr><td colSpan="4" className="py-8 text-center text-gray-500">No suggestions yet.</td></tr>}
            {suggestions.map(s => (
              <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700/50">
                <td className="py-2">{s.issue_title || `#${s.issue_id}`}</td>
                <td>{s.confidence_pct}%</td>
                <td>{s.applied ? <span className="text-green-600">✓</span> : '—'}</td>
                <td>{!s.applied && <button onClick={() => handleApply(s.id)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs">Mark Applied</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Learned Patterns ({patterns.length})</h2>
        <div className="grid gap-2">
          {patterns.slice(0, 10).map(p => (
            <div key={p.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
              <div className="font-mono text-xs text-gray-500">{p.category} | {p.severity} | {p.language || 'any'}</div>
              <div className="text-sm">{p.issue_signature}</div>
              <div className="text-xs text-gray-500 mt-1">Applied {p.applied_count} times</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
