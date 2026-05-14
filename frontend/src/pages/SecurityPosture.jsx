import { useState, useEffect } from 'react';

const API = '/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function SecurityPosture() {
  const [trend, setTrend] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [repo, setRepo] = useState('global');
  const [days, setDays] = useState(30);
  const [computing, setComputing] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  const load = async () => {
    const [t, r] = await Promise.all([
      fetch(`${API}/security-posture/trend?repository=${repo}&days=${days}`, { headers: headers() }).then(rr => rr.json()),
      fetch(`${API}/security-posture/ranking`, { headers: headers() }).then(rr => rr.json()),
    ]);
    setTrend(t);
    setRanking(r || []);
  };
  useEffect(() => { load(); }, [repo, days]);

  const handleCompute = async () => {
    setComputing(true);
    try {
      await fetch(`${API}/security-posture/compute`, { method: 'POST', headers: headers(), body: JSON.stringify({ repository: repo }) });
      await load();
    } finally { setComputing(false); }
  };

  const handleSummary = async () => {
    try {
      const r = await fetch(`${API}/security-posture/summary`, { method: 'POST', headers: headers(), body: JSON.stringify({ repository: repo }) }).then(rr => rr.json());
      setAiSummary(r);
    } catch (err) {
      setAiSummary({ error: err.message });
    }
  };

  const gradeColor = (g) => ({ A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500' }[g] || 'bg-gray-400');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Security Posture Scorer</h1>
      <p className="text-gray-600 dark:text-gray-400">Aggregate security scans across repos. Trend over time. Benchmark vs industry. Rank by risk.</p>

      <div className="flex flex-wrap gap-3 items-end">
        <input value={repo} onChange={(e) => setRepo(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" placeholder="Repository" />
        <input type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 30)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 w-24" />
        <button onClick={handleCompute} disabled={computing} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50">
          {computing ? 'Computing…' : 'Compute Today\'s Posture'}
        </button>
        <button onClick={handleSummary} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">AI Executive Summary</button>
      </div>

      {aiSummary && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">AI Posture Summary</h2>
          {aiSummary.summary?.current_grade && (
            <div className={`inline-block px-4 py-2 rounded-lg text-white font-bold text-2xl ${gradeColor(aiSummary.summary.current_grade)}`}>
              Grade: {aiSummary.summary.current_grade}
            </div>
          )}
          <pre className="mt-3 text-xs font-mono p-4 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">{JSON.stringify(aiSummary.summary || aiSummary, null, 2)}</pre>
        </div>
      )}

      {trend && trend.trend && trend.trend.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Posture Trend ({trend.trend.length} snapshots)</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500"><tr><th className="py-2">Date</th><th>Score</th><th>Vulns</th><th>Critical</th><th>High</th><th>Vs Industry</th></tr></thead>
            <tbody className="text-gray-900 dark:text-white">
              {trend.trend.slice(-15).map(s => (
                <tr key={s.scan_date} className="border-t border-gray-200 dark:border-gray-700/50">
                  <td className="py-2">{new Date(s.scan_date).toLocaleDateString()}</td>
                  <td className="font-bold text-primary-600">{s.posture_score}</td>
                  <td>{s.vulnerability_count}</td>
                  <td className="text-red-600">{s.critical_count}</td>
                  <td className="text-orange-600">{s.high_count}</td>
                  <td className={s.ranking_pct > 0 ? 'text-green-600' : 'text-red-600'}>{s.ranking_pct ? `${Number(s.ranking_pct).toFixed(1)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Repository Ranking</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500"><tr><th className="py-2">Rank</th><th>Repository</th><th>Score</th><th>Vulns</th><th>Critical</th><th>Last Scan</th></tr></thead>
          <tbody className="text-gray-900 dark:text-white">
            {ranking.length === 0 && <tr><td colSpan="6" className="py-8 text-center text-gray-500">No posture data yet.</td></tr>}
            {ranking.map(r => (
              <tr key={r.repository} className="border-t border-gray-200 dark:border-gray-700/50">
                <td className="py-2">#{r.rank}</td>
                <td className="font-medium">{r.repository}</td>
                <td className="font-bold text-primary-600">{r.posture_score}</td>
                <td>{r.vulnerability_count}</td>
                <td className="text-red-600">{r.critical_count}</td>
                <td>{new Date(r.scan_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
