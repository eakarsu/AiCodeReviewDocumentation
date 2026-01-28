// PRList Component - List of fetched pull requests with actions
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { pullRequestsApi } from '../services/api';
import DetailModal from './DetailModal';
import DiffViewer from './DiffViewer';

function PRList({ pullRequests, onRefresh }) {
  const [selectedPR, setSelectedPR] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const handleCreateReview = async (prId, autoAnalyze = false) => {
    setReviewLoading(true);
    try {
      const result = await pullRequestsApi.createReview(prId, { auto_analyze: autoAnalyze });
      alert(`Review created! ${autoAnalyze ? 'Analysis complete.' : 'Go to Code Reviews to run analysis.'}`);
      if (onRefresh) onRefresh();
      setSelectedPR(null);
    } catch (err) {
      alert('Error creating review: ' + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDelete = async (prId) => {
    if (!confirm('Delete this pull request?')) return;
    try {
      await pullRequestsApi.delete(prId);
      if (onRefresh) onRefresh();
      setSelectedPR(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (!pullRequests || pullRequests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 dark:text-gray-400">
          No pull requests fetched yet.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Use the form to fetch a PR by URL
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {pullRequests.map(pr => (
            <div
              key={pr.id}
              onClick={() => setSelectedPR(pr)}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      pr.state === 'open'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : pr.state === 'merged'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {pr.state}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      #{pr.pr_number}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {pr.repository}
                    </span>
                  </div>

                  <h3 className="font-medium text-gray-900 dark:text-white mt-1 truncate">
                    {pr.title}
                  </h3>

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>by {pr.author}</span>
                    <span>{pr.head_branch} &rarr; {pr.base_branch}</span>
                    {pr.files_changed && (
                      <span>{pr.files_changed.length} files</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {pr.review_id ? (
                    <div className="flex items-center gap-2">
                      {pr.severity_score && (
                        <span className={`text-lg font-bold ${
                          pr.severity_score >= 8 ? 'text-red-600' :
                          pr.severity_score >= 6 ? 'text-orange-600' :
                          pr.severity_score >= 4 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {pr.severity_score}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        pr.review_status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {pr.review_status === 'completed' ? 'Reviewed' : 'Pending'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Not reviewed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedPR}
        onClose={() => { setSelectedPR(null); setShowDiff(false); }}
        title={`#${selectedPR?.pr_number} ${selectedPR?.title || ''}`}
        actions={
          <>
            <button onClick={() => handleDelete(selectedPR?.id)} className="btn btn-danger">
              Delete
            </button>
            {selectedPR?.review_id ? (
              <Link
                to="/code-reviews"
                className="btn btn-primary"
              >
                View Review
              </Link>
            ) : (
              <>
                <button
                  onClick={() => handleCreateReview(selectedPR?.id, false)}
                  className="btn bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  disabled={reviewLoading}
                >
                  Create Review
                </button>
                <button
                  onClick={() => handleCreateReview(selectedPR?.id, true)}
                  className="btn btn-success flex items-center gap-2"
                  disabled={reviewLoading}
                >
                  {reviewLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Review & Analyze
                    </>
                  )}
                </button>
              </>
            )}
          </>
        }
      >
        {selectedPR && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Repository</h4>
                <p className="text-gray-900 dark:text-white">{selectedPR.repository}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Author</h4>
                <p className="text-gray-900 dark:text-white">{selectedPR.author}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Branches</h4>
                <p className="text-gray-900 dark:text-white text-sm">
                  {selectedPR.head_branch} &rarr; {selectedPR.base_branch}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">State</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  selectedPR.state === 'open'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedPR.state}
                </span>
              </div>
            </div>

            {/* Files Changed */}
            {selectedPR.files_changed && selectedPR.files_changed.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Files Changed ({selectedPR.files_changed.length})
                </h4>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {selectedPR.files_changed.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                        {file.filename}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600">+{file.additions}</span>
                        <span className="text-red-600">-{file.deletions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diff Toggle */}
            {selectedPR.diff_content && (
              <div>
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1"
                >
                  {showDiff ? 'Hide' : 'Show'} Diff
                  <svg className={`w-4 h-4 transition-transform ${showDiff ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showDiff && (
                  <div className="mt-3">
                    <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-96 font-mono text-gray-800 dark:text-gray-200">
                      {selectedPR.diff_content}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* External Link */}
            <a
              href={selectedPR.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View on GitHub
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </DetailModal>
    </>
  );
}

export default PRList;
