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
import { architectureReviewApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'system_type', label: 'System Type', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'scalability_score', label: 'Scalability', render: (val) => val ? `${val}/100` : 'N/A' },
  { key: 'maintainability_score', label: 'Maintainability', render: (val) => val ? `${val}/100` : 'N/A' },
  { key: 'security_score', label: 'Security', render: (val) => val ? `${val}/100` : 'N/A' },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., E-Commerce Platform Architecture' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description of the architecture' },
  { name: 'architecture_diagram', label: 'Architecture Description', type: 'textarea', rows: 10, required: true, placeholder: 'Describe your architecture (components, services, data flow, infrastructure)...' },
  { name: 'tech_stack', label: 'Tech Stack', type: 'textarea', rows: 3, required: true, placeholder: 'List technologies used (e.g., React, Node.js, PostgreSQL, Redis, AWS)' },
  { name: 'system_type', label: 'System Type', type: 'select', required: true, options: [
    { value: 'microservices', label: 'Microservices' },
    { value: 'monolithic', label: 'Monolithic' },
    { value: 'serverless', label: 'Serverless' },
    { value: 'event-driven', label: 'Event-Driven' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'modular-monolith', label: 'Modular Monolith' },
  ]},
];

const sampleDataSets = [
  {
    label: 'E-Commerce Microservices',
    data: {
      title: 'E-Commerce Platform Architecture',
      description: 'Review microservices architecture for online marketplace',
      architecture_diagram: `System: E-Commerce Marketplace Platform

Components:
- API Gateway (Kong): Entry point, rate limiting, auth token validation
- User Service: Registration, profiles, authentication (JWT)
- Product Service: Product catalog, search (Elasticsearch), categories
- Order Service: Order creation, status tracking, order history
- Payment Service: Stripe/PayPal integration, refunds, invoicing
- Inventory Service: Stock management, warehouse sync, reservations
- Notification Service: Email (SendGrid), SMS (Twilio), push notifications
- Recommendation Engine: ML-based product suggestions, collaborative filtering

Data Flow:
1. Client -> API Gateway -> Auth check -> Route to service
2. Order creation: Order Service -> Inventory Service (reserve stock) -> Payment Service (charge) -> Notification Service (confirm)
3. Services communicate via RabbitMQ message queues
4. Each service has its own PostgreSQL database (database per service pattern)
5. Redis shared cache for session data and hot product data
6. Elasticsearch for product search and analytics

Infrastructure:
- Kubernetes cluster on AWS EKS (3 nodes, auto-scaling)
- CloudFront CDN for static assets
- S3 for product images
- RDS PostgreSQL for databases
- ElastiCache Redis cluster
- CloudWatch for monitoring`,
      tech_stack: 'Node.js, Express, React, PostgreSQL, Redis, RabbitMQ, Elasticsearch, Docker, Kubernetes, AWS EKS, Kong API Gateway',
      system_type: 'microservices',
    },
  },
  {
    label: 'SaaS Monolith',
    data: {
      title: 'Project Management SaaS Architecture',
      description: 'Review monolithic architecture being considered for migration',
      architecture_diagram: `System: ProjectHub - Project Management SaaS

Current Architecture (Monolith):
- Single Django application handling all functionality
- PostgreSQL database (single instance, 500GB, growing 10GB/month)
- All features in one codebase: projects, tasks, time tracking, invoicing, reporting, file storage, real-time chat
- Celery workers for background jobs (email, reports, file processing)
- WebSocket server for real-time features (embedded in main app)

Pain Points:
- Deployment takes 45 minutes, requires full restart
- Database queries getting slower (some > 5 seconds)
- 200+ database tables, complex joins
- Team of 15 developers frequently has merge conflicts
- Chat feature causes memory spikes affecting other features
- Cannot scale individual features independently
- Single failure can bring down entire platform

Current Scale:
- 50,000 active users, 500 concurrent at peak
- 2 million tasks, 100K projects
- 10TB file storage
- Average response time: 800ms (was 200ms last year)

Infrastructure:
- 2x EC2 c5.4xlarge behind ALB
- RDS PostgreSQL db.r5.2xlarge
- 4x Celery workers on EC2
- EFS for file storage
- CloudFront for static files`,
      tech_stack: 'Python, Django, PostgreSQL, Celery, Redis, WebSockets, AWS EC2, RDS, EFS, CloudFront',
      system_type: 'monolithic',
    },
  },
  {
    label: 'Event-Driven Fintech',
    data: {
      title: 'Payment Processing Event Architecture',
      description: 'Review event-driven architecture for financial transactions',
      architecture_diagram: `System: Real-time Payment Processing Platform

Architecture Pattern: Event-Driven + CQRS + Event Sourcing

Core Services:
- Transaction Ingestion: Receives payment requests, validates, publishes events
- Fraud Detection: ML-based real-time scoring, rule engine, velocity checks
- Payment Router: Routes to correct processor (Visa, Mastercard, ACH, Wire)
- Settlement Engine: Batch settlement, reconciliation, accounting entries
- Compliance Service: KYC/AML checks, regulatory reporting, audit trail

Event Flow:
1. PaymentRequested -> Fraud Detection -> FraudCheckPassed/Failed
2. FraudCheckPassed -> Payment Router -> PaymentProcessed/Failed
3. PaymentProcessed -> Settlement Engine -> SettlementQueued
4. All events stored in Event Store (append-only, immutable)

Data Architecture:
- Event Store: Apache Kafka (3 brokers, replication factor 3)
- Read Models: PostgreSQL (CQRS read side)
- Hot Data: Redis Cluster (transaction cache, rate limits)
- Analytics: ClickHouse (real-time metrics, dashboards)
- Audit Log: Immutable S3 + Glacier archival

Requirements:
- 10,000 transactions/second peak
- 99.999% uptime (5 nines)
- <100ms processing latency
- PCI DSS Level 1 compliance
- Full audit trail for 7 years`,
      tech_stack: 'Java, Spring Boot, Apache Kafka, PostgreSQL, Redis Cluster, ClickHouse, Docker, Kubernetes, AWS, Terraform',
      system_type: 'event-driven',
    },
  },
];

function ArchitectureReview() {
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
      const result = await architectureReviewApi.getAll({
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
      const created = await architectureReviewApi.create(data);
      setShowNewForm(false);
      showToast('Architecture review created', 'success');
      fetchItems();
      // Auto-trigger AI review
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await architectureReviewApi.review(created.id);
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
      const updated = await architectureReviewApi.update(editItem.id, data);
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
      await architectureReviewApi.delete(id);
      setSelectedItem(null);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  };

  const handleReview = async (id) => {
    setAiLoading(true);
    try {
      const updated = await architectureReviewApi.review(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error reviewing architecture: ' + err.message, 'error');
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

  const ScoreCard = ({ label, score, color }) => (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{score || 'N/A'}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Architecture Reviewer</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Review and improve system architectures</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="architecture_reviews" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search architecture reviews..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="architecture_reviews"
          onBulkDelete={(ids) => bulkApi.delete('architecture_reviews', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('architecture_reviews', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No architecture reviews yet" description="Create your first architecture review to get AI-powered analysis." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleReview(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>
            {aiLoading ? 'Reviewing...' : 'Review Architecture'}
          </button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>

            {(selectedItem.scalability_score || selectedItem.maintainability_score || selectedItem.security_score) && (
              <div className="grid grid-cols-3 gap-4">
                <ScoreCard label="Scalability" score={selectedItem.scalability_score} color="text-blue-600 dark:text-blue-400" />
                <ScoreCard label="Maintainability" score={selectedItem.maintainability_score} color="text-green-600 dark:text-green-400" />
                <ScoreCard label="Security" score={selectedItem.security_score} color="text-purple-600 dark:text-purple-400" />
              </div>
            )}

            <div className="flex gap-4">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">System Type</h4><span className="badge badge-info">{selectedItem.system_type}</span></div>
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tech Stack</h4><p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">{selectedItem.tech_stack}</p></div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Architecture Description</h4><pre className="text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap">{selectedItem.architecture_diagram}</pre></div>
            {selectedItem.ai_analysis && (
              <AIResultDisplay content={selectedItem.ai_analysis} title="Architecture Review" />
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Architecture Review">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Architecture Review">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default ArchitectureReview;
