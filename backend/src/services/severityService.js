// Severity scoring and issue parsing service

const SEVERITY_WEIGHTS = {
  critical: 10,
  high: 8,
  medium: 5,
  low: 3,
  info: 1
};

const CATEGORY_TYPES = ['security', 'performance', 'bug', 'style', 'maintainability'];

/**
 * Parse structured issues from AI response
 */
export const parseIssuesFromAI = (aiResponse) => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return normalizeIssues(parsed.issues || parsed);
    }

    // Try direct JSON parse
    const parsed = JSON.parse(aiResponse);
    return normalizeIssues(parsed.issues || parsed);
  } catch {
    // If not valid JSON, attempt to extract issues from text
    return extractIssuesFromText(aiResponse);
  }
};

/**
 * Normalize issue structure
 */
const normalizeIssues = (issues) => {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.map((issue, index) => ({
    category: normalizeCategory(issue.category),
    severity: normalizeSeverity(issue.severity),
    severity_score: SEVERITY_WEIGHTS[normalizeSeverity(issue.severity)] || 5,
    title: issue.title || `Issue ${index + 1}`,
    description: issue.description || '',
    line_number: issue.line_number || issue.lineNumber || issue.line || null,
    suggestion: issue.suggestion || issue.fix || issue.recommendation || ''
  }));
};

/**
 * Extract issues from unstructured text response
 */
const extractIssuesFromText = (text) => {
  const issues = [];

  // Look for common patterns in code review text
  const patterns = [
    /(?:issue|problem|bug|error|warning)[\s#]*(\d+)?[:\s]+(.+?)(?=(?:issue|problem|bug|error|warning)[\s#]*\d*:|$)/gi,
    /(?:\d+\.\s*)(.+?)(?=\d+\.|$)/g
  ];

  // Simple extraction based on numbered lists or bullet points
  const lines = text.split('\n');
  let currentIssue = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for severity indicators
    const severityMatch = trimmed.match(/\*\*(critical|high|medium|low|info)\*\*/i) ||
                         trimmed.match(/\[(critical|high|medium|low|info)\]/i);

    // Check for numbered or bulleted items
    const listMatch = trimmed.match(/^(?:\d+\.|\*|\-)\s*(.+)/);

    if (listMatch) {
      if (currentIssue) {
        issues.push(currentIssue);
      }

      const title = listMatch[1];
      const severity = severityMatch ? severityMatch[1].toLowerCase() : guessSeverity(title);

      currentIssue = {
        category: guessCategory(title),
        severity: severity,
        severity_score: SEVERITY_WEIGHTS[severity] || 5,
        title: title.substring(0, 255),
        description: '',
        line_number: extractLineNumber(title),
        suggestion: ''
      };
    } else if (currentIssue && trimmed) {
      // Add to description of current issue
      if (trimmed.toLowerCase().includes('suggestion') ||
          trimmed.toLowerCase().includes('fix') ||
          trimmed.toLowerCase().includes('recommend')) {
        currentIssue.suggestion += trimmed + ' ';
      } else {
        currentIssue.description += trimmed + ' ';
      }
    }
  }

  if (currentIssue) {
    issues.push(currentIssue);
  }

  return issues;
};

/**
 * Normalize category to allowed values
 */
const normalizeCategory = (category) => {
  if (!category) return 'maintainability';
  const lower = category.toLowerCase();

  if (lower.includes('security') || lower.includes('vuln')) return 'security';
  if (lower.includes('perform') || lower.includes('speed') || lower.includes('optim')) return 'performance';
  if (lower.includes('bug') || lower.includes('error') || lower.includes('defect')) return 'bug';
  if (lower.includes('style') || lower.includes('format') || lower.includes('naming')) return 'style';

  return 'maintainability';
};

/**
 * Normalize severity to allowed values
 */
const normalizeSeverity = (severity) => {
  if (!severity) return 'medium';
  const lower = severity.toLowerCase();

  if (lower.includes('critical') || lower.includes('blocker')) return 'critical';
  if (lower.includes('high') || lower.includes('major')) return 'high';
  if (lower.includes('medium') || lower.includes('moderate')) return 'medium';
  if (lower.includes('low') || lower.includes('minor')) return 'low';
  if (lower.includes('info') || lower.includes('trivial') || lower.includes('suggestion')) return 'info';

  return 'medium';
};

/**
 * Guess severity from issue text
 */
const guessSeverity = (text) => {
  const lower = text.toLowerCase();

  if (lower.includes('security') || lower.includes('injection') || lower.includes('xss') ||
      lower.includes('vulnerability') || lower.includes('password') || lower.includes('auth')) {
    return 'critical';
  }
  if (lower.includes('crash') || lower.includes('memory leak') || lower.includes('null pointer') ||
      lower.includes('unhandled') || lower.includes('race condition')) {
    return 'high';
  }
  if (lower.includes('performance') || lower.includes('inefficient') || lower.includes('deprecated')) {
    return 'medium';
  }
  if (lower.includes('naming') || lower.includes('style') || lower.includes('formatting') ||
      lower.includes('comment') || lower.includes('documentation')) {
    return 'low';
  }

  return 'medium';
};

/**
 * Guess category from issue text
 */
const guessCategory = (text) => {
  const lower = text.toLowerCase();

  if (lower.includes('security') || lower.includes('injection') || lower.includes('xss') ||
      lower.includes('csrf') || lower.includes('auth') || lower.includes('password')) {
    return 'security';
  }
  if (lower.includes('performance') || lower.includes('slow') || lower.includes('optimize') ||
      lower.includes('memory') || lower.includes('complexity')) {
    return 'performance';
  }
  if (lower.includes('bug') || lower.includes('error') || lower.includes('null') ||
      lower.includes('undefined') || lower.includes('crash')) {
    return 'bug';
  }
  if (lower.includes('naming') || lower.includes('style') || lower.includes('format') ||
      lower.includes('indent') || lower.includes('spacing')) {
    return 'style';
  }

  return 'maintainability';
};

/**
 * Extract line number from text if mentioned
 */
const extractLineNumber = (text) => {
  const match = text.match(/line\s*(\d+)/i) || text.match(/L(\d+)/);
  return match ? parseInt(match[1]) : null;
};

/**
 * Calculate overall severity score from issues
 */
export const calculateOverallSeverity = (issues) => {
  if (!issues || issues.length === 0) return 0;

  let totalWeight = 0;
  let maxWeight = 0;

  for (const issue of issues) {
    const weight = issue.severity_score || SEVERITY_WEIGHTS[issue.severity] || 5;
    totalWeight += weight;
    maxWeight = Math.max(maxWeight, weight);
  }

  // Combine average and max severity for overall score (1-10 scale)
  const avgWeight = totalWeight / issues.length;
  const combinedScore = (avgWeight * 0.6 + maxWeight * 0.4);

  return Math.round(Math.min(10, Math.max(1, combinedScore)));
};

/**
 * Get severity color class for UI
 */
export const getSeverityColor = (severity) => {
  const colors = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'blue',
    info: 'gray'
  };
  return colors[severity] || 'gray';
};

/**
 * Group issues by category
 */
export const groupIssuesByCategory = (issues) => {
  const grouped = {};

  for (const category of CATEGORY_TYPES) {
    grouped[category] = issues.filter(i => i.category === category);
  }

  return grouped;
};

export default {
  parseIssuesFromAI,
  calculateOverallSeverity,
  getSeverityColor,
  groupIssuesByCategory,
  SEVERITY_WEIGHTS,
  CATEGORY_TYPES
};
