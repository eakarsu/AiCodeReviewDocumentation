/**
 * Notifications subsystem (audit gap from `_AUDIT/reports/batch_01.md` Project 30:
 * "Missing Notifications").
 *
 * In-memory + DB-detect fallback.
 *   GET    /api/notifications
 *   GET    /api/notifications/unread-count
 *   POST   /api/notifications
 *   PUT    /api/notifications/:id/read
 *   POST   /api/notifications/mark-all-read
 *   DELETE /api/notifications/:id
 *
 * Auth: re-uses the project-wide `optionalAuth` set in `src/index.js`. If a
 * caller is unauthenticated, items are namespaced under user_id `0` so the
 * mechanical inbox works in dev without forcing a hard auth wall.
 */

import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

const memStore = new Map();
let nextMemId = 1;

async function tableExists() {
  try {
    const r = await query("SELECT to_regclass('public.notifications') AS t");
    return !!(r.rows[0] && r.rows[0].t);
  } catch (_) { return false; }
}

const userIdFor = (req) => (req.user && (req.user.id || req.user.userId)) || 0;

router.get('/', async (req, res) => {
  try {
    if (await tableExists()) {
      const r = await query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200',
        [userIdFor(req)]
      );
      return res.json(r.rows);
    }
    res.json(memStore.get(userIdFor(req)) || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/unread-count', async (req, res) => {
  try {
    if (await tableExists()) {
      const r = await query(
        'SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND read = false',
        [userIdFor(req)]
      );
      return res.json({ unread: r.rows[0].c });
    }
    const list = memStore.get(userIdFor(req)) || [];
    res.json({ unread: list.filter(n => !n.read).length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { user_id, message, type, title } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message is required' });
    const target = user_id || userIdFor(req);
    const t = type || 'info';
    if (await tableExists()) {
      const r = await query(
        'INSERT INTO notifications (user_id, message, type, read) VALUES ($1,$2,$3,false) RETURNING *',
        [target, message, t]
      );
      return res.json(r.rows[0]);
    }
    const item = {
      id: nextMemId++,
      user_id: target,
      title: title || null,
      message,
      type: t,
      read: false,
      created_at: new Date().toISOString(),
    };
    if (!memStore.has(target)) memStore.set(target, []);
    memStore.get(target).unshift(item);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', async (req, res) => {
  try {
    if (await tableExists()) {
      const r = await query(
        'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
        [req.params.id, userIdFor(req)]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(r.rows[0]);
    }
    const list = memStore.get(userIdFor(req)) || [];
    const item = list.find(n => String(n.id) === String(req.params.id));
    if (!item) return res.status(404).json({ error: 'Not found' });
    item.read = true;
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/mark-all-read', async (req, res) => {
  try {
    if (await tableExists()) {
      await query('UPDATE notifications SET read = true WHERE user_id = $1', [userIdFor(req)]);
      return res.json({ success: true });
    }
    (memStore.get(userIdFor(req)) || []).forEach(n => { n.read = true; });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (await tableExists()) {
      await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, userIdFor(req)]);
      return res.json({ success: true });
    }
    const list = memStore.get(userIdFor(req)) || [];
    const idx = list.findIndex(n => String(n.id) === String(req.params.id));
    if (idx >= 0) list.splice(idx, 1);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
