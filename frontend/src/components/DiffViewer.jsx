// DiffViewer Component - Side-by-side and unified diff view
import { useState, useMemo } from 'react';

// Simple diff algorithm
function computeDiff(oldLines, newLines) {
  const diff = [];
  const oldLen = oldLines.length;
  const newLen = newLines.length;

  // Simple LCS-based diff
  const lcs = [];
  for (let i = 0; i <= oldLen; i++) {
    lcs[i] = [];
    for (let j = 0; j <= newLen; j++) {
      if (i === 0 || j === 0) {
        lcs[i][j] = 0;
      } else if (oldLines[i - 1] === newLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  let i = oldLen;
  let j = newLen;
  const result = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'unchanged', oldLine: i, newLine: j, content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      result.unshift({ type: 'added', oldLine: null, newLine: j, content: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', oldLine: i, newLine: null, content: oldLines[i - 1] });
      i--;
    }
  }

  return result;
}

function DiffViewer({
  oldCode,
  newCode,
  oldTitle = 'Original',
  newTitle = 'Modified',
  language = 'javascript',
  splitView = true,
  className = ''
}) {
  const [viewMode, setViewMode] = useState(splitView ? 'split' : 'unified');

  const diffResult = useMemo(() => {
    const oldLines = (oldCode || '').split('\n');
    const newLines = (newCode || '').split('\n');
    return computeDiff(oldLines, newLines);
  }, [oldCode, newCode]);

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    diffResult.forEach(item => {
      if (item.type === 'added') additions++;
      if (item.type === 'removed') deletions++;
    });
    return { additions, deletions };
  }, [diffResult]);

  if (!oldCode && !newCode) {
    return (
      <div className="text-gray-400 dark:text-gray-500 italic p-4 border rounded-lg border-gray-200 dark:border-gray-700">
        No code to compare
      </div>
    );
  }

  const lineStyles = {
    added: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    removed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    unchanged: 'text-gray-800 dark:text-gray-200',
  };

  const prefixStyles = {
    added: 'text-green-600 dark:text-green-400',
    removed: 'text-red-600 dark:text-red-400',
    unchanged: 'text-gray-400 dark:text-gray-500',
  };

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {language}
          </span>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600 dark:text-green-400">+{stats.additions}</span>
            <span className="text-red-600 dark:text-red-400">-{stats.deletions}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              viewMode === 'split'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              viewMode === 'unified'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Unified
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-auto max-h-[600px] bg-white dark:bg-gray-900">
        {viewMode === 'split' ? (
          <SplitView
            diffResult={diffResult}
            oldTitle={oldTitle}
            newTitle={newTitle}
            lineStyles={lineStyles}
            prefixStyles={prefixStyles}
          />
        ) : (
          <UnifiedView
            diffResult={diffResult}
            lineStyles={lineStyles}
            prefixStyles={prefixStyles}
          />
        )}
      </div>
    </div>
  );
}

function SplitView({ diffResult, oldTitle, newTitle, lineStyles, prefixStyles }) {
  // Pair up lines for split view
  const pairs = [];
  let i = 0;

  while (i < diffResult.length) {
    const item = diffResult[i];

    if (item.type === 'unchanged') {
      pairs.push({ left: item, right: item });
      i++;
    } else if (item.type === 'removed') {
      // Look ahead for corresponding addition
      let added = null;
      if (i + 1 < diffResult.length && diffResult[i + 1].type === 'added') {
        added = diffResult[i + 1];
        i += 2;
      } else {
        i++;
      }
      pairs.push({ left: item, right: added });
    } else if (item.type === 'added') {
      pairs.push({ left: null, right: item });
      i++;
    }
  }

  return (
    <div className="flex">
      {/* Left side - Original */}
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-red-700 dark:text-red-300">{oldTitle}</span>
        </div>
        <table className="w-full text-sm font-mono">
          <tbody>
            {pairs.map((pair, idx) => {
              const item = pair.left;
              if (!item) {
                return (
                  <tr key={idx} className="bg-gray-50 dark:bg-gray-800/50">
                    <td className="w-12 text-right pr-4 pl-4 py-0 text-gray-300 dark:text-gray-600 border-r border-gray-200 dark:border-gray-700 select-none"></td>
                    <td className="pl-4 pr-4 py-0">&nbsp;</td>
                  </tr>
                );
              }
              return (
                <tr key={idx} className={item.type === 'unchanged' ? '' : lineStyles.removed}>
                  <td className="w-12 text-right pr-4 pl-4 py-0 text-gray-400 dark:text-gray-600 border-r border-gray-200 dark:border-gray-700 select-none">
                    {item.oldLine}
                  </td>
                  <td className="pl-4 pr-4 py-0 whitespace-pre">
                    {item.type !== 'unchanged' && <span className={prefixStyles.removed}>- </span>}
                    {item.content || '\u00A0'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Right side - Modified */}
      <div className="w-1/2">
        <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-green-700 dark:text-green-300">{newTitle}</span>
        </div>
        <table className="w-full text-sm font-mono">
          <tbody>
            {pairs.map((pair, idx) => {
              const item = pair.right;
              if (!item) {
                return (
                  <tr key={idx} className="bg-gray-50 dark:bg-gray-800/50">
                    <td className="w-12 text-right pr-4 pl-4 py-0 text-gray-300 dark:text-gray-600 border-r border-gray-200 dark:border-gray-700 select-none"></td>
                    <td className="pl-4 pr-4 py-0">&nbsp;</td>
                  </tr>
                );
              }
              return (
                <tr key={idx} className={item.type === 'unchanged' ? '' : lineStyles.added}>
                  <td className="w-12 text-right pr-4 pl-4 py-0 text-gray-400 dark:text-gray-600 border-r border-gray-200 dark:border-gray-700 select-none">
                    {item.newLine}
                  </td>
                  <td className="pl-4 pr-4 py-0 whitespace-pre">
                    {item.type !== 'unchanged' && <span className={prefixStyles.added}>+ </span>}
                    {item.content || '\u00A0'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UnifiedView({ diffResult, lineStyles, prefixStyles }) {
  return (
    <table className="w-full text-sm font-mono">
      <tbody>
        {diffResult.map((item, idx) => (
          <tr key={idx} className={lineStyles[item.type]}>
            <td className="w-12 text-right pr-2 pl-4 py-0 text-gray-400 dark:text-gray-600 select-none">
              {item.oldLine || ''}
            </td>
            <td className="w-12 text-right pr-4 py-0 text-gray-400 dark:text-gray-600 border-r border-gray-200 dark:border-gray-700 select-none">
              {item.newLine || ''}
            </td>
            <td className="w-6 text-center py-0">
              <span className={prefixStyles[item.type]}>
                {item.type === 'added' ? '+' : item.type === 'removed' ? '-' : ' '}
              </span>
            </td>
            <td className="pl-2 pr-4 py-0 whitespace-pre">
              {item.content || '\u00A0'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DiffViewer;
