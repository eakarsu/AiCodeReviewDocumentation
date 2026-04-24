import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { apiDocsApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'method', label: 'Method', render: (val) => <span className={`badge ${val === 'GET' ? 'badge-success' : val === 'POST' ? 'badge-info' : val === 'PUT' ? 'badge-warning' : 'badge-danger'}`}>{val}</span> },
  { key: 'endpoint', label: 'Endpoint', render: (val) => <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{val}</code> },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'method', label: 'Method', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' }] },
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

const sampleDataSets = [
  {
    label: 'Create User Endpoint',
    data: {
      title: 'Create User API',
      description: 'User registration endpoint with validation',
      endpoint: '/api/v1/users',
      method: 'POST',
      request_body: `{
  "name": "string (required, 2-50 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "role": "string (optional, enum: admin|user|moderator)"
}`,
      response_body: `{
  "id": "number",
  "name": "string",
  "email": "string",
  "role": "string",
  "createdAt": "ISO 8601 datetime",
  "token": "JWT string"
}`,
    },
  },
  {
    label: 'Search Products Endpoint',
    data: {
      title: 'Product Search API',
      description: 'Full-text search with filters and pagination',
      endpoint: '/api/v1/products/search',
      method: 'GET',
      request_body: `Query Parameters:
  q: "string (search query)"
  category: "string (optional filter)"
  minPrice: "number (optional)"
  maxPrice: "number (optional)"
  page: "number (default: 1)"
  limit: "number (default: 20, max: 100)"
  sortBy: "string (price|rating|newest)"`,
      response_body: `{
  "products": [
    {
      "id": "number",
      "name": "string",
      "price": "number",
      "category": "string",
      "rating": "number",
      "inStock": "boolean"
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "pages": "number",
    "limit": "number"
  }
}`,
    },
  },
  {
    label: 'Update Order Status',
    data: {
      title: 'Update Order Status API',
      description: 'Order status management with state machine validation',
      endpoint: '/api/v1/orders/:orderId/status',
      method: 'PUT',
      request_body: `{
  "status": "string (enum: pending|confirmed|processing|shipped|delivered|cancelled)",
  "note": "string (optional, reason for status change)",
  "trackingNumber": "string (required if status=shipped)",
  "estimatedDelivery": "ISO 8601 date (optional)"
}`,
      response_body: `{
  "orderId": "number",
  "previousStatus": "string",
  "newStatus": "string",
  "updatedAt": "ISO 8601 datetime",
  "statusHistory": [
    {
      "status": "string",
      "timestamp": "ISO 8601 datetime",
      "note": "string"
    }
  ]
}`,
    },
  },
];

function ApiDocs() {
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
      const result = await apiDocsApi.getAll({
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
      const created = await apiDocsApi.create(data);
      setShowNewForm(false);
      showToast('API documentation created', 'success');
      fetchItems();
      // Auto-trigger AI generation
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await apiDocsApi.generate(created.id);
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
      const updated = await apiDocsApi.update(editItem.id, data);
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
      await apiDocsApi.delete(id);
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
      const updated = await apiDocsApi.generate(id);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Generate comprehensive API documentation</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="api_docs" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search API docs..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="api_docs"
          onBulkDelete={(ids) => bulkApi.delete('api_docs', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('api_docs', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No API docs yet" description="Create your first API documentation to get AI-powered generation." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
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
                  <pre className="whitespace-pre-wrap text-sm text-orange-800 dark:text-orange-200 !bg-transparent !p-0">{selectedItem.generated_docs}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit API Documentation">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New API Documentation">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default ApiDocs;
