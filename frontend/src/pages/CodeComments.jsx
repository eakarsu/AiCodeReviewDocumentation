import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { codeCommentsApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'comment_style', label: 'Style', render: (val) => <span className="badge badge-gray">{val || 'N/A'}</span> },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'language', label: 'Language', options: [{ value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'go', label: 'Go' }] },
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

const sampleDataSets = [
  {
    label: 'Express Middleware Chain',
    data: {
      title: 'API Middleware Documentation',
      description: 'Add JSDoc comments to Express middleware functions',
      code_snippet: `const rateLimit = new Map();

function rateLimiter(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimit.has(key)) {
      rateLimit.set(key, []);
    }

    const requests = rateLimit.get(key).filter(t => t > windowStart);
    requests.push(now);
    rateLimit.set(key, requests);

    if (requests.length > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - requests.length);
    next();
  };
}

function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      if (rules.required && (value === undefined || value === '')) {
        errors.push(field + ' is required');
      }
      if (rules.type && value !== undefined && typeof value !== rules.type) {
        errors.push(field + ' must be ' + rules.type);
      }
      if (rules.minLength && value && value.length < rules.minLength) {
        errors.push(field + ' must be at least ' + rules.minLength + ' characters');
      }
    }
    if (errors.length > 0) return res.status(400).json({ errors });
    next();
  };
}`,
      language: 'javascript',
      comment_style: 'JSDoc',
    },
  },
  {
    label: 'Python ML Pipeline',
    data: {
      title: 'ML Training Pipeline Comments',
      description: 'Add comprehensive docstrings to machine learning code',
      code_snippet: `import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix

class ModelTrainer:
    def __init__(self, models=None, cv_folds=5):
        self.models = models or {
            'rf': RandomForestClassifier(n_estimators=100, random_state=42),
            'gb': GradientBoostingClassifier(n_estimators=100, random_state=42),
        }
        self.cv_folds = cv_folds
        self.scaler = StandardScaler()
        self.best_model = None
        self.results = {}

    def preprocess(self, X, fit=True):
        if fit:
            return self.scaler.fit_transform(X)
        return self.scaler.transform(X)

    def train_and_evaluate(self, X_train, y_train, X_test, y_test):
        X_train_scaled = self.preprocess(X_train, fit=True)
        X_test_scaled = self.preprocess(X_test, fit=False)

        best_score = -1
        for name, model in self.models.items():
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=self.cv_folds)
            model.fit(X_train_scaled, y_train)
            test_score = model.score(X_test_scaled, y_test)
            predictions = model.predict(X_test_scaled)

            self.results[name] = {
                'cv_mean': np.mean(cv_scores),
                'cv_std': np.std(cv_scores),
                'test_score': test_score,
                'report': classification_report(y_test, predictions, output_dict=True),
                'confusion': confusion_matrix(y_test, predictions),
            }

            if test_score > best_score:
                best_score = test_score
                self.best_model = model

        return self.results

    def predict(self, X):
        if self.best_model is None:
            raise ValueError("No model trained yet")
        X_scaled = self.preprocess(X, fit=False)
        return self.best_model.predict(X_scaled)`,
      language: 'python',
      comment_style: 'docstring',
    },
  },
  {
    label: 'Go HTTP Handler',
    data: {
      title: 'Go API Handler Comments',
      description: 'Add inline comments to Go HTTP handler code',
      code_snippet: `package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "strings"
    "time"
)

type CacheEntry struct {
    Data      interface{}
    ExpiresAt time.Time
}

var cache = make(map[string]CacheEntry)

func ProductHandler(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case http.MethodGet:
        id := strings.TrimPrefix(r.URL.Path, "/api/products/")
        if id == "" {
            listProducts(w, r)
            return
        }
        getProduct(w, r, id)
    case http.MethodPost:
        createProduct(w, r)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}

func listProducts(w http.ResponseWriter, r *http.Request) {
    cacheKey := "products:" + r.URL.RawQuery
    if entry, ok := cache[cacheKey]; ok && time.Now().Before(entry.ExpiresAt) {
        json.NewEncoder(w).Encode(entry.Data)
        return
    }

    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    if page < 1 {
        page = 1
    }
    limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
    if limit < 1 || limit > 100 {
        limit = 20
    }

    products := fetchFromDB(page, limit)
    cache[cacheKey] = CacheEntry{Data: products, ExpiresAt: time.Now().Add(5 * time.Minute)}

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(products)
}`,
      language: 'go',
      comment_style: 'inline',
    },
  },
];

function CodeComments() {
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
      const result = await codeCommentsApi.getAll({
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
      const created = await codeCommentsApi.create(data);
      setShowNewForm(false);
      showToast('Code comments created', 'success');
      fetchItems();
      // Auto-trigger AI generation
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await codeCommentsApi.generate(created.id);
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
      const updated = await codeCommentsApi.update(editItem.id, data);
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
      await codeCommentsApi.delete(id);
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
      const updated = await codeCommentsApi.generate(id);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Code Comments</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">AI-generated inline comments and docstrings</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="code_comments" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search code comments..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="code_comments"
          onBulkDelete={(ids) => bulkApi.delete('code_comments', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('code_comments', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No code comments yet" description="Create your first code comments to get AI-powered generation." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
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
                  <pre className="whitespace-pre-wrap text-sm text-indigo-800 dark:text-indigo-200 !bg-transparent !p-0">{selectedItem.generated_comments}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Code Comments">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Code Comments">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default CodeComments;
