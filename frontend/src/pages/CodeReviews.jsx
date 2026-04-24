import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { SeverityScore, SeveritySummary } from '../components/SeverityBadge';
import IssuesList from '../components/IssuesList';
import { codeReviewsApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  {
    key: 'severity_score',
    label: 'Severity',
    render: (val, row) => val ? (
      <div className="flex items-center gap-2">
        <span className={`font-bold ${
          val >= 8 ? 'text-red-600 dark:text-red-400' :
          val >= 6 ? 'text-orange-600 dark:text-orange-400' :
          val >= 4 ? 'text-yellow-600 dark:text-yellow-400' :
          'text-green-600 dark:text-green-400'
        }`}>{val}</span>
        {row.issues_count > 0 && (
          <span className="text-xs text-gray-500">({row.issues_count} issues)</span>
        )}
      </div>
    ) : <span className="text-gray-400">-</span>
  },
  {
    key: 'status',
    label: 'Status',
    render: (val) => (
      <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>
        {val}
      </span>
    ),
  },
  {
    key: 'created_at',
    label: 'Created',
    render: (val) => new Date(val).toLocaleDateString(),
  },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'language', label: 'Language', options: [{ value: 'javascript', label: 'JavaScript' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'sql', label: 'SQL' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Authentication Module Review' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description of the code to review' },
  { name: 'code_snippet', label: 'Code Snippet', type: 'textarea', rows: 10, required: true, placeholder: 'Paste your code here...' },
  {
    name: 'language',
    label: 'Language',
    type: 'select',
    required: true,
    options: [
      { value: 'javascript', label: 'JavaScript' },
      { value: 'typescript', label: 'TypeScript' },
      { value: 'python', label: 'Python' },
      { value: 'java', label: 'Java' },
      { value: 'go', label: 'Go' },
      { value: 'rust', label: 'Rust' },
      { value: 'sql', label: 'SQL' },
      { value: 'other', label: 'Other' },
    ],
  },
];

const sampleDataSets = [
  {
    label: 'Node.js Auth Middleware',
    data: {
      title: 'JWT Authentication Middleware',
      description: 'Review authentication middleware for security issues',
      code_snippet: `const jwt = require('jsonwebtoken');\n\nfunction authMiddleware(req, res, next) {\n  const token = req.headers.authorization;\n  if (!token) return res.status(401).json({ error: 'No token' });\n  try {\n    req.user = jwt.verify(token, process.env.JWT_SECRET);\n    next();\n  } catch (err) {\n    return res.status(403).json({ error: 'Invalid token' });\n  }\n}`,
      language: 'javascript',
    },
  },
];

function CodeReviews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [sortKey, setSortKey] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [issues, setIssues] = useState([]);
  const [showIssues, setShowIssues] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const fetchItems = useCallback(async () => {
    try {
      const result = await codeReviewsApi.getAll({
        page: pagination.page, limit: pagination.limit, search,
        sort: sortKey, order: sortOrder, ...filters
      });
      setItems(result.data || []);
      setPagination(prev => ({ ...prev, ...result.pagination }));
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, sortKey, sortOrder, filters]);

  const fetchIssues = async (reviewId) => {
    try {
      const data = await codeReviewsApi.getIssues(reviewId);
      setIssues(data);
    } catch (err) {
      if (selectedItem?.issues_data) {
        try {
          const parsed = typeof selectedItem.issues_data === 'string'
            ? JSON.parse(selectedItem.issues_data) : selectedItem.issues_data;
          setIssues(parsed);
        } catch { setIssues([]); }
      }
    }
  };

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (selectedItem?.id && selectedItem.status === 'completed') {
      fetchIssues(selectedItem.id);
    } else {
      setIssues([]);
    }
  }, [selectedItem?.id]);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      const created = await codeReviewsApi.create(data);
      setShowNewForm(false);
      showToast('Code review created', 'success');
      fetchItems();
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await codeReviewsApi.analyzeStructured(created.id);
        setSelectedItem(updated);
        if (updated.parsed_issues) setIssues(updated.parsed_issues);
        else fetchIssues(updated.id);
        fetchItems();
      } catch (aiErr) { console.error('AI error:', aiErr); }
      finally { setAiLoading(false); }
    } catch (err) {
      showToast('Error creating item: ' + err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setFormLoading(true);
    try {
      const updated = await codeReviewsApi.update(editItem.id, data);
      setEditItem(null);
      setSelectedItem(updated);
      showToast('Item updated', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error updating item: ' + err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm('Are you sure you want to delete this item?', { title: 'Delete Item', confirmLabel: 'Delete' });
    if (!confirmed) return;
    try {
      await codeReviewsApi.delete(id);
      setSelectedItem(null);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  };

  const handleAnalyze = async (id) => {
    setAiLoading(true);
    try {
      const updated = await codeReviewsApi.analyzeStructured(id);
      setSelectedItem(updated);
      if (updated.parsed_issues) setIssues(updated.parsed_issues);
      else fetchIssues(id);
      fetchItems();
    } catch (err) {
      showToast('Error analyzing: ' + err.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleFixed = async (issueId, fixed) => {
    try {
      await codeReviewsApi.updateIssue(selectedItem.id, issueId, { fixed });
      fetchIssues(selectedItem.id);
    } catch (err) {
      console.error('Error updating issue:', err);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortKey(key);
      setSortOrder('ASC');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Code Reviews</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            AI-powered code review with suggestions and best practices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="code_reviews" />
          <button onClick={() => setShowNewForm(true)} className="btn btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search code reviews..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="code_reviews"
          onBulkDelete={(ids) => bulkApi.delete('code_reviews', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('code_reviews', ids, data).then(fetchItems)}
          onClearSelection={() => setSelectedIds([])}
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onRowClick={setSelectedItem}
        pagination={pagination}
        onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination(prev => ({ ...prev, limit: l, page: 1 }))}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={handleSort}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyState={<EmptyState title="No code reviews yet" description="Create your first code review to get AI-powered suggestions." />}
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedItem && !editItem}
        onClose={() => { setSelectedItem(null); setShowIssues(false); }}
        title={selectedItem?.title}
        actions={
          <>
            <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
            <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
            <button
              onClick={() => handleAnalyze(selectedItem?.id)}
              className="btn btn-success flex items-center gap-2"
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : 'AI Review'}
            </button>
          </>
        }
      >
        {selectedItem && (
          <div className="space-y-6">
            {selectedItem.severity_score && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Severity Score</h4>
                    <SeverityScore score={selectedItem.severity_score} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{selectedItem.issues_count || 0} issues found</span>
                    {issues.length > 0 && <div className="mt-2"><SeveritySummary issues={issues} /></div>}
                  </div>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4>
              <p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Language</h4>
              <span className="badge badge-info">{selectedItem.language}</span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Code Snippet</h4>
              <pre className="text-sm overflow-x-auto">{selectedItem.code_snippet}</pre>
            </div>
            {issues.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Issues ({issues.length})</h4>
                  <button onClick={() => setShowIssues(!showIssues)} className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
                    {showIssues ? 'Hide Issues' : 'Show Issues'}
                  </button>
                </div>
                {showIssues && <IssuesList issues={issues} onToggleFixed={handleToggleFixed} />}
              </div>
            )}
            {selectedItem.review_result && !showIssues && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">AI Review Result</h4>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-green-800 dark:text-green-200 font-mono !bg-transparent !p-0">{selectedItem.review_result}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Code Review">
        {editItem && (
          <NewItemForm
            fields={formFields}
            onSubmit={handleEdit}
            onCancel={() => setEditItem(null)}
            loading={formLoading}
            initialData={editItem}
            submitLabel="Update"
          />
        )}
      </DetailModal>

      {/* New Item Modal */}
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Code Review">
        <NewItemForm
          fields={formFields}
          onSubmit={handleCreate}
          onCancel={() => setShowNewForm(false)}
          loading={formLoading}
          sampleDataSets={sampleDataSets}
        />
      </DetailModal>
    </div>
  );
}

export default CodeReviews;
