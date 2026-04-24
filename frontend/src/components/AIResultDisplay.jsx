import { useState } from 'react';

function AIResultDisplay({ content, title = "AI Analysis" }) {
  const [expanded, setExpanded] = useState(true);

  if (!content) return null;

  // Parse markdown-style headers and format content
  const formatContent = (text) => {
    const lines = text.split('\n');
    const sections = [];
    let currentSection = null;

    lines.forEach((line, index) => {
      // Main headers (##)
      if (line.match(/^##\s+\*\*(.+)\*\*/)) {
        if (currentSection) sections.push(currentSection);
        const title = line.replace(/^##\s+\*\*/, '').replace(/\*\*$/, '').replace(/\*\*/g, '');
        currentSection = { type: 'section', title, content: [], level: 2 };
      }
      // Bold headers with colon
      else if (line.match(/^\*\*\d+\.\s*(.+?):\*\*/)) {
        if (currentSection) sections.push(currentSection);
        const title = line.replace(/^\*\*\d+\.\s*/, '').replace(/:\*\*.*$/, '');
        const afterColon = line.replace(/^\*\*\d+\.\s*(.+?):\*\*\s*/, '');
        currentSection = { type: 'numbered', title, content: afterColon ? [afterColon] : [], level: 1 };
      }
      // Simple bold headers
      else if (line.match(/^\*\*(.+?)\*\*:/)) {
        if (currentSection) sections.push(currentSection);
        const title = line.match(/^\*\*(.+?)\*\*/)[1];
        const afterColon = line.replace(/^\*\*(.+?)\*\*:\s*/, '');
        currentSection = { type: 'header', title, content: afterColon ? [afterColon] : [], level: 1 };
      }
      // Numbered items at start
      else if (line.match(/^\d+\.\s+\*\*(.+?)\*\*/)) {
        if (currentSection) sections.push(currentSection);
        const title = line.match(/\*\*(.+?)\*\*/)?.[1] || line.replace(/^\d+\.\s+/, '');
        const afterTitle = line.replace(/^\d+\.\s+\*\*(.+?)\*\*:?\s*/, '');
        currentSection = { type: 'numbered', title, content: afterTitle ? [afterTitle] : [], level: 1 };
      }
      // Regular bullet points
      else if (line.match(/^[-*]\s+/)) {
        if (currentSection) {
          currentSection.content.push(line.replace(/^[-*]\s+/, ''));
        } else {
          currentSection = { type: 'list', title: '', content: [line.replace(/^[-*]\s+/, '')] };
        }
      }
      // Regular content
      else if (line.trim()) {
        if (currentSection) {
          currentSection.content.push(line);
        } else {
          currentSection = { type: 'text', title: '', content: [line] };
        }
      }
    });

    if (currentSection) sections.push(currentSection);
    return sections;
  };

  const sections = formatContent(content);

  const getIconForSection = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('bug') || lowerTitle.includes('risk') || lowerTitle.includes('vulnerability')) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    if (lowerTitle.includes('recommend') || lowerTitle.includes('suggestion') || lowerTitle.includes('improve')) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (lowerTitle.includes('score') || lowerTitle.includes('probability') || lowerTitle.includes('rating')) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    }
    if (lowerTitle.includes('security') || lowerTitle.includes('protect')) {
      return (
        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    }
    if (lowerTitle.includes('overview') || lowerTitle.includes('summary')) {
      return (
        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    );
  };

  const formatText = (text) => {
    // Convert **bold** to actual bold
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      // Convert `code` to code styling
      return part.split(/(`[^`]+`)/).map((codePart, j) => {
        if (codePart.startsWith('`') && codePart.endsWith('`')) {
          return <code key={`${i}-${j}`} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-primary-600 dark:text-primary-400">{codePart.slice(1, -1)}</code>;
        }
        return codePart;
      });
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
            AI Powered
          </span>
        </div>
        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
          <svg className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {section.title && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  {getIconForSection(section.title)}
                  <h4 className="font-medium text-gray-900 dark:text-white">{section.title}</h4>
                </div>
              )}
              <div className="px-4 py-3">
                {section.content.length > 0 ? (
                  <ul className="space-y-2">
                    {section.content.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="mt-1.5 w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0"></span>
                        <span>{formatText(item)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No additional details</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AIResultDisplay;
