// Webhooks Page - Configure and manage CI/CD webhooks
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { webhooksApi } from '../services/api';
import DetailModal from '../components/DetailModal';
import WebhookSetup from '../components/WebhookSetup';

function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const data = await webhooksApi.getAll();
      setWebhooks(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (webhookId) => {
    try {
      const data = await webhooksApi.getEvents(webhookId);
      setEvents(data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSelectWebhook = async (webhook) => {
    setSelectedWebhook(webhook);
    fetchEvents(webhook.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await webhooksApi.delete(id);
      setSelectedWebhook(null);
      fetchWebhooks();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await webhooksApi.update(id, {
        status: currentStatus === 'active' ? 'paused' : 'active'
      });
      fetchWebhooks();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleCreated = (webhook) => {
    setShowNewForm(false);
    fetchWebhooks();
    setSelectedWebhook(webhook);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Auto-trigger reviews on push or pull request events
            </p>
          </div>
        </div>
        <button onClick={() => setShowNewForm(true)} className="btn btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Webhook
        </button>
      </div>

      {/* Webhooks List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">No webhooks configured</p>
          <button onClick={() => setShowNewForm(true)} className="mt-4 text-primary-600 hover:text-primary-700">
            Create your first webhook
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {webhooks.map(webhook => (
              <div
                key={webhook.id}
                onClick={() => handleSelectWebhook(webhook)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        webhook.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Webhook #{webhook.id}
                      </span>
                      {webhook.github_username && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({webhook.github_username})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {webhook.event_count || 0} events
                      </span>
                      {webhook.last_triggered_at && (
                        <span>
                          Last: {new Date(webhook.last_triggered_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {webhook.auto_review && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Auto-review
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      webhook.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {webhook.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhook Detail Modal */}
      <DetailModal
        isOpen={!!selectedWebhook}
        onClose={() => { setSelectedWebhook(null); setEvents([]); }}
        title={`Webhook #${selectedWebhook?.id}`}
        actions={
          <>
            <button onClick={() => handleDelete(selectedWebhook?.id)} className="btn btn-danger">
              Delete
            </button>
            <button
              onClick={() => handleToggleStatus(selectedWebhook?.id, selectedWebhook?.status)}
              className={`btn ${selectedWebhook?.status === 'active' ? 'bg-yellow-100 text-yellow-700' : 'btn-success'}`}
            >
              {selectedWebhook?.status === 'active' ? 'Pause' : 'Activate'}
            </button>
          </>
        }
      >
        {selectedWebhook && (
          <div className="space-y-6">
            {/* Webhook URL */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Webhook URL</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                  {`${window.location.origin.replace('3000', '5001')}/api/webhooks/github/${selectedWebhook.id}`}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin.replace('3000', '5001')}/api/webhooks/github/${selectedWebhook.id}`)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Events</h4>
                <div className="flex gap-1 flex-wrap">
                  {(typeof selectedWebhook.events === 'string' ? JSON.parse(selectedWebhook.events) : selectedWebhook.events || []).map(event => (
                    <span key={event} className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {event}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Auto Review</h4>
                <span className={selectedWebhook.auto_review ? 'text-green-600' : 'text-gray-500'}>
                  {selectedWebhook.auto_review ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Recent Events */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Recent Events</h4>
              {events.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No events yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {events.map(event => (
                    <div key={event.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">{event.event_type}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          event.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(event.created_at).toLocaleString()}
                        {event.review_title && ` - ${event.review_title}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailModal>

      {/* New Webhook Modal */}
      <DetailModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} title="Create Webhook">
        <WebhookSetup onCreated={handleCreated} onCancel={() => setShowNewForm(false)} />
      </DetailModal>
    </div>
  );
}

export default Webhooks;
