import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { testGenerationApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'test_framework', label: 'Framework', render: (val) => <span className="badge badge-gray">{val || 'N/A'}</span> },
  { key: 'coverage_estimate', label: 'Coverage', render: (val) => val ? <span className={`badge ${val >= 80 ? 'badge-success' : val >= 50 ? 'badge-warning' : 'badge-danger'}`}>{val}%</span> : 'N/A' },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'language', label: 'Language', options: [{ value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'go', label: 'Go' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., User Registration Tests' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description' },
  { name: 'source_code', label: 'Source Code', type: 'textarea', rows: 10, required: true, placeholder: 'Paste code to test...' },
  { name: 'language', label: 'Language', type: 'select', required: true, options: [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
  ]},
  { name: 'test_framework', label: 'Test Framework', type: 'select', required: true, options: [
    { value: 'Jest', label: 'Jest' },
    { value: 'Mocha', label: 'Mocha' },
    { value: 'Vitest', label: 'Vitest' },
    { value: 'pytest', label: 'pytest' },
    { value: 'JUnit', label: 'JUnit' },
    { value: 'React Testing Library', label: 'React Testing Library' },
  ]},
];

const sampleDataSets = [
  {
    label: 'Shopping Cart Logic',
    data: {
      title: 'Shopping Cart Unit Tests',
      description: 'Generate tests for cart add/remove/total calculations',
      source_code: `class ShoppingCart {
  constructor() {
    this.items = [];
    this.discountCode = null;
  }

  addItem(product, quantity = 1) {
    const existing = this.items.find(i => i.product.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({ product, quantity });
    }
  }

  removeItem(productId) {
    this.items = this.items.filter(i => i.product.id !== productId);
  }

  updateQuantity(productId, quantity) {
    if (quantity <= 0) return this.removeItem(productId);
    const item = this.items.find(i => i.product.id === productId);
    if (item) item.quantity = quantity;
  }

  applyDiscount(code) {
    const discounts = { SAVE10: 0.1, SAVE20: 0.2, HALF: 0.5 };
    if (discounts[code]) {
      this.discountCode = { code, rate: discounts[code] };
      return true;
    }
    return false;
  }

  getSubtotal() {
    return this.items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
  }

  getTax(rate = 0.08) {
    return Math.round(this.getSubtotal() * rate * 100) / 100;
  }

  getTotal() {
    let subtotal = this.getSubtotal();
    if (this.discountCode) subtotal *= (1 - this.discountCode.rate);
    return Math.round((subtotal + this.getTax()) * 100) / 100;
  }

  getItemCount() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  }
}`,
      language: 'javascript',
      test_framework: 'Jest',
    },
  },
  {
    label: 'Python Validator',
    data: {
      title: 'Input Validator Tests',
      description: 'Generate tests for form validation utility',
      source_code: `import re
from datetime import datetime

class Validator:
    @staticmethod
    def email(value):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, value))

    @staticmethod
    def password(value, min_length=8):
        if len(value) < min_length:
            return False, 'Too short'
        if not re.search(r'[A-Z]', value):
            return False, 'Need uppercase'
        if not re.search(r'[a-z]', value):
            return False, 'Need lowercase'
        if not re.search(r'[0-9]', value):
            return False, 'Need digit'
        if not re.search(r'[!@#$%^&*]', value):
            return False, 'Need special char'
        return True, 'Valid'

    @staticmethod
    def phone(value, country='US'):
        patterns = {
            'US': r'^\\\\+?1?[-.\\\\s]?\\\\(?\\\\d{3}\\\\)?[-.\\\\s]?\\\\d{3}[-.\\\\s]?\\\\d{4}$',
            'UK': r'^\\\\+?44[-.\\\\s]?\\\\d{4}[-.\\\\s]?\\\\d{6}$',
        }
        pattern = patterns.get(country)
        if not pattern:
            return False
        return bool(re.match(pattern, value))

    @staticmethod
    def date_range(start, end, format='%Y-%m-%d'):
        try:
            s = datetime.strptime(start, format)
            e = datetime.strptime(end, format)
            return s < e
        except ValueError:
            return False

    @staticmethod
    def credit_card(number):
        digits = [int(d) for d in str(number) if d.isdigit()]
        if len(digits) < 13 or len(digits) > 19:
            return False
        checksum = 0
        for i, d in enumerate(reversed(digits)):
            if i % 2 == 1:
                d *= 2
                if d > 9:
                    d -= 9
            checksum += d
        return checksum % 10 == 0`,
      language: 'python',
      test_framework: 'pytest',
    },
  },
  {
    label: 'React Auth Hook',
    data: {
      title: 'useAuth Hook Tests',
      description: 'Generate tests for custom authentication hook',
      source_code: `import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token }
      })
        .then(r => r.ok ? r.json() : Promise.reject('Invalid token'))
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message);
      return false;
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout, loading, error }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);`,
      language: 'javascript',
      test_framework: 'React Testing Library',
    },
  },
];

function TestGeneration() {
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
      const result = await testGenerationApi.getAll({
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
      const created = await testGenerationApi.create(data);
      setShowNewForm(false);
      showToast('Test generation created', 'success');
      fetchItems();
      // Auto-trigger AI generation
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await testGenerationApi.generate(created.id);
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
      const updated = await testGenerationApi.update(editItem.id, data);
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
      await testGenerationApi.delete(id);
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
      const updated = await testGenerationApi.generate(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error generating tests: ' + err.message, 'error');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test Generation</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">AI-generated test cases for functions</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="test_generations" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search test generations..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="test_generations"
          onBulkDelete={(ids) => bulkApi.delete('test_generations', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('test_generations', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No test generations yet" description="Create your first test generation to get AI-powered test cases." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleGenerate(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>{aiLoading ? 'Generating...' : 'Generate Tests'}</button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="flex gap-4">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Language</h4><span className="badge badge-info">{selectedItem.language}</span></div>
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Framework</h4><span className="badge badge-gray">{selectedItem.test_framework}</span></div>
              {selectedItem.coverage_estimate && <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Est. Coverage</h4><span className="text-2xl font-bold text-pink-600">{selectedItem.coverage_estimate}%</span></div>}
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Source Code</h4><pre className="text-sm overflow-x-auto">{selectedItem.source_code}</pre></div>
            {selectedItem.generated_tests && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Generated Tests</h4>
                <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-pink-800 dark:text-pink-200 !bg-transparent !p-0">{selectedItem.generated_tests}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Test Generation">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Test Generation">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default TestGeneration;
