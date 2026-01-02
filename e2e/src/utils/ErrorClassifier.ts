/**
 * ErrorClassifier - Categorizes Playwright test errors
 * Handles: timeout, strict_mode, assertion, not_found, unknown
 */

export type ErrorType = 'timeout' | 'strict_mode' | 'assertion' | 'not_found' | 'selector' | 'navigation' | 'network' | 'unknown';

export interface ClassifiedError {
  type: ErrorType;
  category: 'TIMING' | 'LOCATOR' | 'SELECTOR' | 'VALIDATION' | 'UNKNOWN';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestedFix: string;
  context: {
    timeout?: number;
    elementCount?: number;
    selector?: string;
    assertion?: string;
  };
}

/**
 * ErrorClassifier utility class for categorizing Playwright test errors
 */
export class ErrorClassifier {
  /**
   * Classify test error by analyzing error message and stack trace
   */
  static classify(errorMessage: string, stackTrace?: string): ClassifiedError {
    const fullText = (errorMessage + ' ' + (stackTrace || '')).toLowerCase();

    // Check for timeout errors
    if (this.isTimeoutError(fullText, errorMessage)) {
      return this.classifyTimeoutError(errorMessage);
    }

    // Check for strict mode errors
    if (this.isStrictModeError(fullText, errorMessage)) {
      return this.classifyStrictModeError(errorMessage);
    }

    // Check for assertion failures
    if (this.isAssertionError(fullText, errorMessage)) {
      return this.classifyAssertionError(errorMessage);
    }

    // Check for not found errors
    if (this.isNotFoundError(fullText, errorMessage)) {
      return this.classifyNotFoundError(errorMessage);
    }

    // Default: unknown error
    return {
      type: 'unknown',
      category: 'UNKNOWN',
      severity: 'medium',
      message: errorMessage.substring(0, 200),
      suggestedFix: 'Analyze error message and manually investigate test failure',
      context: {}
    };
  }

  /**
   * Detect timeout errors
   * Patterns:
   * - "Timeout waiting for locator"
   * - "page.goto: Timeout 30000ms exceeded"
   * - "waiting for locator(...) to be visible"
   */
  private static isTimeoutError(fullText: string, errorMessage: string): boolean {
    const timeoutPatterns = [
      /timeout\s+.*\s+(waiting|exceeded)/i,
      /page\.goto:.*timeout/i,
      /waitforselector.*timeout/i,
      /waiting for.*timeout/i,
      /timed out/i,
      /timeout\s+\d+m?s\s+exceeded/i,
      /waiting for locator.*to be visible/i,
      /expect.*timeout.*\d+m?s/i
    ];
    return timeoutPatterns.some(pattern => pattern.test(fullText));
  }

  /**
   * Detect strict mode errors
   * Patterns:
   * - "Locator resolved to 5 elements"
   * - "strict mode violation: 3 elements match"
   * - "Expected 1 element, got 5"
   */
  private static isStrictModeError(fullText: string, errorMessage: string): boolean {
    const strictPatterns = [
      /locator.*resolved\s+to\s+(\d+)\s+elements/i,
      /strict\s+mode.*violation/i,
      /expected\s+1\s+element.*got\s+\d+/i,
      /multiple\s+elements\s+match/i,
      /resolved to \d+ elements.*call .first/i,
      /locator\s+is\s+strict/i
    ];
    return strictPatterns.some(pattern => pattern.test(fullText));
  }

  /**
   * Detect assertion failures
   * Patterns:
   * - "expect(received).toBeVisible()"
   * - "Expected true, received false"
   * - "expect() assertion failed"
   */
  private static isAssertionError(fullText: string, errorMessage: string): boolean {
    const assertionPatterns = [
      /expect\s*\(.*\)\.\w+/i,
      /assertion\s+.*failed/i,
      /expected.*received/i,
      /tobe(visible|enabled|checked|disabled|focused)/i,
      /assertion error/i,
      /expect\(locator\)\.(toHave|toBe|toContain)/i
    ];
    return assertionPatterns.some(pattern => pattern.test(fullText));
  }

  /**
   * Detect not found / selector errors
   * Patterns:
   * - "no element matches selector"
   * - "Unable to find element"
   * - "querySelector could not find"
   * - "Error: element(s) not found"
   */
  private static isNotFoundError(fullText: string, errorMessage: string): boolean {
    const notFoundPatterns = [
      /no\s+element\s+matches\s+selector/i,
      /unable to find/i,
      /queryselector.*could not find/i,
      /element.*not found/i,
      /error:\s+element.*not found/i,
      /target closed/i,
      /net::err_name_not_resolved/i,
      /enotfound/i
    ];
    return notFoundPatterns.some(pattern => pattern.test(fullText));
  }

  /**
   * Classify timeout error with details
   */
  private static classifyTimeoutError(errorMessage: string): ClassifiedError {
    const timeoutMatch = errorMessage.match(/(\d+)\s*m?s/i);
    const waitingForMatch = errorMessage.match(/waiting for[:\s]+([^\n.]+)/i);

    const timeout = timeoutMatch ? parseInt(timeoutMatch[1]) : 5000;
    const waitingFor = waitingForMatch ? waitingForMatch[1].trim() : 'element';

    return {
      type: 'timeout',
      category: 'TIMING',
      severity: 'high',
      message: `Timeout after ${timeout}ms while waiting for: ${waitingFor}`,
      suggestedFix: 'Increase timeout, wait for element visibility, or check if selector is correct',
      context: {
        timeout,
        selector: waitingFor
      }
    };
  }

  /**
   * Classify strict mode error with details
   */
  private static classifyStrictModeError(errorMessage: string): ClassifiedError {
    const elementCountMatch = errorMessage.match(/(\d+)\s+elements?/i);
    const selectorMatch = errorMessage.match(/locator\s*\(\s*[`'"]([^`'"]+)[`'"]\s*\)/i);

    const elementCount = elementCountMatch ? parseInt(elementCountMatch[1]) : 2;
    const selector = selectorMatch ? selectorMatch[1] : 'unknown selector';

    return {
      type: 'strict_mode',
      category: 'LOCATOR',
      severity: 'critical',
      message: `Strict mode violation: ${elementCount} elements matched selector: ${selector}`,
      suggestedFix: 'Use .locator().first() or .locator().nth(index) to specify which element, or refine selector to match single element',
      context: {
        elementCount,
        selector
      }
    };
  }

  /**
   * Classify assertion error with details
   */
  private static classifyAssertionError(errorMessage: string): ClassifiedError {
    const expectMatch = errorMessage.match(/expect\s*\(([^)]+)\)\s*\.\s*(\w+)/);
    const receivedMatch = errorMessage.match(/received[:\s]+([^\n]+)/i);

    const expectTarget = expectMatch ? expectMatch[1] : 'value';
    const assertionMethod = expectMatch ? expectMatch[2] : 'unknown';
    const received = receivedMatch ? receivedMatch[1].trim() : 'unexpected value';

    return {
      type: 'assertion',
      category: 'VALIDATION',
      severity: 'medium',
      message: `Assertion failed: expect(${expectTarget}).${assertionMethod}() - received: ${received}`,
      suggestedFix: 'Verify the expected condition matches actual state. Add wait before assertion if element is still loading.',
      context: {
        assertion: `${assertionMethod}(${expectTarget})`
      }
    };
  }

  /**
   * Classify not found error with details
   */
  private static classifyNotFoundError(errorMessage: string): ClassifiedError {
    const selectorMatch = errorMessage.match(/(?:locator|selector)[:\s]+[`'"]?([^`'"\n]+)[`'"]?/i);
    const selector = selectorMatch ? selectorMatch[1] : 'unknown selector';

    return {
      type: 'not_found',
      category: 'SELECTOR',
      severity: 'high',
      message: `Element selector not found in DOM: ${selector}`,
      suggestedFix: 'Update selector to match current DOM structure. Use text-based selectors (getByText, getByRole) for better resilience.',
      context: {
        selector
      }
    };
  }

  /**
   * Get severity score (0-100) for AI prioritization
   */
  static getSeverityScore(errorType: ErrorType): number {
    const scores: Record<ErrorType, number> = {
      'strict_mode': 95,
      'not_found': 85,
      'timeout': 80,
      'assertion': 60,
      'selector': 85,
      'navigation': 70,
      'network': 75,
      'unknown': 40
    };
    return scores[errorType];
  }

  /**
   * Get AI prompt enhancement based on error type
   */
  static getPromptEnhancement(classified: ClassifiedError): string {
    const enhancements: Record<ErrorType, string> = {
      'strict_mode':
        'The locator matched multiple elements in strict mode. You MUST refine the selector to match exactly 1 element, or use .first()/.nth(index) to target a specific element.',
      'timeout':
        'The test timed out waiting for an element. The selector may be wrong, or the element may still be loading. Consider: increasing timeout, using waitForLoadState(), waiting for visibility.',
      'not_found':
        'The selector does not match any element in the DOM. The DOM structure may have changed. Use resilient selectors like text-based or role-based selectors.',
      'assertion':
        'An expect() assertion failed. Verify the condition is correct and the element is in the expected state. Add waits before assertions if needed.',
      'selector':
        'The CSS selector is invalid or does not match any elements. Review and update the selector to match the current DOM structure.',
      'navigation':
        'Navigation to the target URL failed. Verify the URL is correct and the page is accessible. Check for redirect loops or blocked navigation.',
      'network':
        'A network request failed. This may be a timeout, DNS issue, or connection problem. Verify the URL is reachable and network is stable.',
      'unknown':
        'Unable to classify the error type. Analyze the full error message and provide a fix that addresses the underlying issue.'
    };
    return enhancements[classified.type];
  }

  /**
   * Build AI context string for test healing
   */
  static buildAIContext(classified: ClassifiedError): string {
    return `
## Error Classification
- **Type**: ${classified.type}
- **Category**: ${classified.category}
- **Severity**: ${classified.severity} (${this.getSeverityScore(classified.type)}/100)
- **Message**: ${classified.message}

## Analysis Details
${Object.entries(classified.context)
  .filter(([_, v]) => v !== undefined)
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join('\n')}

## Suggested Fix Approach
${classified.suggestedFix}

## AI Enhancement Hint
${this.getPromptEnhancement(classified)}
    `.trim();
  }
}
