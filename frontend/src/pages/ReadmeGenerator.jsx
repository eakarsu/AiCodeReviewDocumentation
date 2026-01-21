import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import { readmeGeneratorApi } from '../services/api';

const columns = [
  { key: 'title', label: 'Project Name' },
  { key: 'tech_stack', label: 'Tech Stack', render: (val) => <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs block">{val}</span> },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const formFields = [
  { name: 'title', label: 'Project Name', type: 'text', required: true, placeholder: 'e.g., E-Commerce Platform' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 3, required: true, placeholder: 'Brief project description' },
  { name: 'tech_stack', label: 'Tech Stack', type: 'text', required: true, placeholder: 'React, Node.js, PostgreSQL' },
  { name: 'project_structure', label: 'Project Structure', type: 'textarea', rows: 8, required: true, placeholder: 'src/\n  components/\n  pages/\n  api/' },
];

function ReadmeGenerator() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = async () => {
    try { const data = await readmeGeneratorApi.getAll(); setItems(data); }
    catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try { await readmeGeneratorApi.create(data); setShowNewForm(false); fetchItems(); }
    catch (err) { alert('Error: ' + err.message); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try { await readmeGeneratorApi.delete(id); setSelectedItem(null); fetchItems(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const handleGenerate = async (id) => {
    setAiLoading(true);
    try { const updated = await readmeGeneratorApi.generate(id); setSelectedItem(updated); fetchItems(); }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">README Generator</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Auto-generate professional README files</p>
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
          <button onClick={() => handleGenerate(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>{aiLoading ? 'Generating...' : 'Generate README'}</button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description}</p></div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tech Stack</h4><p className="text-gray-900 dark:text-white">{selectedItem.tech_stack}</p></div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Project Structure</h4><pre className="text-sm overflow-x-auto">{selectedItem.project_structure}</pre></div>
            {selectedItem.generated_readme && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Generated README</h4>
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-teal-800 dark:text-teal-200">{selectedItem.generated_readme}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New README Project">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} />
      </DetailModal>
    </div>
  );
}

export default ReadmeGenerator;
