// WebhookSetup Component - Create and configure webhooks
import { useState } from 'react';
import { webhooksApi } from '../services/api';

function WebhookSetup({ onCreated, onCancel }) {
  const [formData, setFormData] = useState({
    events: ['push', 'pull_request'],
    auto_review: true
  });
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const toggleEvent = (event) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.events.length === 0) {
      alert('Select at least one event type');
      return;
    }

    setLoading(true);
    try {
      const webhook = await webhooksApi.create(formData);
      setCreated(webhook);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Webhook Created!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure this webhook in your GitHub repository settings
          </p>
        </div>

        <div className="space-y-4">
          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payload URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={created.webhook_url || `http://localhost:5001/api/webhooks/github/${created.id}`}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(created.webhook_url || `http://localhost:5001/api/webhooks/github/${created.id}`)}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secret
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={created.secret_token}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(created.secret_token)}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Save this secret! It won't be shown again.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">GitHub Setup Instructions</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Go to your repository Settings &rarr; Webhooks</li>
              <li>Click "Add webhook"</li>
              <li>Paste the Payload URL above</li>
              <li>Set Content type to "application/json"</li>
              <li>Add the Secret</li>
              <li>Select events: Push and/or Pull requests</li>
              <li>Click "Add webhook"</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => onCreated(created)} className="btn btn-primary">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Event Types */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Event Types
        </label>
        <div className="space-y-2">
          {['push', 'pull_request'].map(event => (
            <label key={event} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={formData.events.includes(event)}
                onChange={() => toggleEvent(event)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {event.replace('_', ' ')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {event === 'push' ? 'Triggered when code is pushed to repository' : 'Triggered when a pull request is opened or updated'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Auto Review */}
      <div>
        <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
          <input
            type="checkbox"
            checked={formData.auto_review}
            onChange={(e) => setFormData({ ...formData, auto_review: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Auto-analyze</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically run AI code review when webhook is triggered
            </p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Creating...' : 'Create Webhook'}
        </button>
      </div>
    </form>
  );
}

export default WebhookSetup;
