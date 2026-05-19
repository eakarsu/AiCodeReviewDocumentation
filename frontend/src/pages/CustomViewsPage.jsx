import CodeDiffViewer from '../components/CodeDiffViewer.js';
import ReviewTimeline from '../components/ReviewTimeline.js';
import ReviewReportPDF from '../components/ReviewReportPDF.js';
import AutoTagRulesEditor from '../components/AutoTagRulesEditor.js';

export default function CustomViewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Views</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Four custom views for diffing PRs, tracking reviewer activity, exporting PDF reports, and managing auto-tag rules.
        </p>
      </div>

      <CodeDiffViewer />
      <ReviewTimeline />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReviewReportPDF />
        <AutoTagRulesEditor />
      </div>
    </div>
  );
}
