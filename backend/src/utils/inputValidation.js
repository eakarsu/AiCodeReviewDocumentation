// Input validation utilities for AI endpoints

const MAX_CODE_SIZE = 100 * 1024; // 100KB in bytes

export const ALLOWED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'c++',
  'csharp', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'scala', 'r', 'matlab', 'bash', 'shell', 'sql', 'html', 'css',
  'yaml', 'json', 'xml', 'dockerfile', 'terraform', 'hcl',
  'solidity', 'dart', 'lua', 'perl', 'haskell', 'elixir', 'erlang',
  'clojure', 'groovy', 'powershell', 'objc', 'vue', 'react', 'jsx', 'tsx'
];

/**
 * Validate code input for AI endpoints
 * @param {string} code
 * @param {string} language
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateCodeInput = (code, language) => {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'code is required and must be a string' };
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_SIZE) {
    return { valid: false, error: `code exceeds maximum size of ${MAX_CODE_SIZE / 1024}KB` };
  }

  if (!language || typeof language !== 'string') {
    return { valid: false, error: 'language is required and must be a string' };
  }

  const normalizedLang = language.toLowerCase().trim();
  if (!ALLOWED_LANGUAGES.includes(normalizedLang)) {
    return {
      valid: false,
      error: `language '${language}' is not supported. Allowed languages: ${ALLOWED_LANGUAGES.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Validate package.json content for dependency audit
 */
export const validatePackageJson = (content) => {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'package_json_content is required and must be a string' };
  }

  if (Buffer.byteLength(content, 'utf8') > MAX_CODE_SIZE) {
    return { valid: false, error: `package_json_content exceeds maximum size of ${MAX_CODE_SIZE / 1024}KB` };
  }

  try {
    JSON.parse(content);
  } catch {
    return { valid: false, error: 'package_json_content must be valid JSON' };
  }

  return { valid: true };
};
