import { useState, useEffect, useCallback } from 'react';

import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import NewItemForm from '../components/NewItemForm';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButtons from '../components/ExportButtons';
import BulkActions from '../components/BulkActions';
import EmptyState from '../components/EmptyState';
import { performanceApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'performance_score', label: 'Score', render: (val) => val ? <span className={`badge ${val >= 70 ? 'badge-success' : val >= 40 ? 'badge-warning' : 'badge-danger'}`}>{val}%</span> : 'N/A' },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'language', label: 'Language', options: [{ value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'go', label: 'Go' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Database Query Optimization' },
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
    label: 'Nested Loop Search',
    data: {
      title: 'Product Search Performance',
      description: 'Analyze nested loop performance in product filtering',
      code_snippet: `function searchProducts(products, filters) {
  let results = [];
  for (let i = 0; i < products.length; i++) {
    let matches = true;
    for (let key in filters) {
      if (Array.isArray(filters[key])) {
        let found = false;
        for (let j = 0; j < filters[key].length; j++) {
          if (products[i][key] === filters[key][j]) {
            found = true;
            break;
          }
        }
        if (!found) matches = false;
      } else if (products[i][key] !== filters[key]) {
        matches = false;
      }
    }
    if (matches) results.push(products[i]);
  }
  return results.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
}

function buildSearchIndex(products) {
  const index = {};
  products.forEach(product => {
    const words = product.name.split(' ').concat(product.description.split(' '));
    words.forEach(word => {
      const lower = word.toLowerCase();
      if (!index[lower]) index[lower] = [];
      index[lower].push(product.id);
    });
  });
  return index;
}`,
      language: 'javascript',
    },
  },
  {
    label: 'Python Data Processing',
    data: {
      title: 'CSV Data Processing Pipeline',
      description: 'Analyze performance of large file processing',
      code_snippet: `import csv
import json

def process_large_csv(filepath):
    results = []
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            processed = transform_row(row)
            results.append(processed)

    # Sort all results in memory
    results.sort(key=lambda x: x['timestamp'])

    # Group by category
    grouped = {}
    for item in results:
        cat = item['category']
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(item)

    # Calculate aggregates
    for cat, items in grouped.items():
        total = sum(float(i['amount']) for i in items)
        avg = total / len(items)
        grouped[cat] = {'items': items, 'total': total, 'average': avg}

    return grouped

def transform_row(row):
    return {
        'id': row['id'],
        'timestamp': row['date'] + 'T' + row['time'],
        'category': row['category'].strip().lower(),
        'amount': row['amount'],
        'metadata': json.loads(row.get('metadata', '{}')),
        'tags': [t.strip() for t in row.get('tags', '').split(',')]
    }`,
      language: 'python',
    },
  },
  {
    label: 'React Render Optimization',
    data: {
      title: 'React Component Re-render Analysis',
      description: 'Check for unnecessary re-renders and missing optimizations',
      code_snippet: `import React, { useState, useEffect } from 'react';

function Dashboard({ userId }) {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetch('/api/dashboard/' + userId)
      .then(r => r.json())
      .then(setData);
  }, [userId]);

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(filter.toLowerCase()) ||
    item.description.toLowerCase().includes(filter.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return b.value - a.value;
  });

  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search..." />
      <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
        <option value="date">Date</option>
        <option value="name">Name</option>
        <option value="value">Value</option>
      </select>
      {sortedData.map(item => (
        <Card key={item.id} item={item} onClick={() => handleClick(item)} style={{margin: '10px'}} />
      ))}
    </div>
  );
}

function Card({ item, onClick, style }) {
  return (
    <div style={style} onClick={onClick}>
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <span>{new Date(item.date).toLocaleDateString()}</span>
    </div>
  );
}`,
      language: 'javascript',
    },
  },
];

function Performance() {
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
      const result = await performanceApi.getAll({
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
      const created = await performanceApi.create(data);
      setShowNewForm(false);
      showToast('Performance analysis created', 'success');
      fetchItems();
      // Auto-trigger AI analysis
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await performanceApi.analyze(created.id);
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
      const updated = await performanceApi.update(editItem.id, data);
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
      await performanceApi.delete(id);
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
      const updated = await performanceApi.analyze(id);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Analysis</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Performance optimization suggestions</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="performance_reports" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search performance analyses..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="performance_reports"
          onBulkDelete={(ids) => bulkApi.delete('performance_reports', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('performance_reports', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No performance analyses yet" description="Create your first performance analysis to get AI-powered optimization suggestions." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleAnalyze(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>{aiLoading ? 'Analyzing...' : 'Analyze Performance'}</button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="flex gap-4">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Language</h4><span className="badge badge-info">{selectedItem.language}</span></div>
              {selectedItem.performance_score && <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Performance Score</h4><span className="text-3xl font-bold text-yellow-600">{selectedItem.performance_score}%</span></div>}
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Code Snippet</h4><pre className="text-sm overflow-x-auto">{selectedItem.code_snippet}</pre></div>
            {selectedItem.bottlenecks && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Bottlenecks Identified</h4>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-red-800 dark:text-red-200 !bg-transparent !p-0">{selectedItem.bottlenecks}</pre>
                </div>
              </div>
            )}
            {selectedItem.optimization_suggestions && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Optimization Suggestions</h4>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-yellow-800 dark:text-yellow-200 !bg-transparent !p-0">{selectedItem.optimization_suggestions}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Performance Analysis">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Performance Analysis">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default Performance;
