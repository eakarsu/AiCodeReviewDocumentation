import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { readmeGeneratorApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Project Name' },
  { key: 'tech_stack', label: 'Tech Stack', render: (val) => <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs block">{val}</span> },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
];

const formFields = [
  { name: 'title', label: 'Project Name', type: 'text', required: true, placeholder: 'e.g., E-Commerce Platform' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 3, required: true, placeholder: 'Brief project description' },
  { name: 'tech_stack', label: 'Tech Stack', type: 'text', required: true, placeholder: 'React, Node.js, PostgreSQL' },
  { name: 'project_structure', label: 'Project Structure', type: 'textarea', rows: 8, required: true, placeholder: 'src/\n  components/\n  pages/\n  api/' },
];

const sampleDataSets = [
  {
    label: 'Full-Stack SaaS App',
    data: {
      title: 'TaskFlow - Project Management SaaS',
      description: 'A modern project management platform with real-time collaboration, Kanban boards, Gantt charts, and team analytics. Built for agile teams.',
      tech_stack: 'React, TypeScript, Node.js, Express, PostgreSQL, Redis, Socket.io, Docker, AWS',
      project_structure: `src/
  client/
    components/
      Board/
      Timeline/
      Analytics/
    hooks/
    context/
    pages/
    utils/
  server/
    controllers/
    models/
    middleware/
    routes/
    services/
    websocket/
  shared/
    types/
    constants/
docker/
  Dockerfile
  docker-compose.yml
migrations/
tests/
  unit/
  integration/
  e2e/`,
    },
  },
  {
    label: 'CLI Developer Tool',
    data: {
      title: 'gitflow-cli - Git Workflow Automation',
      description: 'A command-line tool that automates Git branching workflows, semantic versioning, changelog generation, and release management.',
      tech_stack: 'Python, Click, GitPython, PyYAML, Jinja2',
      project_structure: `gitflow_cli/
  __init__.py
  cli.py
  commands/
    branch.py
    release.py
    changelog.py
    version.py
  core/
    git.py
    config.py
    semver.py
  templates/
    changelog.md.j2
    release_notes.md.j2
  utils/
    formatting.py
    validators.py
tests/
  test_branch.py
  test_release.py
  test_semver.py
setup.py
pyproject.toml`,
    },
  },
  {
    label: 'REST API Microservice',
    data: {
      title: 'PaymentGateway API',
      description: 'A microservice handling payment processing with Stripe and PayPal integration, webhook handling, and transaction reconciliation.',
      tech_stack: 'Go, Gin, GORM, PostgreSQL, RabbitMQ, Prometheus, Grafana, Docker, Kubernetes',
      project_structure: `cmd/
  server/
    main.go
internal/
  handlers/
    payment.go
    webhook.go
    refund.go
  services/
    stripe.go
    paypal.go
    reconciliation.go
  models/
    transaction.go
    payment.go
  middleware/
    auth.go
    ratelimit.go
    logging.go
  queue/
    publisher.go
    consumer.go
pkg/
  config/
  errors/
  logger/
deployments/
  kubernetes/
  terraform/
docs/
  openapi.yaml
Makefile
Dockerfile`,
    },
  },
];

function ReadmeGenerator() {
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
      const result = await readmeGeneratorApi.getAll({
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
      const created = await readmeGeneratorApi.create(data);
      setShowNewForm(false);
      showToast('README project created', 'success');
      fetchItems();
      // Auto-trigger AI generation
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await readmeGeneratorApi.generate(created.id);
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
      const updated = await readmeGeneratorApi.update(editItem.id, data);
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
      await readmeGeneratorApi.delete(id);
      setSelectedItem(null);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  };

  const handleGenerate = async (id) => {
    setAiLoading(true);
    try {
      const updated = await readmeGeneratorApi.generate(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error generating: ' + err.message, 'error');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">README Generator</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Auto-generate professional README files</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="readme_projects" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search README projects..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="readme_projects"
          onBulkDelete={(ids) => bulkApi.delete('readme_projects', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('readme_projects', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No README projects yet" description="Create your first README project to get AI-powered generation." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
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
                  <pre className="whitespace-pre-wrap text-sm text-teal-800 dark:text-teal-200 !bg-transparent !p-0">{selectedItem.generated_readme}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit README Project">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New README Project">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default ReadmeGenerator;
