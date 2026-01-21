import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import { refactoringApi } from '../services/api';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'improvement_type', label: 'Type', render: (val) => <span className="badge badge-gray">{val || 'N/A'}</span> },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Callback Hell Refactoring' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description' },
  { name: 'original_code', label: 'Original Code', type: 'textarea', rows: 10, required: true, placeholder: 'Paste code to refactor...' },
  { name: 'language', label: 'Language', type: 'select', required: true, options: [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
  ]},
  { name: 'improvement_type', label: 'Improvement Type', type: 'select', required: true, options: [
    { value: 'Async/Await', label: 'Async/Await Conversion' },
    { value: 'Extract Method', label: 'Extract Method' },
    { value: 'Design Pattern', label: 'Design Pattern' },
    { value: 'Functional', label: 'Functional Programming' },
    { value: 'ES6 Syntax', label: 'Modern ES6+ Syntax' },
    { value: 'DRY', label: 'DRY (Remove Duplication)' },
    { value: 'Guard Clauses', label: 'Guard Clauses' },
    { value: 'Error Handling', label: 'Error Handling' },
  ]},
];

function Refactoring() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = async () => {
    try { const data = await refactoringApi.getAll(); setItems(data); }
    catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try { await refactoringApi.create(data); setShowNewForm(false); fetchItems(); }
    catch (err) { alert('Error: ' + err.message); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try { await refactoringApi.delete(id); setSelectedItem(null); fetchItems(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const handleSuggest = async (id) => {
    setAiLoading(true);
    try { const updated = await refactoringApi.suggest(id); setSelectedItem(updated); fetchItems(); }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refactoring Suggestions</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Code improvement recommendations</p>
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
          <button onClick={() => handleSuggest(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>{aiLoading ? 'Generating...' : 'Get Suggestions'}</button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="flex gap-4">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Language</h4><span className="badge badge-info">{selectedItem.language}</span></div>
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Improvement Type</h4><span className="badge badge-gray">{selectedItem.improvement_type}</span></div>
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Original Code</h4><pre className="text-sm overflow-x-auto">{selectedItem.original_code}</pre></div>
            {selectedItem.refactored_code && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Refactored Code</h4>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-cyan-800 dark:text-cyan-200">{selectedItem.refactored_code}</pre>
                </div>
              </div>
            )}
            {selectedItem.rationale && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Rationale</h4>
                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <p className="text-sm text-gray-800 dark:text-gray-200">{selectedItem.rationale}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Refactoring Request">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} />
      </DetailModal>
    </div>
  );
}

export default Refactoring;
