/**
 * SecurityValidator Utility Class
 * Provides input sanitization and validation for LLM security
 */

export class SecurityValidator {
  private static readonly INJECTION_PATTERNS = [
    /ignore[\s\n]*previous[\s\n]*instructions/gi,
    /system[\s\n]*prompt/gi,
    /forget[\s\n]*about/gi,
    /act[\s\n]*as/gi,
    /pretend[\s\n]*to[\s\n]*be/gi,
    /instead[\s\n]*of/gi,
    /as[\s\n]*an[\s\n]*evil/gi,
    /bypass[\s\n]*security/gi,
    /disable[\s\n]*safety/gi,
    /without[\s\n]*restrictions/gi,
    /do[\s\n]*not[\s\n]*follow/gi
  ];

  private static readonly DANGEROUS_CODE_PATTERNS = [
    /fs\.(rm|unlink|rmdir)/,
    /execSync|execFile|spawn/,
    /require\(|import\(/,
    /eval\(/,
    /new Function/,
    /process\.exit/
  ];

  /**
   * Sanitize input for LLM prompts (prevent injection/leakage)
   */
  static sanitizeForPrompt(input: string, maxLength: number = 5000): string {
    if (!input) return '';

    let sanitized = input.substring(0, maxLength);

    // Escape backticks to prevent code block escape
    sanitized = sanitized.replace(/```/g, '\\`\\`\\`');

    // Escape quotes to prevent prompt escape
    sanitized = sanitized.replace(/"/g, '\\"');
    sanitized = sanitized.replace(/'/g, "\\'");

    // Remove potentially sensitive paths
    sanitized = sanitized.replace(/[A-Za-z]:\\[^\s]*/g, '[LOCAL_PATH]');
    sanitized = sanitized.replace(/\/home\/[^\/\s]*/g, '[HOME_PATH]');
    sanitized = sanitized.replace(/\/Users\/[^\/\s]*/g, '[USER_PATH]');

    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

    // Remove IP addresses
    sanitized = sanitized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_ADDRESS]');

    // Remove URLs (except localhost)
    sanitized = sanitized.replace(/https?:\/\/(?!localhost)[^\s]+/gi, '[URL]');

    // Add truncation warning if needed
    if (input.length > maxLength) {
      sanitized += `\n[... ${input.length - maxLength} characters truncated for token limit]`;
    }

    return sanitized;
  }

  /**
   * Sanitize error messages to remove sensitive data
   */
  static sanitizeErrorMessage(error: string, maxLength: number = 1000): string {
    if (!error) return 'Unknown error';

    let sanitized = error.substring(0, maxLength);

    // Remove local file paths
    sanitized = sanitized.replace(/[A-Za-z]:\\[^\s]*/g, '[FILE_PATH]');
    sanitized = sanitized.replace(/\/home\/[^\/\s]*/g, '[FILE_PATH]');
    sanitized = sanitized.replace(/\/Users\/[^\/\s]*/g, '[FILE_PATH]');
    sanitized = sanitized.replace(/\/tmp\/[^\/\s]*/g, '[TEMP_PATH]');

    // Remove usernames and paths
    sanitized = sanitized.replace(/\/root\//g, '[ROOT]/');
    sanitized = sanitized.replace(/~\//g, '[HOME]/');

    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

    // Remove API keys/tokens (long alphanumeric strings)
    sanitized = sanitized.replace(/\b[a-zA-Z0-9_]{40,}\b/g, '[SECRET]');

    // Remove IP addresses
    sanitized = sanitized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]');

    // Remove port numbers
    sanitized = sanitized.replace(/localhost:\d{4,5}/g, 'localhost:[PORT]');

    return sanitized;
  }

  /**
   * Detect prompt injection attempts in user input
   */
  static detectPromptInjection(input: string): boolean {
    if (!input) return false;
    return this.INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Validate test code size to prevent token overflow
   */
  static validateTestCodeSize(
    code: string,
    maxLength: number = 50000
  ): { valid: boolean; error: string | null; truncated?: string } {
    if (!code) {
      return { valid: false, error: 'Test code is empty' };
    }

    if (code.length > maxLength) {
      return {
        valid: false,
        error: `Test code exceeds maximum length (${code.length} > ${maxLength} chars)`,
        truncated: code.substring(0, maxLength)
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Validate generated code for dangerous patterns
   */
  static validateGeneratedCode(code: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    for (const pattern of this.DANGEROUS_CODE_PATTERNS) {
      if (pattern.test(code)) {
        issues.push(pattern.source);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
