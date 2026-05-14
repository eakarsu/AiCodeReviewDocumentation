import { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { pullRequestsApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'pr_number', label: '#', render: (v) => `#${v}` },
  { key: 'title', label: 'Title' },
  { key: 'repository', label: 'Repository' },
  { key: 'author', label: 'Author' },
  { key: 'state', label: 'State', render: (v) => <span className={`badge ${v === 'open' ? 'badge-success' : v === 'closed' ? 'badge-danger' : 'badge-info'}`}>{v}</span> },
  { key: 'base_branch', label: 'Base' },
  { key: 'head_branch', label: 'Head' },
  { key: 'created_at', label: 'Fetched', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
];

function PullRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [prUrl, setPrUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pullRequestsApi.getAll({ page: pagination.page, limit: pagination.limit, search });
      setItems(result.data || []);
      setPagination((prev) => ({ ...prev, ...(result.pagination || {}) }));
    } catch (err) {
      console.error('PR fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleFetchPR = async () => {
    if (!prUrl) return;
    setFetching(true);
    try {
      const pr = await pullRequestsApi.fetch({ pr_url: prUrl });
      showToast(`Fetched PR #${pr.pr_number}: ${pr.title}`, 'success');
      setPrUrl('');
      fetchItems();
    } catch (err) {
      showToast('Failed to fetch PR: ' + err.message, 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleReview = async (id) => {
    setReviewing(true);
    try {
      const result = await pullRequestsApi.createReview(id, { auto_analyze: true });
      showToast('AI code review created', 'success');
      setSelectedItem({ ...selectedItem, code_review: result.code_review });
      fetchItems();
    } catch (err) {
      showToast('Review failed: ' + err.message, 'error');
    } finally {
      setReviewing(false);
    }
  };

  const handleRefresh = async (id) => {
    try {
      const updated = await pullRequestsApi.refresh(id);
      setSelectedItem(updated);
      fetchItems();
      showToast('PR refreshed', 'success');
    } catch (err) {
      showToast('Refresh failed: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this pull request record?', { title: 'Delete PR', confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await pullRequestsApi.delete(id);
      setSelectedItem(null);
      fetchItems();
      showToast('PR deleted', 'success');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pull Requests</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Fetched from GitHub for AI review</p>
        </div>
      </div>

      <div className="card p-4 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
          />
          <button onClick={handleFetchPR} disabled={fetching || !prUrl} className="btn btn-primary">
            {fetching ? 'Fetching...' : 'Fetch PR'}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination((p) => ({ ...p, page: 1 })); }} placeholder="Search PRs..." />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onRowClick={setSelectedItem}
        pagination={pagination}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        emptyState={<EmptyState title="No pull requests yet" description="Fetch a PR from GitHub to start AI reviewing it." />}
      />

      <DetailModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={selectedItem && <>
          <button onClick={() => handleRefresh(selectedItem.id)} className="btn btn-secondary">Refresh</button>
          <button onClick={() => handleDelete(selectedItem.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleReview(selectedItem.id)} disabled={reviewing} className="btn btn-success">
            {reviewing ? 'Reviewing...' : 'Run AI Review'}
          </button>
        </>}>
        {selectedItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><h4 className="text-sm text-gray-500">Repository</h4><p>{selectedItem.repository}</p></div>
              <div><h4 className="text-sm text-gray-500">PR #</h4><p>#{selectedItem.pr_number}</p></div>
              <div><h4 className="text-sm text-gray-500">Author</h4><p>{selectedItem.author}</p></div>
              <div><h4 className="text-sm text-gray-500">State</h4><p>{selectedItem.state}</p></div>
              <div><h4 className="text-sm text-gray-500">Base</h4><p>{selectedItem.base_branch}</p></div>
              <div><h4 className="text-sm text-gray-500">Head</h4><p>{selectedItem.head_branch}</p></div>
            </div>
            {selectedItem.pr_url && (
              <a href={selectedItem.pr_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline text-sm">View on GitHub</a>
            )}
            {selectedItem.diff_content && (
              <div>
                <h4 className="text-sm text-gray-500 mb-1">Diff</h4>
                <pre className="text-xs overflow-x-auto bg-gray-50 dark:bg-gray-900 p-3 rounded max-h-96">{selectedItem.diff_content}</pre>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}

export default PullRequests;
