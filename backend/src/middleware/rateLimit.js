const stores = new Map();

export const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests' } = {}) => {
  const storeKey = `${windowMs}-${max}`;
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
    // Cleanup old entries every minute
    setInterval(() => {
      const store = stores.get(storeKey);
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now - entry.resetTime > windowMs) {
          store.delete(key);
        }
      }
    }, 60000).unref();
  }

  const store = stores.get(storeKey);

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.set('X-RateLimit-Limit', max);
    res.set('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
};
