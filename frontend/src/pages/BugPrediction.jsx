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
import { bugPredictionApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'bug_probability', label: 'Bug Probability', render: (val) => (
    <span className={`badge ${val >= 70 ? 'badge-danger' : val >= 40 ? 'badge-warning' : 'badge-success'}`}>
      {val ? `${val}%` : 'N/A'}
    </span>
  )},
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'language', label: 'Language', options: [{ value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'go', label: 'Go' }, { value: 'rust', label: 'Rust' }, { value: 'php', label: 'PHP' }, { value: 'ruby', label: 'Ruby' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Authentication Bug Analysis' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description of the code to analyze' },
  { name: 'code_snippet', label: 'Code Snippet', type: 'textarea', rows: 10, required: true, placeholder: 'Paste code to analyze for potential bugs...' },
  { name: 'language', label: 'Language', type: 'select', required: true, options: [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
  ]},
];

const sampleDataSets = [
  {
    label: 'Race Condition Risk',
    data: {
      title: 'Concurrent Counter Bug Analysis',
      description: 'Analyze shared state management for race conditions',
      code_snippet: `let requestCount = 0;
let activeConnections = new Map();

async function handleRequest(req, res) {
  requestCount++;
  const connectionId = Math.random().toString(36);
  activeConnections.set(connectionId, { startTime: Date.now(), req });

  try {
    const user = await getUser(req.headers.authorization);
    const cached = globalCache[req.url];

    if (cached && Date.now() - cached.timestamp < 30000) {
      return res.json(cached.data);
    }

    const data = await fetchData(req.url);
    globalCache[req.url] = { data, timestamp: Date.now() };

    if (user.requestsToday >= user.rateLimit) {
      user.blocked = true;
      await saveUser(user);
      throw new Error('Rate limit exceeded');
    }

    user.requestsToday++;
    user.lastRequest = Date.now();

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    activeConnections.delete(connectionId);
    requestCount--;
  }
}

const globalCache = {};

setInterval(() => {
  for (const [key, val] of Object.entries(globalCache)) {
    if (Date.now() - val.timestamp > 60000) delete globalCache[key];
  }
}, 10000);`,
      language: 'javascript',
    },
  },
  {
    label: 'Memory Leak Pattern',
    data: {
      title: 'Event Listener Memory Leak',
      description: 'Predict memory leaks from unremoved event listeners',
      code_snippet: `class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.handlers = [];
    this.reconnectAttempts = 0;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener('open', () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
    });

    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      this.handlers.forEach(h => h(data));
    });

    this.ws.addEventListener('close', () => {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), Math.min(1000 * this.reconnectAttempts, 30000));
    });

    this.ws.addEventListener('error', (err) => {
      console.error('WebSocket error:', err);
    });
  }

  onMessage(handler) {
    this.handlers.push(handler);
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

// Usage in React component
function ChatComponent() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const ws = new WebSocketManager('ws://localhost:8080');
    ws.onMessage((data) => {
      setMessages(prev => [...prev, data]);
    });
  }, []);

  return <div>{messages.map(m => <p key={m.id}>{m.text}</p>)}</div>;
}`,
      language: 'javascript',
    },
  },
  {
    label: 'Python Null Reference',
    data: {
      title: 'None Reference Bug Prediction',
      description: 'Analyze code for potential NoneType errors and missing null checks',
      code_snippet: `class OrderProcessor:
    def __init__(self, db):
        self.db = db
        self.logger = None

    def process_order(self, order_id):
        order = self.db.find_order(order_id)
        customer = self.db.find_customer(order.customer_id)

        self.logger.info(f"Processing order {order_id}")

        shipping_address = customer.addresses.get('shipping')
        shipping_cost = self.calculate_shipping(
            shipping_address.zip_code,
            order.total_weight
        )

        discount = self.get_active_discount(customer.membership_level)
        final_total = order.subtotal - discount.amount + shipping_cost

        payment_method = customer.payment_methods[0]
        charge_result = self.charge_payment(payment_method, final_total)

        if charge_result.success:
            order.status = 'paid'
            order.payment_id = charge_result.transaction_id

        return order

    def get_active_discount(self, membership):
        discounts = {'gold': 0.15, 'silver': 0.10}
        return type('Discount', (), {'amount': discounts.get(membership)})()

    def calculate_shipping(self, zip_code, weight):
        rates = self.db.get_shipping_rates(zip_code)
        return rates.base_rate + (weight * rates.per_pound)`,
      language: 'python',
    },
  },
];

function BugPrediction() {
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
      const result = await bugPredictionApi.getAll({
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
      const created = await bugPredictionApi.create(data);
      setShowNewForm(false);
      showToast('Bug prediction created', 'success');
      fetchItems();
      // Auto-trigger AI prediction
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await bugPredictionApi.predict(created.id);
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
      const updated = await bugPredictionApi.update(editItem.id, data);
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
      await bugPredictionApi.delete(id);
      setSelectedItem(null);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  };

  const handlePredict = async (id) => {
    setAiLoading(true);
    try {
      const updated = await bugPredictionApi.predict(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error predicting bugs: ' + err.message, 'error');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Bug Predictor</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Predict potential bugs before they occur</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="bug_predictions" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search bug predictions..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="bug_predictions"
          onBulkDelete={(ids) => bulkApi.delete('bug_predictions', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('bug_predictions', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No bug predictions yet" description="Create your first bug prediction to get AI-powered analysis." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handlePredict(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>
            {aiLoading ? 'Analyzing...' : 'Predict Bugs'}
          </button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="flex gap-4">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Language</h4><span className="badge badge-info">{selectedItem.language}</span></div>
              {selectedItem.bug_probability && (
                <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Bug Probability</h4>
                  <span className={`badge ${selectedItem.bug_probability >= 70 ? 'badge-danger' : selectedItem.bug_probability >= 40 ? 'badge-warning' : 'badge-success'}`}>
                    {selectedItem.bug_probability}%
                  </span>
                </div>
              )}
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Code Snippet</h4><pre className="text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">{selectedItem.code_snippet}</pre></div>
            {selectedItem.ai_analysis && (
              <AIResultDisplay content={selectedItem.ai_analysis} title="Bug Prediction Analysis" />
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Bug Prediction">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Bug Prediction">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default BugPrediction;
