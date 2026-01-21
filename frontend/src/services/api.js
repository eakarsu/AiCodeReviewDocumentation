const BASE_URL = '/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

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

// Feature-specific API methods
export const codeReviewsApi = {
  getAll: () => api.get('/code-reviews'),
  getById: (id) => api.get(`/code-reviews/${id}`),
  create: (data) => api.post('/code-reviews', data),
  update: (id, data) => api.put(`/code-reviews/${id}`, data),
  delete: (id) => api.delete(`/code-reviews/${id}`),
  analyze: (id) => api.post(`/code-reviews/${id}/analyze`),
};

export const documentationApi = {
  getAll: () => api.get('/documentation'),
  getById: (id) => api.get(`/documentation/${id}`),
  create: (data) => api.post('/documentation', data),
  update: (id, data) => api.put(`/documentation/${id}`, data),
  delete: (id) => api.delete(`/documentation/${id}`),
  generate: (id) => api.post(`/documentation/${id}/generate`),
};

export const codeAnalysisApi = {
  getAll: () => api.get('/code-analysis'),
  getById: (id) => api.get(`/code-analysis/${id}`),
  create: (data) => api.post('/code-analysis', data),
  update: (id, data) => api.put(`/code-analysis/${id}`, data),
  delete: (id) => api.delete(`/code-analysis/${id}`),
  analyze: (id) => api.post(`/code-analysis/${id}/analyze`),
};

export const apiDocsApi = {
  getAll: () => api.get('/api-docs'),
  getById: (id) => api.get(`/api-docs/${id}`),
  create: (data) => api.post('/api-docs', data),
  update: (id, data) => api.put(`/api-docs/${id}`, data),
  delete: (id) => api.delete(`/api-docs/${id}`),
  generate: (id) => api.post(`/api-docs/${id}/generate`),
};

export const readmeGeneratorApi = {
  getAll: () => api.get('/readme-generator'),
  getById: (id) => api.get(`/readme-generator/${id}`),
  create: (data) => api.post('/readme-generator', data),
  update: (id, data) => api.put(`/readme-generator/${id}`, data),
  delete: (id) => api.delete(`/readme-generator/${id}`),
  generate: (id) => api.post(`/readme-generator/${id}/generate`),
};

export const codeCommentsApi = {
  getAll: () => api.get('/code-comments'),
  getById: (id) => api.get(`/code-comments/${id}`),
  create: (data) => api.post('/code-comments', data),
  update: (id, data) => api.put(`/code-comments/${id}`, data),
  delete: (id) => api.delete(`/code-comments/${id}`),
  generate: (id) => api.post(`/code-comments/${id}/generate`),
};

export const securityScanApi = {
  getAll: () => api.get('/security-scan'),
  getById: (id) => api.get(`/security-scan/${id}`),
  create: (data) => api.post('/security-scan', data),
  update: (id, data) => api.put(`/security-scan/${id}`, data),
  delete: (id) => api.delete(`/security-scan/${id}`),
  scan: (id) => api.post(`/security-scan/${id}/scan`),
};

export const performanceApi = {
  getAll: () => api.get('/performance'),
  getById: (id) => api.get(`/performance/${id}`),
  create: (data) => api.post('/performance', data),
  update: (id, data) => api.put(`/performance/${id}`, data),
  delete: (id) => api.delete(`/performance/${id}`),
  analyze: (id) => api.post(`/performance/${id}/analyze`),
};

export const testGenerationApi = {
  getAll: () => api.get('/test-generation'),
  getById: (id) => api.get(`/test-generation/${id}`),
  create: (data) => api.post('/test-generation', data),
  update: (id, data) => api.put(`/test-generation/${id}`, data),
  delete: (id) => api.delete(`/test-generation/${id}`),
  generate: (id) => api.post(`/test-generation/${id}/generate`),
};

export const refactoringApi = {
  getAll: () => api.get('/refactoring'),
  getById: (id) => api.get(`/refactoring/${id}`),
  create: (data) => api.post('/refactoring', data),
  update: (id, data) => api.put(`/refactoring/${id}`, data),
  delete: (id) => api.delete(`/refactoring/${id}`),
  suggest: (id) => api.post(`/refactoring/${id}/suggest`),
};
