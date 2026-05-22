import { useEffect, useState } from 'react';

// NON-VIZ 2 — CRUD editor for file-pattern -> label/owner rules.
const EMPTY = { file_pattern: '', label: '', owner: '', priority: 0, enabled: true };

export default function AutoTagRulesEditor() {
  const [rules, setRules] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/custom-views/auto-tag-rules');
      const j = await r.json();
      setRules(j.rules || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function resetDraft() {
    setDraft(EMPTY);
    setEditingId(null);
  }

  async function save() {
    if (!draft.file_pattern || !draft.label) {
      setError('file_pattern and label are required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editingId) {
        await fetch(`/api/custom-views/auto-tag-rules/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
      } else {
        await fetch('/api/custom-views/auto-tag-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
      }
      resetDraft();
      await load();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setBusy(true);
    try {
      await fetch(`/api/custom-views/auto-tag-rules/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setDraft({
      file_pattern: r.file_pattern || '',
      label: r.label || '',
      owner: r.owner || '',
      priority: r.priority ?? 0,
      enabled: !!r.enabled,
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Auto-Tag Rules</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Map file patterns to labels and owners. Highest priority wins on collision.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-4">
        <input
          className="md:col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
          placeholder="file pattern e.g. backend/**/*.js"
          value={draft.file_pattern}
          onChange={(e) => setDraft({ ...draft, file_pattern: e.target.value })}
        />
        <input
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
          placeholder="label"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
        <input
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
          placeholder="owner"
          value={draft.owner}
          onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
        />
        <input
          type="number"
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
          placeholder="priority"
          value={draft.priority}
          onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm rounded"
          >
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button
              onClick={resetDraft}
              className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 px-2">Pattern</th>
              <th className="py-2 px-2">Label</th>
              <th className="py-2 px-2">Owner</th>
              <th className="py-2 px-2">Priority</th>
              <th className="py-2 px-2">Enabled</th>
              <th className="py-2 px-2" />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-2 px-2 font-mono text-xs text-gray-800 dark:text-gray-100">{r.file_pattern}</td>
                <td className="py-2 px-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-200 text-xs">
                    {r.label}
                  </span>
                </td>
                <td className="py-2 px-2 text-gray-700 dark:text-gray-200">{r.owner || '—'}</td>
                <td className="py-2 px-2 text-gray-700 dark:text-gray-200">{r.priority}</td>
                <td className="py-2 px-2 text-gray-700 dark:text-gray-200">{r.enabled ? 'yes' : 'no'}</td>
                <td className="py-2 px-2 text-right">
                  <button
                    onClick={() => startEdit(r)}
                    className="text-primary-600 hover:underline text-xs mr-2"
                  >
                    edit
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    delete
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && !busy && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-400">
                  No rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
