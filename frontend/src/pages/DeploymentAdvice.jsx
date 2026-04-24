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
import { deploymentAdviceApi, bulkApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'target_environment', label: 'Target Env', render: (val) => <span className="badge badge-info">{val || 'N/A'}</span> },
  { key: 'deployment_type', label: 'Type', render: (val) => <span className="badge badge-purple">{val || 'N/A'}</span> },
  { key: 'deployment_strategy', label: 'Strategy', render: (val) => val ? val.substring(0, 30) + '...' : 'N/A' },
  { key: 'status', label: 'Status', render: (val) => <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-warning'}`}>{val}</span> },
  { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
];

const filterConfig = [
  { key: 'status', label: 'Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }] },
  { key: 'target_environment', label: 'Target Env', options: [{ value: 'aws', label: 'AWS' }, { value: 'gcp', label: 'Google Cloud' }, { value: 'azure', label: 'Azure' }, { value: 'kubernetes', label: 'Kubernetes' }, { value: 'docker-swarm', label: 'Docker Swarm' }, { value: 'heroku', label: 'Heroku' }, { value: 'vercel', label: 'Vercel' }, { value: 'netlify', label: 'Netlify' }, { value: 'digitalocean', label: 'DigitalOcean' }, { value: 'on-premise', label: 'On-Premise' }] },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Production Deployment for API Service' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Brief description of the deployment' },
  { name: 'current_setup', label: 'Current Setup', type: 'textarea', rows: 6, required: true, placeholder: 'Describe your current infrastructure, application stack, and setup...' },
  { name: 'target_environment', label: 'Target Environment', type: 'select', required: true, options: [
    { value: 'aws', label: 'AWS' },
    { value: 'gcp', label: 'Google Cloud' },
    { value: 'azure', label: 'Azure' },
    { value: 'kubernetes', label: 'Kubernetes' },
    { value: 'docker-swarm', label: 'Docker Swarm' },
    { value: 'heroku', label: 'Heroku' },
    { value: 'vercel', label: 'Vercel' },
    { value: 'netlify', label: 'Netlify' },
    { value: 'digitalocean', label: 'DigitalOcean' },
    { value: 'on-premise', label: 'On-Premise' },
  ]},
  { name: 'deployment_type', label: 'Deployment Type', type: 'select', required: true, options: [
    { value: 'initial', label: 'Initial Deployment' },
    { value: 'update', label: 'Application Update' },
    { value: 'migration', label: 'Migration' },
    { value: 'scaling', label: 'Scaling' },
    { value: 'rollback', label: 'Rollback' },
    { value: 'disaster-recovery', label: 'Disaster Recovery' },
  ]},
  { name: 'infrastructure_config', label: 'Infrastructure Config (Optional)', type: 'textarea', rows: 4, placeholder: 'Paste any infrastructure configuration (Terraform, CloudFormation, K8s manifests)...' },
];

const sampleDataSets = [
  {
    label: 'Kubernetes Migration',
    data: {
      title: 'Migrate API to Kubernetes',
      description: 'Plan deployment migration from EC2 to EKS',
      current_setup: `Current Infrastructure:
- 4x EC2 t3.large instances behind an ALB
- Node.js Express API (v18), runs via PM2
- PostgreSQL on RDS (db.r5.large)
- Redis on ElastiCache (cache.t3.medium)
- S3 for file uploads
- CloudWatch for basic monitoring
- Manual deployments via SSH + git pull
- No containerization currently
- Environment variables managed via .env files on each server
- Average 2000 requests/minute, peaks at 5000
- Current uptime: ~99.5% (downtime during deployments)
- Deploy frequency: 2-3 times per week
- Team: 8 developers, 1 DevOps`,
      target_environment: 'kubernetes',
      deployment_type: 'migration',
      infrastructure_config: `# Desired K8s setup
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: our-registry/api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        ports:
        - containerPort: 3000`,
    },
  },
  {
    label: 'Blue-Green Production Deploy',
    data: {
      title: 'Zero-Downtime Production Update',
      description: 'Plan blue-green deployment for critical API update with database migration',
      current_setup: `Application: E-Commerce API (handles payments)
- Running on AWS ECS Fargate (6 tasks)
- Behind Application Load Balancer
- PostgreSQL 15 on RDS Multi-AZ
- Redis cluster for sessions and caching
- Current version: v3.2.1
- New version: v4.0.0 (breaking DB schema changes)

Changes in v4.0.0:
- New payment processor integration (Stripe -> Adyen migration)
- Database migration: 3 new tables, 2 altered tables, 1 data migration
- New environment variables needed: ADYEN_API_KEY, ADYEN_MERCHANT_ACCOUNT
- API response format changes for /payments endpoints
- Background job processor changes

Constraints:
- Zero tolerance for payment processing downtime
- Must maintain backward compatibility during transition
- 500K active users, $2M daily transaction volume
- PCI DSS compliance required
- Maximum acceptable downtime: 0 seconds`,
      target_environment: 'aws',
      deployment_type: 'update',
      infrastructure_config: '',
    },
  },
  {
    label: 'Serverless First Deploy',
    data: {
      title: 'Initial Serverless Deployment',
      description: 'First deployment of a new serverless application',
      current_setup: `Application: Event Processing API (new project)
- Built with AWS Lambda + API Gateway
- Python 3.11 runtime
- DynamoDB for data storage
- SQS for async event processing
- Cognito for authentication
- Currently only tested locally with SAM CLI
- No infrastructure exists yet in AWS

Architecture:
- 12 Lambda functions (REST API handlers)
- 3 Lambda functions (SQS consumers)
- 1 Lambda function (scheduled cron job)
- API Gateway REST API with custom domain
- DynamoDB: 4 tables with GSIs
- SQS: 2 queues (standard + dead letter)
- S3: 1 bucket for file processing
- CloudWatch Logs + Alarms
- X-Ray tracing enabled

Requirements:
- Multi-stage: dev, staging, production
- Infrastructure as Code (prefer Terraform or CDK)
- CI/CD pipeline via GitHub Actions
- Custom domain: api.example.com
- Budget constraint: <$500/month initially`,
      target_environment: 'aws',
      deployment_type: 'initial',
      infrastructure_config: `# serverless.yml (partial)
service: event-processor
frameworkVersion: '3'

provider:
  name: aws
  runtime: python3.11
  region: us-east-1
  memorySize: 256
  timeout: 30

functions:
  processEvent:
    handler: handlers.process_event
    events:
      - httpApi:
          path: /events
          method: post
  getEvents:
    handler: handlers.get_events
    events:
      - httpApi:
          path: /events
          method: get`,
    },
  },
];

function DeploymentAdvice() {
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
      const result = await deploymentAdviceApi.getAll({
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
      const created = await deploymentAdviceApi.create(data);
      setShowNewForm(false);
      showToast('Deployment advice request created', 'success');
      fetchItems();
      // Auto-trigger AI advice
      setSelectedItem(created);
      setAiLoading(true);
      try {
        const updated = await deploymentAdviceApi.advise(created.id);
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
      const updated = await deploymentAdviceApi.update(editItem.id, data);
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
      await deploymentAdviceApi.delete(id);
      setSelectedItem(null);
      showToast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  };

  const handleAdvise = async (id) => {
    setAiLoading(true);
    try {
      const updated = await deploymentAdviceApi.advise(id);
      setSelectedItem(updated);
      fetchItems();
    } catch (err) {
      showToast('Error getting advice: ' + err.message, 'error');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Deployment Advisor</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Get deployment strategies and checklists</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons resource="deployment_advices" />
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Search deployment advice..." />
          </div>
          <FilterBar filters={filterConfig} values={filters} onChange={(v) => { setFilters(v); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <BulkActions
          selectedIds={selectedIds}
          resource="deployment_advices"
          onBulkDelete={(ids) => bulkApi.delete('deployment_advices', ids).then(fetchItems)}
          onBulkUpdate={(ids, data) => bulkApi.update('deployment_advices', ids, data).then(fetchItems)}
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
        emptyState={<EmptyState title="No deployment advice yet" description="Create your first deployment advice request to get AI-powered strategies." />}
      />

      {/* Detail Modal */}
      <DetailModal isOpen={!!selectedItem && !editItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title}
        actions={<>
          <button onClick={() => setEditItem(selectedItem)} className="btn btn-secondary">Edit</button>
          <button onClick={() => handleDelete(selectedItem?.id)} className="btn btn-danger">Delete</button>
          <button onClick={() => handleAdvise(selectedItem?.id)} className="btn btn-success" disabled={aiLoading}>
            {aiLoading ? 'Getting Advice...' : 'Get Deployment Advice'}
          </button>
        </>}>
        {selectedItem && (
          <div className="space-y-6">
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
            <div className="flex gap-4 flex-wrap">
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Target Environment</h4><span className="badge badge-info">{selectedItem.target_environment}</span></div>
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Deployment Type</h4><span className="badge badge-purple">{selectedItem.deployment_type}</span></div>
              {selectedItem.deployment_strategy && (
                <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Recommended Strategy</h4><span className="text-green-600 dark:text-green-400 font-medium">{selectedItem.deployment_strategy}</span></div>
              )}
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Current Setup</h4><pre className="text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap">{selectedItem.current_setup}</pre></div>
            {selectedItem.infrastructure_config && (
              <div><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Infrastructure Config</h4><pre className="text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">{selectedItem.infrastructure_config}</pre></div>
            )}
            {selectedItem.ai_analysis && (
              <AIResultDisplay content={selectedItem.ai_analysis} title="Deployment Advice" />
            )}
          </div>
        )}
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Deployment Advice">
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
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="New Deployment Advice">
        <NewItemForm fields={formFields} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} loading={formLoading} sampleDataSets={sampleDataSets} />
      </DetailModal>
    </div>
  );
}

export default DeploymentAdvice;
