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
import { techDebtApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'project_name', label: 'Project', render: (val) => val || 'N/A' },
  { key: 'debt_type', label: 'Debt Type', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'severity', label: 'Severity', render: (val) => (
    <span className={`badge ${val === 'critical' ? 'badge-danger' : val === 'high' ? 'badge-warning' : val === 'medium' ? 'badge-info' : 'badge-success'}`}>
      {val || 'N/A'}
    </span>
  )},
  { key: 'priority_score', label: 'Priority', render: (val) => val ? `${val}/100` : 'N/A' },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'severity', label: 'Severity', options: [{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Legacy Authentication System' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description of the technical debt' },
  { name: 'project_name', label: 'Project Name', type: 'text', placeholder: 'e.g., Main API Service' },
  { name: 'code_snippet', label: 'Code Snippet', type: 'textarea', rows: 10, required: true, placeholder: 'Paste code that contains technical debt...' },
  { name: 'language', label: 'Language', type: 'select', required: true, options: [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'csharp', label: 'C#' },
  ]},
  { name: 'debt_type', label: 'Debt Type', type: 'select', options: [
    { value: 'code', label: 'Code Debt' },
    { value: 'design', label: 'Design Debt' },
    { value: 'documentation', label: 'Documentation Debt' },
    { value: 'test', label: 'Test Debt' },
    { value: 'infrastructure', label: 'Infrastructure Debt' },
  ]},
];

const sampleDataSets = [
  {
    label: 'Legacy API Handler',
    data: {
      title: 'Legacy REST API Technical Debt',
      description: 'Analyze outdated Express handlers with no error handling or validation',
      project_name: 'Customer Portal API',
      code_snippet: `var express = require('express');
var router = express.Router();
var mysql = require('mysql');

var connection = mysql.createConnection({
  host: 'localhost', user: 'root', password: 'admin', database: 'customers'
});

// TODO: add validation
// TODO: fix this later
// HACK: temporary fix for prod issue
router.get('/customers', function(req, res) {
  var query = 'SELECT * FROM customers';
  if (req.query.search) {
    query += " WHERE name LIKE '%" + req.query.search + "%'";
  }
  connection.query(query, function(err, results) {
    res.json(results);
  });
});

router.post('/customers', function(req, res) {
  var data = req.body;
  connection.query('INSERT INTO customers SET ?', data, function(err, result) {
    if (err) { console.log(err); res.status(500).send('error'); return; }
    res.json({ id: result.insertId });
  });
});

router.put('/customers/:id', function(req, res) {
  connection.query('UPDATE customers SET ? WHERE id = ?', [req.body, req.params.id], function(err) {
    res.json({ success: true });
  });
});

// Copy-pasted from customers with minor changes
router.get('/orders', function(req, res) {
  var query = 'SELECT * FROM orders';
  if (req.query.search) {
    query += " WHERE status LIKE '%" + req.query.search + "%'";
  }
  connection.query(query, function(err, results) {
    res.json(results);
  });
});

router.post('/orders', function(req, res) {
  var data = req.body;
  connection.query('INSERT INTO orders SET ?', data, function(err, result) {
    if (err) { console.log(err); res.status(500).send('error'); return; }
    res.json({ id: result.insertId });
  });
});

module.exports = router;`,
      language: 'javascript',
      debt_type: 'code',
    },
  },
  {
    label: 'Python Monolith',
    data: {
      title: 'Monolithic Service God Class',
      description: 'Analyze oversized class with mixed responsibilities',
      project_name: 'Order Processing Service',
      code_snippet: `class OrderService:
    """Handles everything related to orders, payments, emails, inventory, and reporting"""

    def __init__(self):
        self.db = Database()
        self.email_client = SMTPClient('smtp.company.com', 587)
        self.payment_gateway = StripeClient(os.environ.get('STRIPE_KEY', 'sk_test_xxx'))
        self.inventory_cache = {}
        self._report_data = []

    def create_order(self, customer_id, items):
        # Check inventory
        for item in items:
            stock = self.db.query(f"SELECT stock FROM products WHERE id = {item['id']}")[0]
            if stock['stock'] < item['quantity']:
                return {'error': f'Not enough stock for {item["id"]}'}

        # Calculate total
        total = 0
        for item in items:
            product = self.db.query(f"SELECT * FROM products WHERE id = {item['id']}")[0]
            total += product['price'] * item['quantity']

        # Apply discount (hardcoded rules)
        if total > 100:
            total *= 0.9
        if total > 500:
            total *= 0.95

        # Process payment
        try:
            charge = self.payment_gateway.charge(total, customer_id)
        except:
            return {'error': 'Payment failed'}

        # Save order
        order_id = self.db.execute(
            f"INSERT INTO orders (customer_id, total, payment_id) VALUES ({customer_id}, {total}, '{charge.id}')"
        )

        # Update inventory
        for item in items:
            self.db.execute(f"UPDATE products SET stock = stock - {item['quantity']} WHERE id = {item['id']}")

        # Send email
        customer = self.db.query(f"SELECT * FROM customers WHERE id = {customer_id}")[0]
        self.email_client.send(
            to=customer['email'],
            subject='Order Confirmation',
            body=f'Your order #{order_id} for \${total} has been placed.'
        )

        # Update reports
        self._report_data.append({'order_id': order_id, 'total': total, 'date': datetime.now()})

        return {'order_id': order_id, 'total': total}

    def generate_daily_report(self):
        # ... 200 more lines of reporting logic
        pass

    def send_shipping_notification(self, order_id):
        # ... 50 more lines
        pass

    def process_refund(self, order_id, reason):
        # ... 100 more lines mixing payment, inventory, email logic
        pass`,
      language: 'python',
      debt_type: 'design',
    },
  },
  {
    label: 'Missing Test Coverage',
    data: {
      title: 'Untested Payment Module',
      description: 'Analyze test debt in critical payment processing code',
      project_name: 'E-Commerce Platform',
      code_snippet: `// No tests exist for this file
// Last modified: 8 months ago
// Modified by 6 different developers

export function processPayment(order, paymentMethod) {
  const amount = calculateFinalAmount(order);

  if (paymentMethod.type === 'credit_card') {
    if (paymentMethod.card.expired) throw new Error('Card expired');
    // Undocumented: adds 2.9% processing fee
    const fee = amount * 0.029;
    return chargeCard(paymentMethod.card, amount + fee);
  }

  if (paymentMethod.type === 'paypal') {
    // Bug: doesn't handle PayPal sandbox vs production
    return chargePayPal(paymentMethod.email, amount);
  }

  if (paymentMethod.type === 'crypto') {
    // Added hastily during crypto promotion, never tested
    const rate = getCryptoRate(paymentMethod.currency);
    const cryptoAmount = amount / rate;
    return chargeCrypto(paymentMethod.wallet, cryptoAmount);
  }
}

function calculateFinalAmount(order) {
  let total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  // Magic numbers: nobody knows where these came from
  if (order.coupon === 'LEGACY2020') total *= 0.75;
  if (order.customer.tier === 3) total *= 0.85;
  if (order.items.length > 5) total -= 10;
  // Edge case: negative totals have happened in production
  return total;
}`,
      language: 'javascript',
      debt_type: 'test',
    },
  },
];

function TechDebt() {
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
      const result = await techDebtApi.getAll({
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
      const created = await techDebtApi.create(data);
      setShowNewForm(false);
      showToast('Tech debt item created', 'success');
      fetchItems();
      // Auto-trigger AI analysis
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await techDebtApi.analyze(created.id);
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
      const updated = await techDebtApi.update(editItem.id, data);
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
      await techDebtApi.delete(id);
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
      const updated = await techDebtApi.analyze(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error analyzing debt: ' + err.message, 'error');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Tech Debt Tracker</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Track and prioritize technical debt</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="tech_debt_items" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search tech debt items..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="tech_debt_items"
          onBulkDelete={(ids) => bulkApi.delete('tech_debt_items', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('tech_debt_items', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No tech debt items yet" description="Create your first tech debt item to get AI-powered analysis." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleAnalyze(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>
            {aiLoading ? 'Analyzing...' : 'Analyze Debt'}
          </button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="flex gap-4 flex-wrap">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Project</h4><span className="text-gray-900 dark:text-white">{selectedItem.project_name || 'N/A'}</span></div>
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Language</h4><span className="badge badge-info">{selectedItem.language}</span></div>
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Debt Type</h4><span className="badge badge-purple">{selectedItem.debt_type || 'N/A'}</span></div>
              {selectedItem.severity && (
                <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Severity</h4>
                  <span className={`badge ${selectedItem.severity === 'critical' ? 'badge-danger' : selectedItem.severity === 'high' ? 'badge-warning' : 'badge-info'}`}>
                    {selectedItem.severity}
                  </span>
                </div>
              )}
              {selectedItem.priority_score && (
                <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Priority Score</h4><span className="font-semibold text-gray-900 dark:text-white">{selectedItem.priority_score}/100</span></div>
              )}
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Code Snippet</h4><pre className="text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">{selectedItem.code_snippet}</pre></div>
            {selectedItem.ai_analysis && (
              <AIResultDisplay content={selectedItem.ai_analysis} title="Technical Debt Analysis" />
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Tech Debt Item">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Tech Debt Item">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default TechDebt;
