import { useState, useEffect } from 'react';

const API = '/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function SLATracker() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [records, setRecords] = useState([]);
  const [escalating, setEscalating] = useState(false);
  const [predictId, setPredictId] = useState('');
  const [prediction, setPrediction] = useState(null);

  const load = async () => {
    const [l, r] = await Promise.all([
      fetch(`${API}/sla/leaderboard`, { headers: headers() }).then(rr => rr.json()),
      fetch(`${API}/sla/records?limit=20`, { headers: headers() }).then(rr => rr.json()),
    ]);
    setLeaderboard(l || []);
    setRecords(r.data || []);
  };
  useEffect(() => { load(); }, []);

  const handleEscalate = async () => {
    setEscalating(true);
    try {
      const r = await fetch(`${API}/sla/escalate-stale`, { method: 'POST', headers: headers() }).then(rr => rr.json());
      alert(`Escalated ${r.escalated || 0} stale assignments`);
      await load();
    } finally { setEscalating(false); }
  };

  const handlePredict = async () => {
    if (!predictId) return;
    try {
      const r = await fetch(`${API}/sla/predict/${predictId}`, { method: 'POST', headers: headers() }).then(rr => rr.json());
      setPrediction(r);
    } catch (err) {
      setPrediction({ error: err.message });
    }
  };

  const badgeColor = (b) => ({ gold: 'bg-yellow-400 text-yellow-900', silver: 'bg-gray-300 text-gray-800', bronze: 'bg-orange-300 text-orange-900', rookie: 'bg-blue-100 text-blue-900' }[b] || 'bg-gray-100');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Code Review SLA Tracker</h1>
      <p className="text-gray-600 dark:text-gray-400">Track turnaround times, AI-predict ETAs, escalate stale reviews, gamify with leaderboards.</p>

      <div className="flex gap-3">
        <button onClick={handleEscalate} disabled={escalating} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50">
          {escalating ? 'Escalating…' : 'Escalate Stale Reviews'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">AI Predict Turnaround</h2>
        <div className="flex gap-3">
          <input value={predictId} onChange={(e) => setPredictId(e.target.value)} placeholder="Assignment ID" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
          <button onClick={handlePredict} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">Predict</button>
        </div>
        {prediction && <pre className="mt-3 text-xs font-mono p-4 bg-gray-100 dark:bg-gray-900 rounded">{JSON.stringify(prediction, null, 2)}</pre>}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">🏆 Reviewer Leaderboard</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500"><tr><th className="py-2">Rank</th><th>Reviewer</th><th>Reviews</th><th>On-Time</th><th>Avg Turnaround</th><th>Score</th><th>Badge</th></tr></thead>
          <tbody className="text-gray-900 dark:text-white">
            {leaderboard.length === 0 && <tr><td colSpan="7" className="py-8 text-center text-gray-500">No data yet.</td></tr>}
            {leaderboard.map(r => (
              <tr key={r.reviewer} className="border-t border-gray-200 dark:border-gray-700/50">
                <td className="py-2">#{r.rank}</td>
                <td className="font-medium">{r.reviewer}</td>
                <td>{r.reviews_completed}</td>
                <td>{r.on_time_count}</td>
                <td>{r.avg_turnaround_hours || '—'}h</td>
                <td className="font-bold text-primary-600">{r.total_score}</td>
                <td><span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor(r.badge)}`}>{r.badge}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent SLA Records</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500"><tr><th className="py-2">Reviewer</th><th>Due</th><th>Completed</th><th>Turnaround (h)</th><th>On Time?</th><th>Escalated?</th></tr></thead>
          <tbody className="text-gray-900 dark:text-white">
            {records.map(r => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700/50">
                <td className="py-2">{r.reviewer || '—'}</td>
                <td>{r.due_date ? new Date(r.due_date).toLocaleString() : '—'}</td>
                <td>{r.completed_at ? new Date(r.completed_at).toLocaleString() : '—'}</td>
                <td>{r.turnaround_hours ? Number(r.turnaround_hours).toFixed(1) : '—'}</td>
                <td>{r.was_on_time === true ? '✓' : r.was_on_time === false ? '✗' : '—'}</td>
                <td>{r.was_escalated ? <span className="text-red-600">⚠</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
