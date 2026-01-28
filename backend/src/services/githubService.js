// GitHub Service - API wrapper for GitHub operations using Personal Access Token

class GitHubService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://api.github.com';
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  // Verify token and get user info
  async getAuthenticatedUser() {
    return this.request('/user');
  }

  // List repositories for authenticated user
  async listRepositories(options = {}) {
    const { sort = 'updated', per_page = 30, page = 1 } = options;
    return this.request(`/user/repos?sort=${sort}&per_page=${per_page}&page=${page}`);
  }

  // Get a specific repository
  async getRepository(owner, repo) {
    return this.request(`/repos/${owner}/${repo}`);
  }

  // List pull requests for a repository
  async listPullRequests(owner, repo, options = {}) {
    const { state = 'open', sort = 'created', direction = 'desc', per_page = 30 } = options;
    return this.request(`/repos/${owner}/${repo}/pulls?state=${state}&sort=${sort}&direction=${direction}&per_page=${per_page}`);
  }

  // Get a specific pull request
  async getPullRequest(owner, repo, pullNumber) {
    return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
  }

  // Get pull request diff
  async getPullRequestDiff(owner, repo, pullNumber) {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3.diff',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get PR diff: ${response.status}`);
    }

    return response.text();
  }

  // Get files changed in a pull request
  async getPullRequestFiles(owner, repo, pullNumber) {
    return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`);
  }

  // Parse PR URL to extract owner, repo, and PR number
  static parsePullRequestUrl(url) {
    // Handle both github.com URLs and API URLs
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/,
      /api\.github\.com\/repos\/([^\/]+)\/([^\/]+)\/pulls\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
          pullNumber: parseInt(match[3]),
        };
      }
    }

    throw new Error('Invalid GitHub pull request URL');
  }

  // Fetch complete PR data including diff
  async fetchPullRequestComplete(owner, repo, pullNumber) {
    const [pr, files, diff] = await Promise.all([
      this.getPullRequest(owner, repo, pullNumber),
      this.getPullRequestFiles(owner, repo, pullNumber),
      this.getPullRequestDiff(owner, repo, pullNumber),
    ]);

    return {
      pr_number: pr.number,
      title: pr.title,
      author: pr.user.login,
      repository: `${owner}/${repo}`,
      base_branch: pr.base.ref,
      head_branch: pr.head.ref,
      pr_url: pr.html_url,
      state: pr.state,
      diff_content: diff,
      files_changed: files.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
      })),
      created_at: pr.created_at,
      updated_at: pr.updated_at,
    };
  }
}

export const createGitHubService = (accessToken) => new GitHubService(accessToken);
export default GitHubService;
