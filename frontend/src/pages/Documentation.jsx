import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { documentationApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'doc_type', label: 'Type', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-gray">{val || 'N/A'}</span> },
  {
    key: 'status',
    label: 'Status',
    render: (val) => (
      <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span>
    ),
  },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'doc_type', label: 'Type', options: [{ value: 'API', label: 'API' }, { value: 'Module', label: 'Module' }, { value: 'Library', label: 'Library' }, { value: 'Schema', label: 'Schema' }, { value: 'Service', label: 'Service' }] },
  { key: 'language', label: 'Language', options: [{ value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'go', label: 'Go' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., UserService Documentation' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description' },
  { name: 'source_code', label: 'Source Code', type: 'textarea', rows: 10, required: true, placeholder: 'Paste code to document...' },
  {
    name: 'doc_type',
    label: 'Documentation Type',
    type: 'select',
    required: true,
    options: [
      { value: 'API', label: 'API' },
      { value: 'Module', label: 'Module' },
      { value: 'Library', label: 'Library' },
      { value: 'Schema', label: 'Schema' },
      { value: 'Service', label: 'Service' },
    ],
  },
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
    ],
  },
];

const sampleDataSets = [
  {
    label: 'Express REST Controller',
    data: {
      title: 'User Controller Documentation',
      description: 'Generate docs for REST API controller',
      source_code: `const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

router.get('/users', async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  const query = search ? { name: { $regex: search, $options: 'i' } } : {};
  const users = await User.find(query)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .select('-password');
  const total = await User.countDocuments(query);
  res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
});

router.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword, role });
  res.status(201).json({ id: user._id, name, email, role });
});

router.put('/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

module.exports = router;`,
      doc_type: 'API',
      language: 'javascript',
    },
  },
  {
    label: 'Python Data Pipeline',
    data: {
      title: 'ETL Pipeline Module',
      description: 'Document data transformation pipeline',
      source_code: `import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional

class DataPipeline:
    def __init__(self, source_config: Dict, target_config: Dict):
        self.source = source_config
        self.target = target_config
        self.transformations = []
        self.metrics = {'rows_processed': 0, 'errors': 0}

    def extract(self, query: str, params: Optional[Dict] = None) -> pd.DataFrame:
        df = pd.read_sql(query, self.source['connection'], params=params)
        self.metrics['rows_processed'] = len(df)
        return df

    def transform(self, df: pd.DataFrame, rules: List[Dict]) -> pd.DataFrame:
        for rule in rules:
            if rule['type'] == 'rename':
                df = df.rename(columns=rule['mapping'])
            elif rule['type'] == 'filter':
                df = df.query(rule['condition'])
            elif rule['type'] == 'aggregate':
                df = df.groupby(rule['group_by']).agg(rule['aggregations'])
            elif rule['type'] == 'derive':
                df[rule['column']] = df.eval(rule['expression'])
        return df

    def load(self, df: pd.DataFrame, table: str, mode: str = 'append') -> int:
        rows = df.to_sql(table, self.target['connection'], if_exists=mode, index=False)
        return rows

    def run(self, query: str, rules: List[Dict], table: str) -> Dict:
        start = datetime.now()
        df = self.extract(query)
        df = self.transform(df, rules)
        rows = self.load(df, table)
        return {**self.metrics, 'duration': (datetime.now() - start).seconds, 'loaded': rows}`,
      doc_type: 'Module',
      language: 'python',
    },
  },
  {
    label: 'TypeScript Service Class',
    data: {
      title: 'Payment Service Documentation',
      description: 'Generate documentation for payment processing service',
      source_code: `interface PaymentRequest {
  amount: number;
  currency: string;
  customerId: string;
  paymentMethod: 'card' | 'bank_transfer' | 'wallet';
  metadata?: Record<string, string>;
}

interface PaymentResult {
  id: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
  fee: number;
  createdAt: Date;
}

class PaymentService {
  private gateway: PaymentGateway;
  private retryCount: number = 3;

  constructor(gateway: PaymentGateway) {
    this.gateway = gateway;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    this.validateRequest(request);
    const fee = this.calculateFee(request.amount, request.paymentMethod);

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const result = await this.gateway.charge({
          ...request,
          totalAmount: request.amount + fee,
        });
        await this.recordTransaction(result);
        return { ...result, fee };
      } catch (error) {
        if (attempt === this.retryCount) throw error;
        await this.delay(attempt * 1000);
      }
    }
    throw new Error('Payment failed after retries');
  }

  private calculateFee(amount: number, method: string): number {
    const rates = { card: 0.029, bank_transfer: 0.008, wallet: 0.015 };
    return Math.round(amount * (rates[method] || 0.029) * 100) / 100;
  }

  private validateRequest(req: PaymentRequest): void {
    if (req.amount <= 0) throw new Error('Amount must be positive');
    if (!req.customerId) throw new Error('Customer ID required');
  }
}`,
      doc_type: 'Service',
      language: 'typescript',
    },
  },
];

function Documentation() {
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
      const result = await documentationApi.getAll({
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
      const created = await documentationApi.create(data);
      setShowNewForm(false);
      showToast('Documentation created', 'success');
      fetchItems();
      // Auto-trigger AI generation
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await documentationApi.generate(created.id);
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
      const updated = await documentationApi.update(editItem.id, data);
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
      await documentationApi.delete(id);
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
      const updated = await documentationApi.generate(id);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documentation</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Auto-generate documentation from code files</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="documentation" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search documentation..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="documentation"
          onBulkDelete={(ids) => bulkApi.delete('documentation', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('documentation', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No documentation yet" description="Create your first documentation to get AI-powered generation." />}
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedItem && !editItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title}
        actions={
          <>
            <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
            <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
            <button onClick={() => handleGenerate(selectedItem?.id)} className="btn btn-success flex items-center gap-2" disabled={aiLoading}>
              {aiLoading ? 'Generating...' : 'Generate Docs'}
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
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Source Code</h4>
              <pre className="text-sm overflow-x-auto">{selectedItem.source_code}</pre>
            </div>
            {selectedItem.generated_docs && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Generated Documentation</h4>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-green-800 dark:text-green-200 !bg-transparent !p-0">{selectedItem.generated_docs}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Documentation">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Documentation">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default Documentation;
