import { useState, useEffect } from 'react';

const API = '/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function Consensus() {
  const [reviews, setReviews] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [selected, setSelected] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`${API}/code-reviews?limit=50`, { headers: headers() }).then(r => r.json()).then(d => setReviews(d.data || d || []));
    fetch(`${API}/consensus`, { headers: headers() }).then(r => r.json()).then(d => setSummaries(d.data || []));
  }, []);

  const handleRun = async () => {
    if (!selected) return;
    setRunning(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/consensus/${selected}/run`, { method: 'POST', headers: headers(), body: JSON.stringify({}) });
      const data = await r.json();
      setResult(data);
      const s = await fetch(`${API}/consensus`, { headers: headers() }).then(rr => rr.json());
      setSummaries(s.data || []);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Review Consensus Engine</h1>
      <p className="text-gray-600 dark:text-gray-400">Aggregate reviews from multiple AI models. Compute disagreement scores and surface contentious issues.</p>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="">-- Select a code review --</option>
            {reviews.map(r => (
              <option key={r.id} value={r.id}>{r.title} (#{r.id})</option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={!selected || running}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run Multi-Model Consensus'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Latest Result</h2>
          <pre className="text-xs font-mono overflow-x-auto p-4 bg-gray-100 dark:bg-gray-900 rounded">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent Consensus Summaries</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 dark:text-gray-400">
            <tr><th className="py-2">Review</th><th>Models</th><th>Avg Rating</th><th>Disagreement</th><th>Contentious Issues</th></tr>
          </thead>
          <tbody className="text-gray-900 dark:text-white">
            {summaries.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-gray-500">No summaries yet.</td></tr>}
            {summaries.map(s => (
              <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700/50">
                <td className="py-2">{s.title || `Review #${s.review_id}`}</td>
                <td>{Array.isArray(s.models_used) ? s.models_used.length : '—'}</td>
                <td>{s.avg_rating ? Number(s.avg_rating).toFixed(2) : '—'}</td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs ${s.disagreement_score > 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {s.disagreement_score ? Number(s.disagreement_score).toFixed(2) : '—'}
                  </span>
                </td>
                <td>{Array.isArray(s.contentious_issues) ? s.contentious_issues.length : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
