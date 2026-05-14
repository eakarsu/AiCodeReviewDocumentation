import { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import ExportButtons from '../components/ExportButtons';
import { api } from '../services/api';

const columns = [
  { key: 'created_at', label: 'Time', render: (val) => val ? new Date(val).toLocaleString() : '-' },
  { key: 'user_email', label: 'User' },
  { key: 'action', label: 'Action', render: (val) => <span className="badge badge-info">{val}</span> },
  { key: 'resource_type', label: 'Resource' },
  { key: 'resource_id', label: 'ID' },
  { key: 'ip_address', label: 'IP Address' },
];

function AuditLogs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search,
        sort: sortKey,
        order: sortOrder,
      });
      const result = await api.get(`/audit-logs?${params.toString()}`);
      setItems(result.data || []);
      setPagination((prev) => ({ ...prev, ...(result.pagination || {}) }));
    } catch (err) {
      console.error('Audit log error:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, sortKey, sortOrder]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSort = (key) => {
    if (sortKey === key) setSortOrder((p) => (p === 'ASC' ? 'DESC' : 'ASC'));
    else { setSortKey(key); setSortOrder('ASC'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">System activity and user actions (admin only)</p>
        </div>
        <ExportButtons resource="audit_logs" />
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPagination((p) => ({ ...p, page: 1 })); }}
          placeholder="Search by user, action, or resource type..."
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onRowClick={setSelectedItem}
        pagination={pagination}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyState={<EmptyState title="No audit logs yet" description="Activity will appear here as users interact with the system." />}
      />

      <DetailModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Audit Log Entry">
        {selectedItem && (
          <div className="space-y-4">
            {Object.entries(selectedItem).map(([k, v]) => (
              <div key={k}>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{k.replace(/_/g, ' ')}</h4>
                <p className="text-gray-900 dark:text-white text-sm">
                  {typeof v === 'object' ? <pre className="text-xs">{JSON.stringify(v, null, 2)}</pre> : String(v ?? '-')}
                </p>
              </div>
            ))}
          </div>
        )}
      </DetailModal>
    </div>
  );
}

export default AuditLogs;
