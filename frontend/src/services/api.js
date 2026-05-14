const BASE_URL = '/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    // Handle 401 - redirect to login
    if (response.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Don't redirect on auth endpoints
        if (!endpoint.startsWith('/auth/')) {
          window.location.href = '/login';
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  }

  get(endpoint) {
    return this.request(endpoint);
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();

// Helper to build query string from params
const buildQuery = (params = {}) => {
  const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (filtered.length === 0) return '';
  return '?' + filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
};

// Auth API
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  setup2FA: () => api.post('/auth/2fa/setup'),
  enable2FA: (code) => api.post('/auth/2fa/enable', { code }),
  disable2FA: (password) => api.post('/auth/2fa/disable', { password }),
  getApiKeys: () => api.get('/auth/api-keys'),
  createApiKey: (data) => api.post('/auth/api-keys', data),
  deleteApiKey: (id) => api.delete(`/auth/api-keys/${id}`),
};

// Export API
export const exportApi = {
  csv: (resource) => `/api/exports/csv/${resource}`,
  html: (resource) => `/api/exports/html/${resource}`,
};

// Bulk API
export const bulkApi = {
  delete: (resource, ids) => api.post('/bulk/delete', { resource, ids }),
  update: (resource, ids, data) => api.post('/bulk/update', { resource, ids, data }),
};

// Feature-specific API methods
export const codeReviewsApi = {
  getAll: (params) => api.get(`/code-reviews${buildQuery(params)}`),
  getById: (id) => api.get(`/code-reviews/${id}`),
  create: (data) => api.post('/code-reviews', data),
  update: (id, data) => api.put(`/code-reviews/${id}`, data),
  delete: (id) => api.delete(`/code-reviews/${id}`),
  analyze: (id) => api.post(`/code-reviews/${id}/analyze`),
  analyzeStructured: (id) => api.post(`/code-reviews/${id}/analyze-structured`),
  getIssues: (id) => api.get(`/code-reviews/${id}/issues`),
  updateIssue: (reviewId, issueId, data) => api.request(`/code-reviews/${reviewId}/issues/${issueId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getSeverityStats: () => api.get('/code-reviews/stats/severity'),
};

export const documentationApi = {
  getAll: (params) => api.get(`/documentation${buildQuery(params)}`),
  getById: (id) => api.get(`/documentation/${id}`),
  create: (data) => api.post('/documentation', data),
  update: (id, data) => api.put(`/documentation/${id}`, data),
  delete: (id) => api.delete(`/documentation/${id}`),
  generate: (id) => api.post(`/documentation/${id}/generate`),
};

export const codeAnalysisApi = {
  getAll: (params) => api.get(`/code-analysis${buildQuery(params)}`),
  getById: (id) => api.get(`/code-analysis/${id}`),
  create: (data) => api.post('/code-analysis', data),
  update: (id, data) => api.put(`/code-analysis/${id}`, data),
  delete: (id) => api.delete(`/code-analysis/${id}`),
  analyze: (id) => api.post(`/code-analysis/${id}/analyze`),
};

export const apiDocsApi = {
  getAll: (params) => api.get(`/api-docs${buildQuery(params)}`),
  getById: (id) => api.get(`/api-docs/${id}`),
  create: (data) => api.post('/api-docs', data),
  update: (id, data) => api.put(`/api-docs/${id}`, data),
  delete: (id) => api.delete(`/api-docs/${id}`),
  generate: (id) => api.post(`/api-docs/${id}/generate`),
};

export const readmeGeneratorApi = {
  getAll: (params) => api.get(`/readme-generator${buildQuery(params)}`),
  getById: (id) => api.get(`/readme-generator/${id}`),
  create: (data) => api.post('/readme-generator', data),
  update: (id, data) => api.put(`/readme-generator/${id}`, data),
  delete: (id) => api.delete(`/readme-generator/${id}`),
  generate: (id) => api.post(`/readme-generator/${id}/generate`),
};

export const codeCommentsApi = {
  getAll: (params) => api.get(`/code-comments${buildQuery(params)}`),
  getById: (id) => api.get(`/code-comments/${id}`),
  create: (data) => api.post('/code-comments', data),
  update: (id, data) => api.put(`/code-comments/${id}`, data),
  delete: (id) => api.delete(`/code-comments/${id}`),
  generate: (id) => api.post(`/code-comments/${id}/generate`),
};

export const securityScanApi = {
  getAll: (params) => api.get(`/security-scan${buildQuery(params)}`),
  getById: (id) => api.get(`/security-scan/${id}`),
  create: (data) => api.post('/security-scan', data),
  update: (id, data) => api.put(`/security-scan/${id}`, data),
  delete: (id) => api.delete(`/security-scan/${id}`),
  scan: (id) => api.post(`/security-scan/${id}/scan`),
};

export const performanceApi = {
  getAll: (params) => api.get(`/performance${buildQuery(params)}`),
  getById: (id) => api.get(`/performance/${id}`),
  create: (data) => api.post('/performance', data),
  update: (id, data) => api.put(`/performance/${id}`, data),
  delete: (id) => api.delete(`/performance/${id}`),
  analyze: (id) => api.post(`/performance/${id}/analyze`),
};

export const testGenerationApi = {
  getAll: (params) => api.get(`/test-generation${buildQuery(params)}`),
  getById: (id) => api.get(`/test-generation/${id}`),
  create: (data) => api.post('/test-generation', data),
  update: (id, data) => api.put(`/test-generation/${id}`, data),
  delete: (id) => api.delete(`/test-generation/${id}`),
  generate: (id) => api.post(`/test-generation/${id}/generate`),
};

export const refactoringApi = {
  getAll: (params) => api.get(`/refactoring${buildQuery(params)}`),
  getById: (id) => api.get(`/refactoring/${id}`),
  create: (data) => api.post('/refactoring', data),
  update: (id, data) => api.put(`/refactoring/${id}`, data),
  delete: (id) => api.delete(`/refactoring/${id}`),
  suggest: (id) => api.post(`/refactoring/${id}/suggest`),
};

// GitHub Integration API
export const githubApi = {
  connect: (token) => api.post('/github/connect', { access_token: token }),
  getStatus: () => api.get('/github/status'),
  disconnect: () => api.delete('/github/disconnect'),
  getRepos: (params) => api.get('/github/repos'),
  getRepoPulls: (owner, repo, state = 'open') => api.get(`/github/repos/${owner}/${repo}/pulls?state=${state}`),
};

// Pull Requests API
export const pullRequestsApi = {
  getAll: (params) => api.get(`/pull-requests${buildQuery(params)}`),
  getById: (id) => api.get(`/pull-requests/${id}`),
  fetch: (data) => api.post('/pull-requests/fetch', data),
  createReview: (id, data) => api.post(`/pull-requests/${id}/review`, data),
  refresh: (id) => api.post(`/pull-requests/${id}/refresh`),
  delete: (id) => api.delete(`/pull-requests/${id}`),
};

// Teams API
export const teamsApi = {
  getAll: (params) => api.get(`/teams${buildQuery(params)}`),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  addMember: (teamId, data) => api.post(`/teams/${teamId}/members`, data),
  removeMember: (teamId, memberId) => api.delete(`/teams/${teamId}/members/${memberId}`),
};

// Assignments API
export const assignmentsApi = {
  getAll: (params) => api.get(`/assignments${buildQuery(params)}`),
  getMyAssignments: () => api.get('/assignments/my'),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
};

// Webhooks API
export const webhooksApi = {
  getAll: (params) => api.get(`/webhooks${buildQuery(params)}`),
  getById: (id) => api.get(`/webhooks/${id}`),
  create: (data) => api.post('/webhooks', data),
  update: (id, data) => api.put(`/webhooks/${id}`, data),
  delete: (id) => api.delete(`/webhooks/${id}`),
  getEvents: (id) => api.get(`/webhooks/${id}/events`),
};

// Apply pass 5 — Notifications inbox (audit gap)
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  create: (data) => api.post('/notifications', data),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Metrics API
export const metricsApi = {
  getDashboard: () => api.get('/metrics/dashboard'),
  getTrends: (params) => api.get('/metrics/trends'),
  getCategories: () => api.get('/metrics/categories'),
};

// Bug Prediction API
export const bugPredictionApi = {
  getAll: (params) => api.get(`/bug-prediction${buildQuery(params)}`),
  getById: (id) => api.get(`/bug-prediction/${id}`),
  create: (data) => api.post('/bug-prediction', data),
  update: (id, data) => api.put(`/bug-prediction/${id}`, data),
  delete: (id) => api.delete(`/bug-prediction/${id}`),
  predict: (id) => api.post(`/bug-prediction/${id}/predict`),
};

// Code Explainer API (DevOps)
export const codeExplainerApi = {
  getAll: (params) => api.get(`/code-explainer${buildQuery(params)}`),
  getById: (id) => api.get(`/code-explainer/${id}`),
  create: (data) => api.post('/code-explainer', data),
  update: (id, data) => api.put(`/code-explainer/${id}`, data),
  delete: (id) => api.delete(`/code-explainer/${id}`),
  explain: (id) => api.post(`/code-explainer/${id}/explain`),
};

// Tech Debt Tracker API (DevOps)
export const techDebtApi = {
  getAll: (params) => api.get(`/tech-debt${buildQuery(params)}`),
  getById: (id) => api.get(`/tech-debt/${id}`),
  create: (data) => api.post('/tech-debt', data),
  update: (id, data) => api.put(`/tech-debt/${id}`, data),
  delete: (id) => api.delete(`/tech-debt/${id}`),
  analyze: (id) => api.post(`/tech-debt/${id}/analyze`),
};

// Architecture Review API (DevOps)
export const architectureReviewApi = {
  getAll: (params) => api.get(`/architecture-review${buildQuery(params)}`),
  getById: (id) => api.get(`/architecture-review/${id}`),
  create: (data) => api.post('/architecture-review', data),
  update: (id, data) => api.put(`/architecture-review/${id}`, data),
  delete: (id) => api.delete(`/architecture-review/${id}`),
  review: (id) => api.post(`/architecture-review/${id}/review`),
};

// Dependency Audit API (DevOps)
export const dependencyAuditApi = {
  getAll: (params) => api.get(`/dependency-audit${buildQuery(params)}`),
  getById: (id) => api.get(`/dependency-audit/${id}`),
  create: (data) => api.post('/dependency-audit', data),
  update: (id, data) => api.put(`/dependency-audit/${id}`, data),
  delete: (id) => api.delete(`/dependency-audit/${id}`),
  audit: (id) => api.post(`/dependency-audit/${id}/audit`),
};

// Deployment Advice API (DevOps)
export const deploymentAdviceApi = {
  getAll: (params) => api.get(`/deployment-advice${buildQuery(params)}`),
  getById: (id) => api.get(`/deployment-advice/${id}`),
  create: (data) => api.post('/deployment-advice', data),
  update: (id, data) => api.put(`/deployment-advice/${id}`, data),
  delete: (id) => api.delete(`/deployment-advice/${id}`),
  advise: (id) => api.post(`/deployment-advice/${id}/advise`),
};
