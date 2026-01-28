// CodeViewer Component - Syntax highlighted code display with line numbers
import { useEffect, useRef, useState } from 'react';

// Simple syntax highlighting without external dependencies
// Uses regex-based tokenization for common languages

const tokenize = (code, language) => {
  const tokens = [];
  let remaining = code;

  const patterns = {
    javascript: [
      { type: 'comment', pattern: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
      { type: 'string', pattern: /^("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)/ },
      { type: 'keyword', pattern: /^(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|default|from|async|await|try|catch|throw|finally|typeof|instanceof|in|of|this|super|null|undefined|true|false)\b/ },
      { type: 'number', pattern: /^(\d+\.?\d*|0x[a-fA-F0-9]+)/ },
      { type: 'function', pattern: /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/ },
      { type: 'operator', pattern: /^(=>|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^~])/ },
      { type: 'punctuation', pattern: /^[{}[\]();,.:?]/ },
    ],
    typescript: [], // Will inherit from javascript
    python: [
      { type: 'comment', pattern: /^(#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?''')/ },
      { type: 'string', pattern: /^("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|f"[^"]*"|f'[^']*')/ },
      { type: 'keyword', pattern: /^(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|raise|pass|break|continue|and|or|not|in|is|None|True|False|lambda|global|nonlocal|async|await)\b/ },
      { type: 'decorator', pattern: /^@[a-zA-Z_][a-zA-Z0-9_]*/ },
      { type: 'number', pattern: /^(\d+\.?\d*|0x[a-fA-F0-9]+)/ },
      { type: 'function', pattern: /^([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/ },
      { type: 'operator', pattern: /^(->|==|!=|<=|>=|[+\-*/%=<>])/ },
      { type: 'punctuation', pattern: /^[{}[\]();,.:?]/ },
    ],
    java: [
      { type: 'comment', pattern: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
      { type: 'string', pattern: /^("[^"\\]*(?:\\.[^"\\]*)*")/ },
      { type: 'keyword', pattern: /^(public|private|protected|static|final|abstract|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|void|int|long|float|double|boolean|char|byte|short|null|true|false|this|super|import|package)\b/ },
      { type: 'annotation', pattern: /^@[a-zA-Z_][a-zA-Z0-9_]*/ },
      { type: 'number', pattern: /^(\d+\.?\d*[fFdDlL]?|0x[a-fA-F0-9]+)/ },
      { type: 'function', pattern: /^([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/ },
      { type: 'operator', pattern: /^(==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^~])/ },
      { type: 'punctuation', pattern: /^[{}[\]();,.:?]/ },
    ],
    go: [
      { type: 'comment', pattern: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
      { type: 'string', pattern: /^("[^"\\]*(?:\\.[^"\\]*)*"|`[^`]*`)/ },
      { type: 'keyword', pattern: /^(package|import|func|return|var|const|type|struct|interface|map|chan|go|defer|if|else|for|range|switch|case|default|break|continue|fallthrough|select|nil|true|false|iota)\b/ },
      { type: 'number', pattern: /^(\d+\.?\d*|0x[a-fA-F0-9]+)/ },
      { type: 'function', pattern: /^([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/ },
      { type: 'operator', pattern: /^(:=|==|!=|<=|>=|&&|\|\||<-|[+\-*/%=<>!&|^])/ },
      { type: 'punctuation', pattern: /^[{}[\]();,.:?]/ },
    ],
    sql: [
      { type: 'comment', pattern: /^(--[^\n]*|\/\*[\s\S]*?\*\/)/ },
      { type: 'string', pattern: /^('[^']*')/ },
      { type: 'keyword', pattern: /^(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|ORDER BY|GROUP BY|HAVING|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|ALTER|DROP|IF|EXISTS|NULL|PRIMARY KEY|FOREIGN KEY|REFERENCES|UNIQUE|DEFAULT|SERIAL|INTEGER|VARCHAR|TEXT|BOOLEAN|TIMESTAMP|JSONB)\b/i },
      { type: 'number', pattern: /^(\d+\.?\d*)/ },
      { type: 'function', pattern: /^([A-Z_][A-Z0-9_]*)\s*(?=\()/i },
      { type: 'operator', pattern: /^(=|<>|!=|<=|>=|[+\-*/<>])/ },
      { type: 'punctuation', pattern: /^[{}[\]();,.:?]/ },
    ],
    rust: [
      { type: 'comment', pattern: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
      { type: 'string', pattern: /^("[^"\\]*(?:\\.[^"\\]*)*")/ },
      { type: 'keyword', pattern: /^(fn|let|mut|const|static|if|else|match|loop|while|for|in|break|continue|return|struct|enum|impl|trait|type|pub|mod|use|crate|self|super|where|async|await|move|ref|true|false|Some|None|Ok|Err)\b/ },
      { type: 'macro', pattern: /^([a-zA-Z_][a-zA-Z0-9_]*!)/ },
      { type: 'lifetime', pattern: /^('[a-zA-Z_][a-zA-Z0-9_]*)/ },
      { type: 'number', pattern: /^(\d+\.?\d*[fiu]?(32|64)?|0x[a-fA-F0-9]+)/ },
      { type: 'function', pattern: /^([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/ },
      { type: 'operator', pattern: /^(=>|->|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^])/ },
      { type: 'punctuation', pattern: /^[{}[\]();,.:?]/ },
    ],
  };

  // TypeScript uses same patterns as JavaScript
  patterns.typescript = patterns.javascript;

  const langPatterns = patterns[language?.toLowerCase()] || patterns.javascript;

  while (remaining.length > 0) {
    let matched = false;

    for (const { type, pattern } of langPatterns) {
      const match = remaining.match(pattern);
      if (match) {
        tokens.push({ type, value: match[0] });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Check for whitespace
      const wsMatch = remaining.match(/^\s+/);
      if (wsMatch) {
        tokens.push({ type: 'whitespace', value: wsMatch[0] });
        remaining = remaining.slice(wsMatch[0].length);
      } else {
        // Add single character as plain text
        tokens.push({ type: 'plain', value: remaining[0] });
        remaining = remaining.slice(1);
      }
    }
  }

  return tokens;
};

const tokenColors = {
  comment: 'text-gray-500 dark:text-gray-400 italic',
  string: 'text-green-600 dark:text-green-400',
  keyword: 'text-purple-600 dark:text-purple-400 font-medium',
  number: 'text-orange-600 dark:text-orange-400',
  function: 'text-blue-600 dark:text-blue-400',
  operator: 'text-pink-600 dark:text-pink-400',
  punctuation: 'text-gray-600 dark:text-gray-400',
  decorator: 'text-yellow-600 dark:text-yellow-400',
  annotation: 'text-yellow-600 dark:text-yellow-400',
  macro: 'text-teal-600 dark:text-teal-400',
  lifetime: 'text-orange-500 dark:text-orange-300',
  plain: 'text-gray-900 dark:text-gray-100',
  whitespace: '',
};

function CodeViewer({
  code,
  language = 'javascript',
  showLineNumbers = true,
  highlightLines = [],
  maxHeight = '500px',
  className = ''
}) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!code) {
    return (
      <div className="text-gray-400 dark:text-gray-500 italic p-4 border rounded-lg border-gray-200 dark:border-gray-700">
        No code to display
      </div>
    );
  }

  const lines = code.split('\n');
  const highlightSet = new Set(highlightLines);

  return (
    <div className={`relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div
        className="overflow-auto"
        style={{ maxHeight }}
        ref={codeRef}
      >
        <table className="w-full text-sm font-mono">
          <tbody>
            {lines.map((line, index) => {
              const lineNum = index + 1;
              const isHighlighted = highlightSet.has(lineNum);
              const tokens = tokenize(line, language);

              return (
                <tr
                  key={index}
                  className={`${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                >
                  {showLineNumbers && (
                    <td className="select-none text-right pr-4 pl-4 py-0 text-gray-400 dark:text-gray-600 border-r border-gray-200 dark:border-gray-700 w-12">
                      {lineNum}
                    </td>
                  )}
                  <td className="pl-4 pr-4 py-0 whitespace-pre">
                    {tokens.map((token, i) => (
                      <span key={i} className={tokenColors[token.type] || ''}>
                        {token.value}
                      </span>
                    ))}
                    {line === '' && '\u00A0'}
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

export default CodeViewer;
