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
import { securityScanApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'language', label: 'Language', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'risk_level', label: 'Risk Level', render: (val) => <span className={`badge ${val === 'critical' ? 'badge-danger' : val === 'high' ? 'badge-warning' : val === 'medium' ? 'badge-info' : 'badge-success'}`}>{val || 'N/A'}</span> },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'risk_level', label: 'Risk Level', options: [{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., User Input Handler Security' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description' },
  { name: 'code_snippet', label: 'Code Snippet', type: 'textarea', rows: 10, required: true, placeholder: 'Paste code to scan...' },
  { name: 'language', label: 'Language', type: 'select', required: true, options: [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'php', label: 'PHP' },
    { value: 'sql', label: 'SQL' },
  ]},
];

const sampleDataSets = [
  {
    label: 'SQL Injection Vulnerable',
    data: {
      title: 'User Login SQL Injection Check',
      description: 'Check login handler for SQL injection vulnerabilities',
      code_snippet: `const express = require('express');
const mysql = require('mysql');
const router = express.Router();

const db = mysql.createConnection({ host: 'localhost', user: 'root', password: 'root', database: 'app' });

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) {
      req.session.user = results[0];
      res.json({ success: true, user: results[0] });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

router.get('/user/:id', (req, res) => {
  const query = "SELECT * FROM users WHERE id = " + req.params.id;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});`,
      language: 'javascript',
    },
  },
  {
    label: 'XSS Vulnerable PHP',
    data: {
      title: 'PHP Form Handler XSS Check',
      description: 'Scan PHP form processing for XSS vulnerabilities',
      code_snippet: `<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'];
    $email = $_POST['email'];
    $comment = $_POST['comment'];

    $conn = new mysqli('localhost', 'root', '', 'blog');
    $sql = "INSERT INTO comments (name, email, comment) VALUES ('$name', '$email', '$comment')";
    $conn->query($sql);
}

$result = $conn->query("SELECT * FROM comments ORDER BY created_at DESC");
?>
<html>
<body>
  <h1>Comments</h1>
  <?php while($row = $result->fetch_assoc()): ?>
    <div class="comment">
      <h3><?php echo $row['name']; ?></h3>
      <p><?php echo $row['comment']; ?></p>
      <small><?php echo $row['email']; ?></small>
    </div>
  <?php endwhile; ?>

  <form method="POST">
    <input name="name" placeholder="Name">
    <input name="email" placeholder="Email">
    <textarea name="comment"></textarea>
    <button type="submit">Post Comment</button>
  </form>
</body>
</html>`,
      language: 'php',
    },
  },
  {
    label: 'Python File Upload',
    data: {
      title: 'File Upload Security Scan',
      description: 'Check file upload handler for path traversal and unrestricted upload',
      code_snippet: `from flask import Flask, request, send_file
import os
import subprocess

app = Flask(__name__)
UPLOAD_FOLDER = '/var/uploads'

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    filename = file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    if filename.endswith('.sh'):
        result = subprocess.run(['bash', filepath], capture_output=True, text=True)
        return {'output': result.stdout}

    return {'message': f'File {filename} uploaded successfully', 'path': filepath}

@app.route('/download', methods=['GET'])
def download_file():
    filename = request.args.get('file')
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    return send_file(filepath)

@app.route('/execute', methods=['POST'])
def execute_command():
    cmd = request.json.get('command')
    result = os.popen(cmd).read()
    return {'result': result}`,
      language: 'python',
    },
  },
];

function SecurityScan() {
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
      const result = await securityScanApi.getAll({
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
      const created = await securityScanApi.create(data);
      setShowNewForm(false);
      showToast('Security scan created', 'success');
      fetchItems();
      // Auto-trigger AI scan
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await securityScanApi.scan(created.id);
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
      const updated = await securityScanApi.update(editItem.id, data);
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
      await securityScanApi.delete(id);
      setSelectedItem(null);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  };

  const handleScan = async (id) => {
    setAiLoading(true);
    try {
      const updated = await securityScanApi.scan(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error scanning: ' + err.message, 'error');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Scanning</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">AI-powered vulnerability detection</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="security_scans" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search security scans..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="security_scans"
          onBulkDelete={(ids) => bulkApi.delete('security_scans', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('security_scans', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No security scans yet" description="Create your first security scan to get AI-powered vulnerability detection." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleScan(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>{aiLoading ? 'Scanning...' : 'Run Security Scan'}</button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="flex gap-4">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Language</h4><span className="badge badge-info">{selectedItem.language}</span></div>
              {selectedItem.risk_level && <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Risk Level</h4><span className={`badge ${selectedItem.risk_level === 'critical' ? 'badge-danger' : selectedItem.risk_level === 'high' ? 'badge-warning' : 'badge-info'}`}>{selectedItem.risk_level}</span></div>}
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Code Snippet</h4><pre className="text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">{selectedItem.code_snippet}</pre></div>
            {selectedItem.vulnerabilities && (
              <AIResultDisplay content={selectedItem.vulnerabilities} title="Security Scan Results" />
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Security Scan">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Security Scan">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default SecurityScan;
