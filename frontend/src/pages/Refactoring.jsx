import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import DiffViewer from '../components/DiffViewer';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { refactoringApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'improvement_type', label: 'Type', render: (val) => <span className="badge badge-gray">{val || 'N/A'}</span> },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'language', label: 'Language', options: [{ value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'go', label: 'Go' }] },
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

const sampleDataSets = [
  {
    label: 'Callback Hell',
    data: {
      title: 'Callback to Async/Await Refactor',
      description: 'Convert deeply nested callbacks to async/await',
      original_code: `function processOrder(orderId, callback) {
  getOrder(orderId, function(err, order) {
    if (err) return callback(err);
    validateInventory(order.items, function(err, available) {
      if (err) return callback(err);
      if (!available) return callback(new Error('Out of stock'));
      calculateTotal(order, function(err, total) {
        if (err) return callback(err);
        processPayment(order.customerId, total, function(err, payment) {
          if (err) return callback(err);
          updateOrderStatus(orderId, 'paid', function(err) {
            if (err) return callback(err);
            sendConfirmationEmail(order.customerId, orderId, function(err) {
              if (err) return callback(err);
              updateAnalytics('order_completed', { orderId, total }, function(err) {
                if (err) console.log('Analytics error:', err);
                callback(null, { orderId, total, paymentId: payment.id });
              });
            });
          });
        });
      });
    });
  });
}`,
      language: 'javascript',
      improvement_type: 'Async/Await',
    },
  },
  {
    label: 'Long Switch Statement',
    data: {
      title: 'Switch to Strategy Pattern',
      description: 'Replace long switch with strategy/map pattern',
      original_code: `function calculateShipping(order) {
  let cost = 0;
  switch (order.shippingMethod) {
    case 'standard':
      cost = order.weight * 0.5;
      if (order.total > 50) cost = 0;
      if (order.destination === 'international') cost *= 3;
      break;
    case 'express':
      cost = order.weight * 1.5 + 10;
      if (order.total > 100) cost *= 0.8;
      if (order.destination === 'international') cost *= 2.5;
      break;
    case 'overnight':
      cost = order.weight * 3 + 25;
      if (order.destination === 'international') cost *= 2;
      break;
    case 'freight':
      cost = order.weight * 0.3;
      if (order.weight > 100) cost *= 0.7;
      cost += 50;
      break;
    case 'drone':
      if (order.weight > 5) throw new Error('Too heavy for drone');
      cost = 15;
      if (order.destination === 'international') throw new Error('Domestic only');
      break;
    default:
      throw new Error('Unknown shipping method');
  }
  cost += order.insurance ? cost * 0.1 : 0;
  cost += order.giftWrap ? 5 : 0;
  return Math.round(cost * 100) / 100;
}`,
      language: 'javascript',
      improvement_type: 'Design Pattern',
    },
  },
  {
    label: 'Duplicated Code',
    data: {
      title: 'DRY Principle Refactoring',
      description: 'Remove code duplication across similar functions',
      original_code: `function formatUserReport(users) {
  let report = '=== USER REPORT ===\\n';
  report += 'Generated: ' + new Date().toISOString() + '\\n';
  report += 'Total Records: ' + users.length + '\\n';
  report += '-------------------\\n';
  for (const user of users) {
    report += user.name + ' | ' + user.email + ' | ' + user.role + '\\n';
  }
  report += '-------------------\\n';
  report += 'End of Report\\n';
  return report;
}

function formatOrderReport(orders) {
  let report = '=== ORDER REPORT ===\\n';
  report += 'Generated: ' + new Date().toISOString() + '\\n';
  report += 'Total Records: ' + orders.length + '\\n';
  report += '-------------------\\n';
  for (const order of orders) {
    report += order.id + ' | ' + order.customer + ' | $' + order.total + '\\n';
  }
  report += '-------------------\\n';
  report += 'End of Report\\n';
  return report;
}

function formatProductReport(products) {
  let report = '=== PRODUCT REPORT ===\\n';
  report += 'Generated: ' + new Date().toISOString() + '\\n';
  report += 'Total Records: ' + products.length + '\\n';
  report += '-------------------\\n';
  for (const product of products) {
    report += product.name + ' | $' + product.price + ' | Stock: ' + product.stock + '\\n';
  }
  report += '-------------------\\n';
  report += 'End of Report\\n';
  return report;
}`,
      language: 'javascript',
      improvement_type: 'DRY',
    },
  },
];

function Refactoring() {
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
      const result = await refactoringApi.getAll({
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
      const created = await refactoringApi.create(data);
      setShowNewForm(false);
      showToast('Refactoring request created', 'success');
      fetchItems();
      // Auto-trigger AI suggestions
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await refactoringApi.suggest(created.id);
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
      const updated = await refactoringApi.update(editItem.id, data);
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
      await refactoringApi.delete(id);
      setSelectedItem(null);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  };

  const handleSuggest = async (id) => {
    setAiLoading(true);
    try {
      const updated = await refactoringApi.suggest(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error getting suggestions: ' + err.message, 'error');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refactoring Suggestions</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Code improvement recommendations</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="refactoring_suggestions" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search refactoring suggestions..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="refactoring_suggestions"
          onBulkDelete={(ids) => bulkApi.delete('refactoring_suggestions', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('refactoring_suggestions', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No refactoring suggestions yet" description="Create your first refactoring request to get AI-powered suggestions." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
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
            {selectedItem.refactored_code ? (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Code Comparison</h4>
                <DiffViewer
                  oldCode={selectedItem.original_code}
                  newCode={selectedItem.refactored_code}
                  oldTitle="Original"
                  newTitle="Refactored"
                  language={selectedItem.language}
                />
              </div>
            ) : (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Original Code</h4><pre className="text-sm overflow-x-auto">{selectedItem.original_code}</pre></div>
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

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Refactoring Request">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Refactoring Request">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default Refactoring;
