import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import { apiDocsApi } from '../services/api';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'method', label: 'Method', render: (val) => <span className={`badge ${val === 'GET' ? 'badge-success' : val === 'POST' ? 'badge-info' : val === 'PUT' ? 'badge-warning' : 'badge-danger'}`}>{val}</span> },
  { key: 'endpoint', label: 'Endpoint', render: (val) => <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{val}</code> },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Create User Endpoint' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description of the endpoint' },
  { name: 'endpoint', label: 'Endpoint', type: 'text', required: true, placeholder: '/api/users/:id' },
  { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'PATCH', label: 'PATCH' },
  ]},
  { name: 'request_body', label: 'Request Body (JSON)', type: 'textarea', rows: 4, placeholder: '{ "field": "type" }' },
  { name: 'response_body', label: 'Response Body (JSON)', type: 'textarea', rows: 4, placeholder: '{ "id": "number", "name": "string" }' },
];

function ApiDocs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = async () => {
    try { const data = await apiDocsApi.getAll(); setItems(data); }
    catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try { await apiDocsApi.create(data); setShowNewForm(false); fetchItems(); }
    catch (err) { alert('Error: ' + err.message); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try { await apiDocsApi.delete(id); setSelectedItem(null); fetchItems(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const handleGenerate = async (id) => {
    setAiLoading(true);
    try { const updated = await apiDocsApi.generate(id); setSelectedItem(updated); fetchItems(); }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Generate comprehensive API documentation</p>
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
          <button onClick={() => handleGenerate(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>{aiLoading ? 'Generating...' : 'Generate Docs'}</button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className={`badge ${selectedItem.method === 'GET' ? 'badge-success' : selectedItem.method === 'POST' ? 'badge-info' : 'badge-warning'}`}>{selectedItem.method}</span>
              <code className="text-lg font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">{selectedItem.endpoint}</code>
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            {selectedItem.request_body && <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Request Body</h4><pre className="text-sm overflow-x-auto">{selectedItem.request_body}</pre></div>}
            {selectedItem.response_body && <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Response Body</h4><pre className="text-sm overflow-x-auto">{selectedItem.response_body}</pre></div>}
            {selectedItem.generated_docs && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Generated Documentation</h4>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-orange-800 dark:text-orange-200">{selectedItem.generated_docs}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New API Documentation">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} />
      </DetailModal>
    </div>
  );
}

export default ApiDocs;
