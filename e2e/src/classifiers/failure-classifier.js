// src/classifiers/failure-classifier.js

const CLASSIFICATION_RULES = [
  {
    class: 'SELECTOR_STALE',
    patterns: [
      /locator\(\s*['"](.+)['"]\s*\).*strict mode/i,
      /unable to find element/i,
      /no element found for selector/i,
      /element\(s\) not found/i,  // Added this pattern
      /element not found/i,
      /getByRole.*not found/i,
      /locator\.evaluate/i,
      /failed to find element/i,
      /waiting for locator.*first\(\)/i,  // Added for first() selectors
    ],
  },
  {
    class: 'TIMING_FLAKINESS',
    patterns: [
      /timeout.*exceeded/i,
      /waiting for.*to be visible/i,
      /net::ERR_.*timeout/i,
      /navigation timeout/i,
      /page load timeout/i,
      /waitfor.*timeout/i,
    ],
  },
  {
    class: 'ASSERTION_DRIFT',
    patterns: [
      /expect\(page\)\.toHaveURL/i,  // URL assertions
      /Expected:.*Received:/is,  // "Expected: X" followed by "Received: Y" (multiline)
      /Expected:.+?Received:/is,  // More flexible multiline match
      /expect.*received/i,
      /toEqual.*failed/i,
      /toHaveText.*failed/i,
      /assertion failed/i,
      /toBe.*failed/i,
      /toContain.*failed/i,
      /tohaveurl/i,
      /expected.*received/i,
    ],
  },
  {
    class: 'NETWORK_FAULT',
    patterns: [
      /net::ERR_CONNECTION_REFUSED/i,
      /fetch failed/i,
      /network request failed/i,
      /502|503|504/,
      /connection refused/i,
      /econnrefused/i,
    ],
  },
  {
    class: 'AUTH_DRIFT',
    patterns: [
      /401 unauthorized/i,
      /403 forbidden/i,
      /session.*expired/i,
      /token.*invalid/i,
      /authentication required/i,
    ],
  },
  {
    class: 'ENV_MISMATCH',
    patterns: [
      /baseURL.*not set/i,
      /env.*undefined/i,
      /cannot read.*undefined.*env/i,
      /process\.env/i,
    ],
  },
];

/**
 * Classify failing test into predefined failure categories
 */
export class FailureClassifier {
  classify(event) {
    // If we have extracted expected and actual values, it's likely ASSERTION_DRIFT
    if (event.expectedValue && event.actualValue) {
      return 'ASSERTION_DRIFT';
    }
    
    const text = `${event.errorMessage ?? ''} ${event.stackTrace ?? ''} ${event.assertionCode ?? ''}`.toLowerCase();

    for (const rule of CLASSIFICATION_RULES) {
      if (rule.patterns.some(p => p.test(text))) {
        return rule.class;
      }
    }

    // Default to selector stale if no match
    return 'SELECTOR_STALE';
  }
}
