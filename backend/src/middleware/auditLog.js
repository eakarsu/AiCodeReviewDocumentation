import { query } from '../config/database.js';

export const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Log after successful response
      if (res.statusCode < 400) {
        const userId = req.user?.id || null;
        const userEmail = req.user?.email || 'anonymous';
        const resourceId = req.params?.id || body?.id || null;
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';

        query(
          `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [userId, userEmail, action, resourceType, resourceId ? String(resourceId) : null, JSON.stringify({ method: req.method, path: req.originalUrl }), ip, userAgent]
        ).catch(err => console.error('Audit log error:', err.message));
      }
      return originalJson(body);
    };
    next();
  };
};
