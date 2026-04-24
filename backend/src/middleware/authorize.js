// Role hierarchy: admin > reviewer > viewer
const ROLE_LEVELS = { admin: 3, reviewer: 2, viewer: 1 };

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userRole = req.user.role || 'viewer';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const requireAdmin = authorize('admin');
export const requireReviewer = authorize('admin', 'reviewer');
