// GitHub Integration Page - Connect and manage GitHub access
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PRFetcher from '../components/PRFetcher';
import PRList from '../components/PRList';
import { githubApi, pullRequestsApi } from '../services/api';

function GitHubIntegration() {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [pullRequests, setPullRequests] = useState([]);
  const [fetchedPRs, setFetchedPRs] = useState([]);
  const [activeTab, setActiveTab] = useState('fetched');

  useEffect(() => {
    checkStatus();
    loadFetchedPRs();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await githubApi.getStatus();
      setConnectionStatus(status);
      if (status.connected) {
        loadRepos();
      }
    } catch (err) {
      console.error('Status check error:', err);
      setConnectionStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const loadRepos = async () => {
    try {
      const data = await githubApi.getRepos();
      setRepos(data);
    } catch (err) {
      console.error('Repos error:', err);
    }
  };

  const loadFetchedPRs = async () => {
    try {
      const data = await pullRequestsApi.getAll();
      setFetchedPRs(data);
    } catch (err) {
      console.error('Fetched PRs error:', err);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;

    setConnecting(true);
    try {
      const result = await githubApi.connect(token);
      setConnectionStatus({ connected: true, ...result });
      setToken('');
      loadRepos();
    } catch (err) {
      alert('Connection failed: ' + err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect from GitHub?')) return;

    try {
      await githubApi.disconnect();
      setConnectionStatus({ connected: false });
      setRepos([]);
      setPullRequests([]);
    } catch (err) {
      alert('Disconnect failed: ' + err.message);
    }
  };

  const handleSelectRepo = async (repo) => {
    setSelectedRepo(repo);
    try {
      const [owner, name] = repo.full_name.split('/');
      const prs = await githubApi.getRepoPulls(owner, name);
      setPullRequests(prs);
    } catch (err) {
      console.error('PRs error:', err);
    }
  };

  const handlePRFetched = (pr) => {
    loadFetchedPRs();
    setActiveTab('fetched');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GitHub Integration</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Connect to GitHub to fetch and review pull requests
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connection Status
            </h2>

            {connectionStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {connectionStatus.avatar_url && (
                    <img
                      src={connectionStatus.avatar_url}
                      alt={connectionStatus.username}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {connectionStatus.username}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Connected
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="w-full btn bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Generate at GitHub &rarr; Settings &rarr; Developer settings &rarr; Personal access tokens
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={connecting}
                  className="w-full btn btn-primary flex items-center justify-center gap-2"
                >
                  {connecting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      Connect to GitHub
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Quick Fetch */}
          {connectionStatus?.connected && (
            <div className="mt-6">
              <PRFetcher onFetched={handlePRFetched} />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {connectionStatus?.connected ? (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('fetched')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === 'fetched'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Fetched PRs ({fetchedPRs.length})
                </button>
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === 'browse'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Browse Repos
                </button>
              </div>

              {activeTab === 'fetched' ? (
                <PRList pullRequests={fetchedPRs} onRefresh={loadFetchedPRs} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Repos List */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">Repositories</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {repos.map(repo => (
                        <button
                          key={repo.id}
                          onClick={() => handleSelectRepo(repo)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedRepo?.id === repo.id
                              ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {repo.name}
                          </p>
                          {repo.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {repo.language && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {repo.language}
                              </span>
                            )}
                            {repo.private && (
                              <span className="text-xs text-yellow-600 dark:text-yellow-400">Private</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PRs List */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      {selectedRepo ? `PRs in ${selectedRepo.name}` : 'Select a Repository'}
                    </h3>
                    {selectedRepo ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {pullRequests.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No open pull requests
                          </p>
                        ) : (
                          pullRequests.map(pr => (
                            <div
                              key={pr.number}
                              className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                    #{pr.number} {pr.title}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    by {pr.author} &middot; {pr.head} &rarr; {pr.base}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    pullRequestsApi.fetch({ pr_url: pr.html_url }).then(() => {
                                      loadFetchedPRs();
                                      setActiveTab('fetched');
                                    });
                                  }}
                                  className="text-xs px-2 py-1 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50"
                                >
                                  Import
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Select a repository to view its pull requests
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Connect to GitHub
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Add your Personal Access Token to fetch and review pull requests
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GitHubIntegration;
