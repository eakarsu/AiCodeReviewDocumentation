import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import AIResultDisplay from '../components/AIResultDisplay';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { dependencyAuditApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'package_manager', label: 'Package Manager', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'project_type', label: 'Project Type', render: (val) => val || 'N/A' },
  { key: 'risk_score', label: 'Risk Score', render: (val) => (
    <span className={`badge ${val >= 70 ? 'badge-danger' : val >= 40 ? 'badge-warning' : val ? 'badge-success' : ''}`}>
      {val ? `${val}/100` : 'N/A'}
    </span>
  )},
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Frontend Dependencies Audit' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description of the project' },
  { name: 'dependencies_list', label: 'Dependencies', type: 'textarea', rows: 10, required: true, placeholder: 'Paste your package.json dependencies, requirements.txt, go.mod, etc...' },
  { name: 'package_manager', label: 'Package Manager', type: 'select', required: true, options: [
    { value: 'npm', label: 'npm (Node.js)' },
    { value: 'yarn', label: 'Yarn' },
    { value: 'pip', label: 'pip (Python)' },
    { value: 'poetry', label: 'Poetry (Python)' },
    { value: 'maven', label: 'Maven (Java)' },
    { value: 'gradle', label: 'Gradle (Java)' },
    { value: 'go', label: 'Go Modules' },
    { value: 'cargo', label: 'Cargo (Rust)' },
    { value: 'composer', label: 'Composer (PHP)' },
    { value: 'bundler', label: 'Bundler (Ruby)' },
  ]},
  { name: 'project_type', label: 'Project Type', type: 'select', options: [
    { value: 'web-frontend', label: 'Web Frontend' },
    { value: 'web-backend', label: 'Web Backend' },
    { value: 'api', label: 'API Service' },
    { value: 'cli', label: 'CLI Tool' },
    { value: 'library', label: 'Library/Package' },
    { value: 'mobile', label: 'Mobile App' },
    { value: 'microservice', label: 'Microservice' },
  ]},
];

const sampleDataSets = [
  {
    label: 'Node.js Web App',
    data: {
      title: 'Express API Dependencies Audit',
      description: 'Audit production dependencies for a Node.js REST API',
      dependencies_list: `{
  "dependencies": {
    "express": "^4.17.1",
    "mongoose": "^5.13.0",
    "jsonwebtoken": "^8.5.1",
    "bcrypt": "^5.0.1",
    "cors": "^2.8.5",
    "helmet": "^4.6.0",
    "morgan": "^1.10.0",
    "dotenv": "^10.0.0",
    "joi": "^17.4.0",
    "lodash": "^4.17.20",
    "moment": "^2.29.1",
    "axios": "^0.21.1",
    "multer": "^1.4.2",
    "nodemailer": "^6.6.0",
    "redis": "^3.1.2",
    "socket.io": "^4.1.0",
    "winston": "^3.3.3"
  },
  "devDependencies": {
    "jest": "^27.0.0",
    "nodemon": "^2.0.7",
    "eslint": "^7.32.0",
    "supertest": "^6.1.0"
  }
}`,
      package_manager: 'npm',
      project_type: 'web-backend',
    },
  },
  {
    label: 'Python ML Project',
    data: {
      title: 'ML Pipeline Dependencies',
      description: 'Audit Python machine learning project packages',
      dependencies_list: `# requirements.txt
numpy==1.21.0
pandas==1.3.0
scikit-learn==0.24.2
tensorflow==2.6.0
torch==1.9.0
transformers==4.9.0
flask==1.1.4
gunicorn==20.1.0
celery==4.4.7
redis==3.5.3
sqlalchemy==1.3.24
psycopg2-binary==2.8.6
boto3==1.18.0
pillow==8.2.0
requests==2.25.1
pyyaml==5.4.1
python-dotenv==0.19.0
cryptography==3.4.7
paramiko==2.7.2
jinja2==2.11.3
matplotlib==3.4.2
seaborn==0.11.1
jupyter==1.0.0
black==21.7b0
pytest==6.2.4
mypy==0.910`,
      package_manager: 'pip',
      project_type: 'api',
    },
  },
  {
    label: 'React Frontend',
    data: {
      title: 'React SPA Dependencies',
      description: 'Audit frontend dependencies for security and bundle size',
      dependencies_list: `{
  "dependencies": {
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-router-dom": "^5.3.0",
    "redux": "^4.1.0",
    "react-redux": "^7.2.4",
    "redux-thunk": "^2.3.0",
    "axios": "^0.21.1",
    "formik": "^2.2.9",
    "yup": "^0.32.9",
    "moment": "^2.29.1",
    "lodash": "^4.17.20",
    "antd": "^4.16.0",
    "styled-components": "^5.3.0",
    "chart.js": "^3.5.0",
    "react-chartjs-2": "^3.0.0",
    "i18next": "^20.3.0",
    "react-i18next": "^11.11.0",
    "socket.io-client": "^4.1.0",
    "dompurify": "^2.3.0",
    "marked": "^2.1.0"
  },
  "devDependencies": {
    "react-scripts": "4.0.3",
    "typescript": "^4.3.0",
    "@testing-library/react": "^12.0.0",
    "cypress": "^8.0.0",
    "eslint": "^7.32.0",
    "prettier": "^2.3.0"
  }
}`,
      package_manager: 'npm',
      project_type: 'web-frontend',
    },
  },
];

function DependencyAudit() {
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
  const { showToast } = useToast();
  const confirm = useConfirm();

  const fetchItems = useCallback(async () => {
    try {
      const result = await dependencyAuditApi.getAll({
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

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      const created = await dependencyAuditApi.create(data);
      setShowNewForm(false);
      showToast('Dependency audit created', 'success');
      fetchItems();
      // Auto-trigger AI audit
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await dependencyAuditApi.audit(created.id);
        setSelectedItem(updated);
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
      const updated = await dependencyAuditApi.update(editItem.id, data);
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
      await dependencyAuditApi.delete(id);
      setSelectedItem(null);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  };

  const handleAudit = async (id) => {
    setAiLoading(true);
    try {
      const updated = await dependencyAuditApi.audit(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error running audit: ' + err.message, 'error');
    } finally {
      setAiLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Dependency Auditor</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Audit dependencies for vulnerabilities and issues</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="dependency_audits" />
          <button onClick={() => setShowNewForm(true)} className="btn btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add New
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search dependency audits..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="dependency_audits"
          onBulkDelete={(ids) => bulkApi.delete('dependency_audits', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('dependency_audits', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No dependency audits yet" description="Create your first dependency audit to get AI-powered analysis." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleAudit(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>
            {aiLoading ? 'Auditing...' : 'Run Audit'}
          </button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="flex gap-4 flex-wrap">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Package Manager</h4><span className="badge badge-info">{selectedItem.package_manager}</span></div>
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Project Type</h4><span className="badge badge-purple">{selectedItem.project_type || 'N/A'}</span></div>
              {selectedItem.risk_score && (
                <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Risk Score</h4>
                  <span className={`badge ${selectedItem.risk_score >= 70 ? 'badge-danger' : selectedItem.risk_score >= 40 ? 'badge-warning' : 'badge-success'}`}>
                    {selectedItem.risk_score}/100
                  </span>
                </div>
              )}
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Dependencies</h4><pre className="text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-60">{selectedItem.dependencies_list}</pre></div>
            {selectedItem.ai_analysis && (
              <AIResultDisplay content={selectedItem.ai_analysis} title="Dependency Audit Results" />
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Dependency Audit">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Dependency Audit">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default DependencyAudit;
