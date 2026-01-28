// Issues List Component - Expandable list of code review issues
import { useState } from 'react';
import { SeverityBadge, CategoryBadge } from './SeverityBadge';

function IssueItem({ issue, onToggleFixed }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-lg ${issue.fixed ? 'opacity-60' : ''} ${
      issue.severity === 'critical' ? 'border-red-200 dark:border-red-800' :
      issue.severity === 'high' ? 'border-orange-200 dark:border-orange-800' :
      'border-gray-200 dark:border-gray-700'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start justify-between gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge severity={issue.severity} size="small" />
            <CategoryBadge category={issue.category} />
            {issue.line_number && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Line {issue.line_number}
              </span>
            )}
          </div>
          <h4 className={`font-medium text-gray-900 dark:text-white ${issue.fixed ? 'line-through' : ''}`}>
            {issue.title}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {issue.fixed && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Fixed</span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700/50">
          {issue.description && (
            <div className="pt-3">
              <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Description
              </h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {issue.description}
              </p>
            </div>
          )}

          {issue.suggestion && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Suggestion
              </h5>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                {issue.suggestion}
              </div>
            </div>
          )}

          {onToggleFixed && (
            <div className="pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFixed(issue.id, !issue.fixed);
                }}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  issue.fixed
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                }`}
              >
                {issue.fixed ? 'Mark as Unfixed' : 'Mark as Fixed'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssuesList({ issues, onToggleFixed, groupBy = 'severity' }) {
  const [filter, setFilter] = useState('all');

  if (!issues || issues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No issues found in this review.
      </div>
    );
  }

  // Filter issues
  const filteredIssues = filter === 'all'
    ? issues
    : filter === 'unfixed'
    ? issues.filter(i => !i.fixed)
    : issues.filter(i => i.severity === filter || i.category === filter);

  // Group issues
  const groupedIssues = {};
  if (groupBy === 'severity') {
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    severityOrder.forEach(severity => {
      const group = filteredIssues.filter(i => i.severity === severity);
      if (group.length > 0) {
        groupedIssues[severity] = group;
      }
    });
  } else if (groupBy === 'category') {
    filteredIssues.forEach(issue => {
      const cat = issue.category || 'other';
      if (!groupedIssues[cat]) {
        groupedIssues[cat] = [];
      }
      groupedIssues[cat].push(issue);
    });
  } else {
    groupedIssues['all'] = filteredIssues;
  }

  const fixedCount = issues.filter(i => i.fixed).length;
  const unfixedCount = issues.length - fixedCount;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Issues ({issues.length})</option>
            <option value="unfixed">Unfixed ({unfixedCount})</option>
            <optgroup label="By Severity">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </optgroup>
            <optgroup label="By Category">
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="bug">Bug</option>
              <option value="style">Style</option>
              <option value="maintainability">Maintainability</option>
            </optgroup>
          </select>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {fixedCount > 0 && (
            <span className="text-green-600 dark:text-green-400">{fixedCount} fixed</span>
          )}
          {fixedCount > 0 && unfixedCount > 0 && ' / '}
          {unfixedCount > 0 && (
            <span>{unfixedCount} remaining</span>
          )}
        </div>
      </div>

      {/* Issues list */}
      <div className="space-y-4">
        {Object.entries(groupedIssues).map(([group, groupIssues]) => (
          <div key={group}>
            {groupBy !== 'none' && Object.keys(groupedIssues).length > 1 && (
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize mb-2 flex items-center gap-2">
                {group}
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                  {groupIssues.length}
                </span>
              </h3>
            )}
            <div className="space-y-2">
              {groupIssues.map((issue, index) => (
                <IssueItem
                  key={issue.id || index}
                  issue={issue}
                  onToggleFixed={onToggleFixed}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredIssues.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No issues match the current filter.
        </div>
      )}
    </div>
  );
}

export default IssuesList;
