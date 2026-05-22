import { useEffect, useState } from 'react';

// NON-VIZ 1 — pick a PR, generate a PDF report.
export default function ReviewReportPDF() {
  const [prs, setPrs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastFile, setLastFile] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/custom-views/pr-diff');
        const j = await r.json();
        setPrs(j.pull_requests || []);
        if (j.pull_requests && j.pull_requests.length > 0) setSelectedId(String(j.pull_requests[0].id));
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, []);

  async function generate() {
    if (!selectedId) {
      setError('Please pick a pull request first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/custom-views/report-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pr_id: Number(selectedId) }),
      });
      if (!r.ok) throw new Error(`server returned ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `review-report-pr-${selectedId}.pdf`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setLastFile(filename);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Review Report PDF</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Choose a PR and generate a PDF report with summary, findings, severity, and recommendations.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
        >
          <option value="">Select a pull request...</option>
          {prs.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.pr_number} — {p.title}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={busy}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm rounded"
        >
          {busy ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      {lastFile && (
        <div className="mt-3 text-sm text-green-600 dark:text-green-400">Downloaded: {lastFile}</div>
      )}
    </div>
  );
}
