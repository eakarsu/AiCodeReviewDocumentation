import { useEffect, useState } from 'react';

// VIZ 1 — split-pane diff viewer with PR picker.
function lineBg(t) {
  if (t === 'add') return 'bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-200';
  if (t === 'remove') return 'bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-200';
  return 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300';
}
function prefix(t) {
  if (t === 'add') return '+';
  if (t === 'remove') return '-';
  return ' ';
}

export default function CodeDiffViewer() {
  const [prs, setPrs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadList() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/custom-views/pr-diff');
      const j = await r.json();
      setPrs(j.pull_requests || []);
      if (!selectedId && j.pull_requests && j.pull_requests.length > 0) {
        setSelectedId(String(j.pull_requests[0].id));
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadDiff(id) {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/custom-views/pr-diff?pr_id=${encodeURIComponent(id)}`);
      const j = await r.json();
      setDiff(j.diff);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (selectedId) loadDiff(selectedId);
  }, [selectedId]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Code Diff Viewer</h2>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="ml-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
        >
          <option value="">Select a pull request...</option>
          {prs.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.pr_number} — {p.title} ({p.author})
            </option>
          ))}
        </select>
        <button
          onClick={() => loadDiff(selectedId)}
          className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded"
        >
          Refresh
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {loading && <div className="text-gray-500 text-sm mb-2">Loading...</div>}

      {!diff && !loading && (
        <div className="text-gray-500 dark:text-gray-400 text-sm">Pick a PR to view its diff.</div>
      )}

      {diff && (
        <div className="space-y-4">
          {(diff.files || []).map((f, fi) => {
            const removes = [];
            const adds = [];
            (f.hunks || []).forEach((h) =>
              (h.lines || []).forEach((l) => {
                if (l.type === 'remove') removes.push(l);
                else if (l.type === 'add') adds.push(l);
                else {
                  removes.push(l);
                  adds.push(l);
                }
              }),
            );
            const max = Math.max(removes.length, adds.length);
            return (
              <div key={fi} className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-mono text-gray-700 dark:text-gray-200">
                  {f.filename}
                </div>
                <div className="grid grid-cols-2 text-xs font-mono">
                  <div className="border-r border-gray-200 dark:border-gray-700">
                    <div className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 text-[11px] uppercase tracking-wide">
                      Before
                    </div>
                    {Array.from({ length: max }).map((_, i) => {
                      const l = removes[i] || { type: 'context', text: '' };
                      return (
                        <div key={i} className={`px-2 py-0.5 whitespace-pre ${lineBg(l.type === 'add' ? 'context' : l.type)}`}>
                          <span className="opacity-60 mr-2">{prefix(l.type === 'add' ? 'context' : l.type)}</span>
                          {l.type === 'add' ? '' : l.text}
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <div className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-200 text-[11px] uppercase tracking-wide">
                      After
                    </div>
                    {Array.from({ length: max }).map((_, i) => {
                      const l = adds[i] || { type: 'context', text: '' };
                      return (
                        <div key={i} className={`px-2 py-0.5 whitespace-pre ${lineBg(l.type === 'remove' ? 'context' : l.type)}`}>
                          <span className="opacity-60 mr-2">{prefix(l.type === 'remove' ? 'context' : l.type)}</span>
                          {l.type === 'remove' ? '' : l.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
