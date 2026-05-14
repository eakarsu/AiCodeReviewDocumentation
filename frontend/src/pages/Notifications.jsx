// Notifications inbox (Apply pass 5 — audit gap from batch_01.md Project 30).
import { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../services/api';

function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await notificationsApi.getAll();
      const list = Array.isArray(data) ? data : (data.items || data.notifications || data.data || []);
      setItems(list);
      try {
        const c = await notificationsApi.getUnreadCount();
        setUnread(c.unread ?? c.count ?? 0);
      } catch (_) {
        setUnread(list.filter(n => !(n.read || n.is_read)).length);
      }
    } catch (e) {
      setError('Failed to load notifications');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      await notificationsApi.create(form);
      setForm({ title: '', message: '', type: 'info' });
      setShowForm(false);
      load();
    } catch (e2) { setError('Create failed'); }
    setSubmitting(false);
  };

  const onMarkRead = async (id) => { await notificationsApi.markRead(id); load(); };
  const onDelete = async (id) => { await notificationsApi.delete(id); load(); };
  const onMarkAllRead = async () => { await notificationsApi.markAllRead(); load(); };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{unread} unread</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {showForm ? 'Cancel' : 'New Notification'}
          </button>
          <button onClick={onMarkAllRead} className="px-3 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            Mark all read
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 mb-2">{error}</p>}

      {showForm && (
        <form onSubmit={submit} className="mb-4 p-4 border rounded bg-white dark:bg-gray-900">
          <input
            placeholder="Title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full mb-2 p-2 border rounded dark:bg-gray-800 dark:text-white"
          />
          <textarea
            required placeholder="Message"
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            className="w-full mb-2 p-2 border rounded dark:bg-gray-800 dark:text-white"
            rows={3}
          />
          <select
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            className="mr-2 p-2 border rounded dark:bg-gray-800 dark:text-white"
          >
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
            <option value="success">success</option>
          </select>
          <button disabled={submitting} type="submit" className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            {submitting ? 'Saving...' : 'Send'}
          </button>
        </form>
      )}

      {loading && <p className="text-gray-500">Loading...</p>}

      <ul className="space-y-2">
        {items.map(n => (
          <li key={n.id} className={`p-3 border rounded flex justify-between items-start bg-white dark:bg-gray-900 ${(n.read || n.is_read) ? 'opacity-60' : ''}`}>
            <div className="flex-1">
              <div className="flex gap-2 items-center mb-1">
                <span className={`text-xs px-2 py-0.5 rounded ${n.type === 'error' ? 'bg-red-100 text-red-700' : n.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : n.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {n.type || 'info'}
                </span>
                {n.title && <strong className="text-gray-900 dark:text-white">{n.title}</strong>}
                <span className="text-xs text-gray-400">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</span>
              </div>
              <div className="text-gray-700 dark:text-gray-200">{n.message}</div>
            </div>
            <div className="flex gap-2 ml-2">
              {!(n.read || n.is_read) && (
                <button onClick={() => onMarkRead(n.id)} className="text-xs px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">read</button>
              )}
              <button onClick={() => onDelete(n.id)} className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900">del</button>
            </div>
          </li>
        ))}
        {items.length === 0 && !loading && (
          <li className="p-6 text-center text-gray-500 border rounded">No notifications.</li>
        )}
      </ul>
    </div>
  );
}

export default Notifications;
