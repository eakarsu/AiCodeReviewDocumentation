import { useState, useEffect } from 'react';

const API = '/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function Standards() {
  const [standards, setStandards] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ team_id: '', language: '', standard_type: 'naming', rule_text: '', enforcement_level: 'warning' });
  const [compliance, setCompliance] = useState(null);
  const [reviewId, setReviewId] = useState('');
  const [working, setWorking] = useState(false);

  const load = async () => {
    const [s, t] = await Promise.all([
      fetch(`${API}/standards`, { headers: headers() }).then(r => r.json()),
      fetch(`${API}/teams`, { headers: headers() }).then(r => r.json()),
    ]);
    setStandards(s.data || []);
    setTeams(t.data || t || []);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.team_id || !form.rule_text) return;
    await fetch(`${API}/standards`, { method: 'POST', headers: headers(), body: JSON.stringify({ ...form, team_id: parseInt(form.team_id) }) });
    setForm({ team_id: '', language: '', standard_type: 'naming', rule_text: '', enforcement_level: 'warning' });
    await load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/standards/${id}`, { method: 'DELETE', headers: headers() });
    await load();
  };

  const handleCheck = async () => {
    if (!form.team_id || !reviewId) return;
    setWorking(true);
    try {
      const r = await fetch(`${API}/standards/check/${reviewId}`, { method: 'POST', headers: headers(), body: JSON.stringify({ team_id: parseInt(form.team_id) }) });
      setCompliance(await r.json());
    } catch (err) {
      setCompliance({ error: err.message });
    } finally { setWorking(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Coding Standards Enforcer</h1>
      <p className="text-gray-600 dark:text-gray-400">Define team standards. Run AI compliance checks against code reviews.</p>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Standard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
            <option value="">-- Team --</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input placeholder="Language (e.g. javascript)" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
          <select value={form.standard_type} onChange={(e) => setForm({ ...form, standard_type: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
            <option value="naming">Naming</option><option value="formatting">Formatting</option><option value="structure">Structure</option><option value="imports">Imports</option><option value="comments">Comments</option>
          </select>
          <select value={form.enforcement_level} onChange={(e) => setForm({ ...form, enforcement_level: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
            <option value="info">Info</option><option value="warning">Warning</option><option value="error">Error</option>
          </select>
          <textarea placeholder="Rule text (e.g. 'Functions must use camelCase')" value={form.rule_text} onChange={(e) => setForm({ ...form, rule_text: e.target.value })} rows={3} className="md:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
        </div>
        <button onClick={handleCreate} className="mt-3 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">Add Standard</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Check Compliance</h2>
        <div className="flex gap-3 items-end">
          <input placeholder="Review ID" value={reviewId} onChange={(e) => setReviewId(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
          <button onClick={handleCheck} disabled={working} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50">
            {working ? 'Checking…' : 'Run Compliance Check'}
          </button>
        </div>
        {compliance && (
          <pre className="mt-4 text-xs font-mono overflow-x-auto p-4 bg-gray-100 dark:bg-gray-900 rounded">{JSON.stringify(compliance, null, 2)}</pre>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Standards ({standards.length})</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 dark:text-gray-400">
            <tr><th className="py-2">Team</th><th>Lang</th><th>Type</th><th>Rule</th><th>Level</th><th></th></tr>
          </thead>
          <tbody className="text-gray-900 dark:text-white">
            {standards.map(s => (
              <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700/50">
                <td className="py-2">{s.team_name || `Team #${s.team_id}`}</td>
                <td>{s.language || '*'}</td>
                <td>{s.standard_type}</td>
                <td className="max-w-md truncate">{s.rule_text}</td>
                <td>{s.enforcement_level}</td>
                <td><button onClick={() => handleDelete(s.id)} className="text-red-500 text-xs">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
