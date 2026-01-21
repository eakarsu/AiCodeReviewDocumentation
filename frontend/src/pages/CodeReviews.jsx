import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import { codeReviewsApi } from '../services/api';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
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

function CodeReviews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await codeReviewsApi.getAll();
      setItems(data);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      await codeReviewsApi.create(data);
      setShowNewForm(false);
      fetchItems();
    } catch (err) {
      alert('Error creating item: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await codeReviewsApi.delete(id);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      alert('Error deleting item: ' + err.message);
    }
  };

  const handleAnalyze = async (id) => {
    setAiLoading(true);
    try {
      const updated = await codeReviewsApi.analyze(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      alert('Error analyzing: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Code Reviews</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              AI-powered code review with suggestions and best practices
            </p>
          </div>
        </div>
        <button onClick={() => setShowNewForm(true)} className="btn btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New
        </button>
      </div>

      <DataTable columns={columns} data={items} loading={loading} onRowClick={setSelectedItem} />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title}
        actions={
          <>
            <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">
              Delete
            </button>
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
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI Review
                </>
              )}
            </button>
          </>
        }
      >
        {selectedItem && (
          <div className="space-y-6">
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

            {selectedItem.review_result && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">AI Review Result</h4>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-green-800 dark:text-green-200 font-mono">
                    {selectedItem.review_result}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* New Item Modal */}
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Code Review">
        <NewItemForm
          fields={formFields}
          onSubmit={handleCreate}
          onCancel={() => setShowNewForm(false)}
          loading={formLoading}
        />
      </DetailModal>
    </div>
  );
}

export default CodeReviews;
