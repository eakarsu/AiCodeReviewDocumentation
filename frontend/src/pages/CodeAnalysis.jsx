import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { codeAnalysisApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'complexity_score', label: 'Complexity', render: (val) => val ? <span className="badge badge-warning">{val}</span> : 'N/A' },
  { key: 'quality_score', label: 'Quality', render: (val) => val ? <span className={`badge ${val >= 80 ? 'badge-success' : val >= 50 ? 'badge-warning' : 'badge-danger'}`}>{val}%</span> : 'N/A' },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'language', label: 'Language', options: [{ value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'go', label: 'Go' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Authentication Flow Analysis' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description' },
  { name: 'code_snippet', label: 'Code Snippet', type: 'textarea', rows: 10, required: true, placeholder: 'Paste code to analyze...' },
  { name: 'language', label: 'Language', type: 'select', required: true, options: [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
  ]},
];

const sampleDataSets = [
  {
    label: 'Complex Sorting Algorithm',
    data: {
      title: 'Custom Sort Implementation',
      description: 'Analyze complexity of custom sorting with multiple criteria',
      code_snippet: `function multiCriteriaSort(items, criteria) {
  const comparators = criteria.map(c => {
    return (a, b) => {
      const valA = typeof a[c.key] === 'string' ? a[c.key].toLowerCase() : a[c.key];
      const valB = typeof b[c.key] === 'string' ? b[c.key].toLowerCase() : b[c.key];
      if (valA < valB) return c.order === 'asc' ? -1 : 1;
      if (valA > valB) return c.order === 'asc' ? 1 : -1;
      return 0;
    };
  });

  return [...items].sort((a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
}

function findDuplicates(arr) {
  const seen = {};
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (JSON.stringify(arr[i]) === JSON.stringify(arr[j])) {
        if (!seen[JSON.stringify(arr[i])]) {
          duplicates.push(arr[i]);
          seen[JSON.stringify(arr[i])] = true;
        }
      }
    }
  }
  return duplicates;
}`,
      language: 'javascript',
    },
  },
  {
    label: 'Python Cache Manager',
    data: {
      title: 'LRU Cache Implementation',
      description: 'Analyze cache implementation for efficiency and thread safety',
      code_snippet: `from collections import OrderedDict
from threading import Lock
import time

class LRUCache:
    def __init__(self, capacity=100, ttl=300):
        self.capacity = capacity
        self.ttl = ttl
        self.cache = OrderedDict()
        self.timestamps = {}
        self.lock = Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key):
        with self.lock:
            if key in self.cache:
                if time.time() - self.timestamps[key] > self.ttl:
                    del self.cache[key]
                    del self.timestamps[key]
                    self.misses += 1
                    return None
                self.cache.move_to_end(key)
                self.hits += 1
                return self.cache[key]
            self.misses += 1
            return None

    def put(self, key, value):
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            self.cache[key] = value
            self.timestamps[key] = time.time()
            if len(self.cache) > self.capacity:
                oldest = next(iter(self.cache))
                del self.cache[oldest]
                del self.timestamps[oldest]

    def stats(self):
        total = self.hits + self.misses
        return {
            'hit_rate': self.hits / total if total > 0 else 0,
            'size': len(self.cache),
            'capacity': self.capacity
        }`,
      language: 'python',
    },
  },
  {
    label: 'Java Event System',
    data: {
      title: 'Event Bus Pattern Analysis',
      description: 'Analyze event-driven architecture implementation',
      code_snippet: `import java.util.*;
import java.util.concurrent.*;

public class EventBus {
    private final Map<String, List<EventHandler>> handlers = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private final Queue<Event> deadLetterQueue = new ConcurrentLinkedQueue<>();

    public void subscribe(String eventType, EventHandler handler) {
        handlers.computeIfAbsent(eventType, k -> new CopyOnWriteArrayList<>()).add(handler);
    }

    public void publish(Event event) {
        List<EventHandler> eventHandlers = handlers.get(event.getType());
        if (eventHandlers == null || eventHandlers.isEmpty()) {
            deadLetterQueue.add(event);
            return;
        }
        for (EventHandler handler : eventHandlers) {
            executor.submit(() -> {
                try {
                    handler.handle(event);
                } catch (Exception e) {
                    deadLetterQueue.add(event);
                }
            });
        }
    }

    public CompletableFuture<Void> publishAsync(Event event) {
        return CompletableFuture.runAsync(() -> publish(event), executor);
    }

    public void shutdown() {
        executor.shutdown();
    }
}`,
      language: 'java',
    },
  },
];

function CodeAnalysis() {
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
      const result = await codeAnalysisApi.getAll({
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
      const created = await codeAnalysisApi.create(data);
      setShowNewForm(false);
      showToast('Code analysis created', 'success');
      fetchItems();
      // Auto-trigger AI analysis
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await codeAnalysisApi.analyze(created.id);
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
      const updated = await codeAnalysisApi.update(editItem.id, data);
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
      await codeAnalysisApi.delete(id);
      setSelectedItem(null);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  };

  const handleAnalyze = async (id) => {
    setAiLoading(true);
    try {
      const updated = await codeAnalysisApi.analyze(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error analyzing: ' + err.message, 'error');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Code Analysis</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Static analysis, quality metrics, and complexity scores</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="code_analysis" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search code analysis..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="code_analysis"
          onBulkDelete={(ids) => bulkApi.delete('code_analysis', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('code_analysis', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No code analyses yet" description="Create your first code analysis to get AI-powered insights." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleAnalyze(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>{aiLoading ? 'Analyzing...' : 'Analyze Code'}</button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Complexity Score</h4><span className="text-2xl font-bold text-yellow-600">{selectedItem.complexity_score || 'N/A'}</span></div>
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Quality Score</h4><span className="text-2xl font-bold text-green-600">{selectedItem.quality_score || 'N/A'}%</span></div>
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Code Snippet</h4><pre className="text-sm overflow-x-auto">{selectedItem.code_snippet}</pre></div>
            {selectedItem.analysis_result && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Analysis Result</h4>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-purple-800 dark:text-purple-200 !bg-transparent !p-0">{selectedItem.analysis_result}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Code Analysis">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Code Analysis">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default CodeAnalysis;
