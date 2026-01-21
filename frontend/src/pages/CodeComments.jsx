import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import { codeCommentsApi } from '../services/api';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'comment_style', label: 'Style', render: (val) => <span className="badge badge-gray">{val || 'N/A'}</span> },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., User Auth Function Comments' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description' },
  { name: 'code_snippet', label: 'Code Snippet', type: 'textarea', rows: 10, required: true, placeholder: 'Paste code to comment...' },
  { name: 'language', label: 'Language', type: 'select', required: true, options: [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
  ]},
  { name: 'comment_style', label: 'Comment Style', type: 'select', required: true, options: [
    { value: 'JSDoc', label: 'JSDoc' },
    { value: 'inline', label: 'Inline Comments' },
    { value: 'docstring', label: 'Docstrings' },
    { value: 'comprehensive', label: 'Comprehensive' },
  ]},
];

function CodeComments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = async () => {
    try { const data = await codeCommentsApi.getAll(); setItems(data); }
    catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try { await codeCommentsApi.create(data); setShowNewForm(false); fetchItems(); }
    catch (err) { alert('Error: ' + err.message); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try { await codeCommentsApi.delete(id); setSelectedItem(null); fetchItems(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const handleGenerate = async (id) => {
    setAiLoading(true);
    try { const updated = await codeCommentsApi.generate(id); setSelectedItem(updated); fetchItems(); }
    catch (err) { alert('Error: ' + err.message); }
    finally { setAiLoading(false); }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Code Comments</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">AI-generated inline comments and docstrings</p>
          </div>
        </div>
        <button onClick={() => setShowNewForm(true)} className="btn btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add New
        </button>
      </div>

      <DataTable columns={columns} data={items} loading={loading} onRowClick={setSelectedItem} />

      <DetailModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleGenerate(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>{aiLoading ? 'Generating...' : 'Generate Comments'}</button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="flex gap-4">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Language</h4><span className="badge badge-info">{selectedItem.language}</span></div>
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Comment Style</h4><span className="badge badge-gray">{selectedItem.comment_style}</span></div>
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Original Code</h4><pre className="text-sm overflow-x-auto">{selectedItem.code_snippet}</pre></div>
            {selectedItem.generated_comments && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Generated Comments</h4>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-indigo-800 dark:text-indigo-200">{selectedItem.generated_comments}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Code Comments">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} />
      </DetailModal>
    </div>
  );
}

export default CodeComments;
