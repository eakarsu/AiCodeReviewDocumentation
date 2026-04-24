import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

export const callOpenRouter = async (prompt, systemPrompt = '') => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return {
      success: false,
      error: 'OpenRouter API key not configured',
      content: null
    };
  }

  try {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Code Review App'
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 10096
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';

    // Strip markdown code fences that wrap the response (e.g. ```json ... ```)
    // This prevents JSON.parse() failures when AI wraps responses in code blocks
    content = content.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim();

    return {
      success: true,
      content,
      usage: data.usage
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return {
      success: false,
      error: error.message,
      content: null
    };
  }
};

// Specialized AI functions for each feature
export const aiCodeReview = async (code, language) => {
  const systemPrompt = 'You are an expert code reviewer. Analyze the code for bugs, best practices, and improvements. Be specific and actionable.';
  const prompt = `Review the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide:\n1. Summary of the code\n2. Potential bugs or issues\n3. Best practice violations\n4. Specific improvement suggestions\n5. Overall quality rating (1-10)`;

  return callOpenRouter(prompt, systemPrompt);
};

// Structured code review with JSON output for severity scoring
export const aiCodeReviewStructured = async (code, language) => {
  const systemPrompt = `You are an expert code reviewer. Analyze code for bugs, security issues, performance problems, and best practices. Always respond with valid JSON.`;

  const prompt = `Review the following ${language} code and provide a structured analysis.

\`\`\`${language}
${code}
\`\`\`

Respond with ONLY valid JSON in this exact format:
\`\`\`json
{
  "summary": "Brief summary of the code",
  "overallRating": 7,
  "issues": [
    {
      "category": "security|performance|bug|style|maintainability",
      "severity": "critical|high|medium|low|info",
      "title": "Brief issue title",
      "description": "Detailed description of the issue",
      "line_number": null,
      "suggestion": "How to fix this issue"
    }
  ],
  "positives": ["List of good things about the code"],
  "recommendations": ["Overall recommendations"]
}
\`\`\`

Be thorough but focused. Include line numbers when identifiable.`;

  return callOpenRouter(prompt, systemPrompt);
};

export const aiGenerateDocumentation = async (code, language) => {
  const systemPrompt = 'You are a technical documentation expert. Generate clear, comprehensive documentation.';
  const prompt = `Generate documentation for the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nInclude:\n1. Overview\n2. Function/Class descriptions\n3. Parameters and return values\n4. Usage examples\n5. Any important notes`;

  return callOpenRouter(prompt, systemPrompt);
};

export const aiCodeAnalysis = async (code, language) => {
  const systemPrompt = 'You are a code analysis expert. Provide detailed metrics and quality assessment.';
  const prompt = `Analyze the following ${language} code for quality metrics:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide:\n1. Complexity analysis (cyclomatic complexity estimate)\n2. Code quality score (1-100)\n3. Maintainability assessment\n4. Code smell detection\n5. Technical debt indicators`;

  return callOpenRouter(prompt, systemPrompt);
};

export const aiGenerateApiDocs = async (endpoint, method, requestBody, responseBody) => {
  const systemPrompt = 'You are an API documentation expert. Generate clear, developer-friendly API documentation.';
  const prompt = `Generate API documentation for:\n\nEndpoint: ${method} ${endpoint}\nRequest Body: ${requestBody || 'None'}\nResponse Body: ${responseBody || 'None'}\n\nInclude:\n1. Endpoint description\n2. Request parameters\n3. Request body schema\n4. Response schema\n5. Example requests/responses\n6. Error codes`;

  return callOpenRouter(prompt, systemPrompt);
};

export const aiGenerateReadme = async (projectStructure, techStack, description) => {
  const systemPrompt = 'You are a technical writer. Generate professional, comprehensive README files.';
  const prompt = `Generate a professional README for a project with:\n\nDescription: ${description}\nTech Stack: ${techStack}\nProject Structure:\n${projectStructure}\n\nInclude:\n1. Project title and badges\n2. Description\n3. Features\n4. Installation instructions\n5. Usage guide\n6. Configuration\n7. Contributing guidelines\n8. License`;

  return callOpenRouter(prompt, systemPrompt);
};

export const aiGenerateComments = async (code, language, style) => {
  const systemPrompt = 'You are a code documentation expert. Generate clear, helpful inline comments and docstrings.';
  const prompt = `Add ${style || 'comprehensive'} comments to the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide the code with:\n1. Function/method docstrings\n2. Inline comments for complex logic\n3. Parameter descriptions\n4. Return value descriptions`;

  return callOpenRouter(prompt, systemPrompt);
};

export const aiSecurityScan = async (code, language) => {
  const systemPrompt = 'You are a security expert. Identify vulnerabilities and provide remediation guidance.';
  const prompt = `Perform a security analysis on the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nIdentify:\n1. Security vulnerabilities (OWASP Top 10)\n2. Risk level for each issue (Critical/High/Medium/Low)\n3. Specific code locations of issues\n4. Remediation recommendations\n5. Security best practices to apply`;

  return callOpenRouter(prompt, systemPrompt);
};

export const aiPerformanceAnalysis = async (code, language) => {
  const systemPrompt = 'You are a performance optimization expert. Identify bottlenecks and suggest improvements.';
  const prompt = `Analyze the performance of the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide:\n1. Time complexity analysis\n2. Space complexity analysis\n3. Performance bottlenecks\n4. Optimization suggestions\n5. Performance score (1-100)`;

  return callOpenRouter(prompt, systemPrompt);
};

export const aiGenerateTests = async (code, language, framework) => {
  const systemPrompt = 'You are a test engineering expert. Generate comprehensive test suites.';
  const prompt = `Generate tests for the following ${language} code using ${framework || 'the standard testing framework'}:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nGenerate:\n1. Unit tests for all functions\n2. Edge case tests\n3. Error handling tests\n4. Integration test suggestions\n5. Estimated coverage percentage`;

  return callOpenRouter(prompt, systemPrompt);
};

export const aiRefactoringSuggestions = async (code, language) => {
  const systemPrompt = 'You are a refactoring expert. Suggest improvements while maintaining functionality.';
  const prompt = `Suggest refactoring improvements for the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide:\n1. Refactoring opportunities\n2. Design pattern suggestions\n3. Code organization improvements\n4. The refactored code\n5. Explanation of changes`;

  return callOpenRouter(prompt, systemPrompt);
};

// AI Bug Predictor
export const aiBugPrediction = async (code, language) => {
  const systemPrompt = 'You are an expert bug prediction AI. Analyze code to predict potential bugs before they occur. Focus on common patterns that lead to bugs.';
  const prompt = `Analyze the following ${language} code and predict potential bugs:

\`\`\`${language}
${code}
\`\`\`

Provide a detailed analysis including:
1. **Bug Probability Score** (0-100): Overall likelihood of bugs
2. **Predicted Bugs**: List of potential bugs that might occur
3. **Risk Areas**: Specific code sections that are bug-prone
4. **Root Cause Analysis**: Why these areas might cause bugs
5. **Prevention Recommendations**: How to prevent these bugs
6. **Test Coverage Suggestions**: Specific tests to catch these bugs

Format your response in a clear, structured way with sections and bullet points.`;

  return callOpenRouter(prompt, systemPrompt);
};

// AI Code Explainer (DevOps focused)
export const aiCodeExplainer = async (code, language, context = 'devops') => {
  const systemPrompt = 'You are a DevOps expert who explains code in the context of infrastructure, CI/CD, deployment, and operations. Make complex code understandable.';
  const prompt = `Explain the following ${language} code from a DevOps perspective:

\`\`\`${language}
${code}
\`\`\`

Provide a comprehensive explanation including:
1. **Overview**: What does this code do?
2. **DevOps Context**: How does this fit into DevOps practices?
3. **Key Concepts**: Important concepts and patterns used
4. **Infrastructure Impact**: How this affects infrastructure
5. **Security Considerations**: Security implications
6. **Best Practices**: DevOps best practices applicable here
7. **Complexity Level**: Beginner/Intermediate/Advanced
8. **Potential Issues**: What could go wrong in production

Format your response clearly with sections and explanations suitable for team documentation.`;

  return callOpenRouter(prompt, systemPrompt);
};

// AI Tech Debt Tracker
export const aiTechDebtAnalysis = async (code, language, projectContext = '') => {
  const systemPrompt = 'You are a technical debt analyst. Identify, categorize, and prioritize technical debt in code. Provide actionable remediation plans.';
  const prompt = `Analyze the following ${language} code for technical debt:

${projectContext ? `Project Context: ${projectContext}\n\n` : ''}
\`\`\`${language}
${code}
\`\`\`

Provide a comprehensive technical debt analysis:
1. **Debt Identification**: List all technical debt items found
2. **Debt Categories**: (Code Debt, Design Debt, Documentation Debt, Test Debt, Infrastructure Debt)
3. **Severity Assessment**: Critical/High/Medium/Low for each item
4. **Estimated Effort**: Time/effort to fix each item
5. **Priority Score** (1-100): Based on impact and effort
6. **Remediation Plan**: Step-by-step fix for each debt item
7. **Quick Wins**: Easy fixes with high impact
8. **Long-term Strategy**: How to prevent future debt

Be specific about line numbers and exact issues when possible.`;

  return callOpenRouter(prompt, systemPrompt);
};

// AI Architecture Reviewer
export const aiArchitectureReview = async (architectureDesc, techStack, systemType = '') => {
  const systemPrompt = 'You are a solutions architect expert. Review system architectures for scalability, maintainability, security, and best practices.';
  const prompt = `Review the following system architecture:

**System Type**: ${systemType || 'Not specified'}
**Tech Stack**: ${techStack}

**Architecture Description**:
${architectureDesc}

Provide a comprehensive architecture review:
1. **Architecture Assessment**: Overall evaluation
2. **Scalability Analysis**: Can it handle growth? Score (1-100)
3. **Maintainability Review**: How easy to maintain? Score (1-100)
4. **Security Evaluation**: Security posture. Score (1-100)
5. **Performance Considerations**: Potential bottlenecks
6. **Cost Optimization**: Suggestions for cost efficiency
7. **Recommendations**: Prioritized list of improvements
8. **Risk Areas**: Potential failure points
9. **Best Practices Alignment**: How well it follows industry standards
10. **Migration Considerations**: If changes are recommended

Format as a professional architecture review document.`;

  return callOpenRouter(prompt, systemPrompt);
};

// AI Dependency Auditor
export const aiDependencyAudit = async (dependencies, packageManager, projectType = '') => {
  const systemPrompt = 'You are a dependency security and compliance expert. Audit dependencies for vulnerabilities, outdated packages, and license issues.';
  const prompt = `Audit the following dependencies:

**Package Manager**: ${packageManager}
**Project Type**: ${projectType || 'Not specified'}

**Dependencies**:
${dependencies}

Provide a comprehensive dependency audit:
1. **Security Vulnerabilities**: Known CVEs and security issues
2. **Outdated Packages**: Packages that need updates
3. **License Compliance**: License compatibility issues
4. **Dependency Health**: Maintenance status of packages
5. **Risk Score** (1-100): Overall dependency risk
6. **Critical Updates**: Must-update packages
7. **Recommended Alternatives**: Better alternatives for problematic packages
8. **Update Strategy**: Safe update order and approach
9. **Breaking Changes**: Potential breaking changes when updating
10. **Dependency Graph Issues**: Circular dependencies, conflicts

Prioritize security issues and provide actionable recommendations.`;

  return callOpenRouter(prompt, systemPrompt);
};

// AI Deployment Advisor
export const aiDeploymentAdvice = async (currentSetup, targetEnv, deploymentType = '') => {
  const systemPrompt = 'You are a deployment and DevOps expert. Provide comprehensive deployment strategies, checklists, and best practices.';
  const prompt = `Provide deployment advice for the following scenario:

**Current Setup**:
${currentSetup}

**Target Environment**: ${targetEnv}
**Deployment Type**: ${deploymentType || 'Not specified'}

Provide comprehensive deployment guidance:
1. **Deployment Strategy**: Recommended approach (Blue-Green, Canary, Rolling, etc.)
2. **Pre-deployment Checklist**: Everything to verify before deploying
3. **Deployment Steps**: Detailed step-by-step process
4. **Rollback Plan**: How to roll back if issues occur
5. **Monitoring Setup**: What to monitor during/after deployment
6. **Risk Assessment**: Potential risks and mitigations
7. **Zero-downtime Strategy**: How to minimize or eliminate downtime
8. **Post-deployment Verification**: How to verify successful deployment
9. **Infrastructure Requirements**: What's needed in target environment
10. **Security Considerations**: Security checks for deployment

Format as a professional deployment runbook.`;

  return callOpenRouter(prompt, systemPrompt);
};

export default {
  callOpenRouter,
  aiCodeReview,
  aiCodeReviewStructured,
  aiGenerateDocumentation,
  aiCodeAnalysis,
  aiGenerateApiDocs,
  aiGenerateReadme,
  aiGenerateComments,
  aiSecurityScan,
  aiPerformanceAnalysis,
  aiGenerateTests,
  aiRefactoringSuggestions,
  aiBugPrediction,
  aiCodeExplainer,
  aiTechDebtAnalysis,
  aiArchitectureReview,
  aiDependencyAudit,
  aiDeploymentAdvice
};
