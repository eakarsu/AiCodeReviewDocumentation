// Analytics Page - Dashboard with charts and metrics
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { metricsApi } from '../services/api';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';

function Analytics() {
  const [dashboard, setDashboard] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardData, trendsData, categoriesData] = await Promise.all([
        metricsApi.getDashboard(),
        metricsApi.getTrends(),
        metricsApi.getCategories()
      ]);
      setDashboard(dashboardData);
      setTrends(trendsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = () => {
    if (!dashboard?.weekly_comparison) return 0;
    const { this_week, last_week } = dashboard.weekly_comparison;
    if (last_week === 0) return this_week > 0 ? 100 : 0;
    return ((this_week - last_week) / last_week) * 100;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Review metrics and trends
            </p>
          </div>
        </div>
        <button onClick={fetchData} className="btn bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Reviews"
          value={dashboard?.total_reviews || 0}
          subtitle={`${dashboard?.completed_reviews || 0} completed`}
          trend={calculateTrend()}
          trendLabel="vs last week"
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />

        <MetricCard
          title="Total Issues"
          value={parseInt(dashboard?.total_issues) || 0}
          subtitle="Found in reviews"
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <MetricCard
          title="Avg Severity"
          value={parseFloat(dashboard?.avg_severity || 0).toFixed(1)}
          subtitle="Score out of 10"
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />

        <MetricCard
          title="Pending Assignments"
          value={dashboard?.assignments?.pending || 0}
          subtitle={`${dashboard?.assignments?.in_progress || 0} in progress`}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Review Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Review Trends (30 days)</h3>
          <TrendChart
            data={trends}
            dataKey="total"
            label="Reviews"
            color="#3b82f6"
            type="line"
            height={200}
          />
        </div>

        {/* Issues Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Issues Found</h3>
          <TrendChart
            data={trends}
            dataKey="issues"
            label="Issues"
            color="#f97316"
            type="bar"
            height={200}
          />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Issues by Category</h3>
          {categories.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No data</p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat, i) => {
                const total = categories.reduce((sum, c) => sum + parseInt(c.count), 0);
                const percentage = total > 0 ? (parseInt(cat.count) / total) * 100 : 0;
                const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-gray-500'];
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300 capitalize">{cat.category}</span>
                      <span className="text-gray-500 dark:text-gray-400">{cat.count}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[i % colors.length]} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Pull Requests</span>
              <span className="font-semibold text-gray-900 dark:text-white">{dashboard?.total_prs || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Teams</span>
              <span className="font-semibold text-gray-900 dark:text-white">{dashboard?.total_teams || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Webhooks</span>
              <span className="font-semibold text-gray-900 dark:text-white">{dashboard?.active_webhooks || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Pending Reviews</span>
              <span className="font-semibold text-gray-900 dark:text-white">{dashboard?.pending_reviews || 0}</span>
            </div>
          </div>
        </div>

        {/* Weekly Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">This Week vs Last</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Reviews This Week</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {dashboard?.weekly_comparison?.this_week || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Reviews Last Week</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {dashboard?.weekly_comparison?.last_week || 0}
                </span>
              </div>
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Avg Severity This Week</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {parseFloat(dashboard?.weekly_comparison?.avg_severity_this_week || 0).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Avg Severity Last Week</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {parseFloat(dashboard?.weekly_comparison?.avg_severity_last_week || 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
