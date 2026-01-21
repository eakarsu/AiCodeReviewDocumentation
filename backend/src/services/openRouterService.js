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
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices[0]?.message?.content || '',
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

export default {
  callOpenRouter,
  aiCodeReview,
  aiGenerateDocumentation,
  aiCodeAnalysis,
  aiGenerateApiDocs,
  aiGenerateReadme,
  aiGenerateComments,
  aiSecurityScan,
  aiPerformanceAnalysis,
  aiGenerateTests,
  aiRefactoringSuggestions
};
