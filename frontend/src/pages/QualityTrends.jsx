import { useState, useEffect } from 'react';

const API = '/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function QualityTrends() {
  const [snapshots, setSnapshots] = useState([]);
  const [trajectory, setTrajectory] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [repo, setRepo] = useState('global');
  const [days, setDays] = useState(30);
  const [computing, setComputing] = useState(false);

  const load = async () => {
    const [s, t, a] = await Promise.all([
      fetch(`${API}/quality-trends?days=${days}`, { headers: headers() }).then(r => r.json()),
      fetch(`${API}/quality-trends/trajectory?repository=${repo}&days=${days}`, { headers: headers() }).then(r => r.json()),
      fetch(`${API}/quality-trends/alerts`, { headers: headers() }).then(r => r.json()),
    ]);
    setSnapshots(s.data || []);
    setTrajectory(t);
    setAlerts(a || []);
  };

  useEffect(() => { load(); }, [repo, days]);

  const handleCompute = async () => {
    setComputing(true);
    try {
      await fetch(`${API}/quality-trends/compute`, { method: 'POST', headers: headers(), body: JSON.stringify({ repository: repo }) });
      await load();
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Code Quality Trend Tracker</h1>
      <p className="text-gray-600 dark:text-gray-400">Per-day snapshots, trajectory, and regression alerts.</p>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Repository</label>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Lookback Days</label>
          <input type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 30)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 w-24" />
        </div>
        <button onClick={handleCompute} disabled={computing} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50">
          {computing ? 'Computing…' : 'Compute Today\'s Snapshot'}
        </button>
      </div>

      {trajectory && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Trajectory</h2>
          <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
            Trend: <span className={`font-bold ${trajectory.current_trend === 'improving' ? 'text-green-600' : trajectory.current_trend === 'declining' ? 'text-red-600' : 'text-gray-600'}`}>{trajectory.current_trend}</span>
            {' '}({trajectory.snapshots?.length || 0} snapshots, {trajectory.regressions?.length || 0} regressions detected)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 dark:text-gray-400">
                <tr><th className="py-2">Date</th><th>Avg Severity</th><th>Total Issues</th><th>Critical</th><th>High</th><th>Reviews</th></tr>
              </thead>
              <tbody className="text-gray-900 dark:text-white">
                {(trajectory.snapshots || []).slice(-15).map(s => (
                  <tr key={s.snapshot_date} className="border-t border-gray-200 dark:border-gray-700/50">
                    <td className="py-2">{new Date(s.snapshot_date).toLocaleDateString()}</td>
                    <td>{s.avg_severity ? Number(s.avg_severity).toFixed(2) : '—'}</td>
                    <td>{s.total_issues || 0}</td>
                    <td className="text-red-600">{s.critical_count || 0}</td>
                    <td className="text-orange-600">{s.high_count || 0}</td>
                    <td>{s.reviews_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent Regression Alerts</h2>
        {alerts.length === 0 && <p className="text-gray-500">No regressions in the last 14 days.</p>}
        {alerts.map(a => (
          <div key={`${a.repository}-${a.snapshot_date}`} className="p-3 mb-2 rounded bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
            <div className="flex justify-between">
              <span className="font-semibold">{a.repository}</span>
              <span className="text-red-600">+{a.delta_pct}% severity</span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{new Date(a.snapshot_date).toLocaleDateString()}: {Number(a.avg_severity).toFixed(2)} (was {Number(a.prev_avg).toFixed(2)})</div>
          </div>
        ))}
      </div>
    </div>
  );
}
