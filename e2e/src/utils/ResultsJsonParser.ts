/**
 * ResultsJsonParser - Parses Playwright test results from results.json
 * Extracts error information and classifies them for healing
 */

import fs from 'fs';
import path from 'path';
import { ErrorClassifier, ClassifiedError, ErrorType } from './ErrorClassifier.js';

export interface PlaywrightTestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface ParsedTestFailure {
  testName: string;
  testFile: string;
  errorMessage: string;
  errorStack?: string;
  classified: ClassifiedError;
  timestamp: Date;
}

/**
 * Parse and analyze Playwright test results from results.json
 */
export class ResultsJsonParser {
  /**
   * Read and parse results.json file
   */
  static parseResultsJson(resultsPath: string): PlaywrightTestResult[] {
    try {
      if (!fs.existsSync(resultsPath)) {
        console.warn(`Results file not found: ${resultsPath}`);
        return [];
      }

      const content = fs.readFileSync(resultsPath, 'utf-8');
      const data = JSON.parse(content);

      // Handle different result formats
      if (Array.isArray(data)) {
        return data;
      }

      if (data.suites && Array.isArray(data.suites)) {
        return this.flattenSuites(data.suites);
      }

      if (data.tests && Array.isArray(data.tests)) {
        return data.tests;
      }

      return [];
    } catch (error) {
      console.error(`Error parsing results.json: ${error}`);
      return [];
    }
  }

  /**
   * Flatten nested Playwright test suites
   * Handles both old format (tests array) and new format (specs array with nested tests)
   */
  private static flattenSuites(suites: any[]): PlaywrightTestResult[] {
    const results: PlaywrightTestResult[] = [];

    const flatten = (suite: any) => {
      // Old format: direct tests array
      if (suite.tests) {
        results.push(...suite.tests);
      }
      
      // New format: specs array with nested tests
      if (suite.specs && Array.isArray(suite.specs)) {
        suite.specs.forEach((spec: any) => {
          if (spec.tests && Array.isArray(spec.tests)) {
            spec.tests.forEach((test: any) => {
              // Extract result from test.results array
              if (test.results && Array.isArray(test.results) && test.results.length > 0) {
                const result = test.results[0];
                results.push({
                  name: spec.title,
                  status: result.status || (spec.ok ? 'passed' : 'failed'),
                  duration: result.duration || 0,
                  error: result.error
                });
              }
            });
          }
        });
      }
      
      // Nested suites
      if (suite.suites) {
        suite.suites.forEach(flatten);
      }
    };

    suites.forEach(flatten);
    return results;
  }

  /**
   * Extract all failed tests from results
   */
  static getFailedTests(results: PlaywrightTestResult[]): PlaywrightTestResult[] {
    return results.filter(test => test.status === 'failed' || test.status === 'timedOut');
  }

  /**
   * Analyze and classify all test failures
   */
  static analyzeFailures(
    failedTests: PlaywrightTestResult[],
    testFile?: string
  ): ParsedTestFailure[] {
    return failedTests.map(test => {
      const errorMessage = test.error?.message || 'Unknown error';
      const errorStack = test.error?.stack;

      return {
        testName: test.name,
        testFile: testFile || 'unknown',
        errorMessage,
        errorStack,
        classified: ErrorClassifier.classify(errorMessage, errorStack),
        timestamp: new Date()
      };
    });
  }

  /**
   * Generate summary statistics of test failures
   */
  static generateSummary(failures: ParsedTestFailure[]): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    criticalCount: number;
  } {
    return {
      total: failures.length,
      byType: {
        timeout: failures.filter(f => f.classified.type === 'timeout').length,
        strict_mode: failures.filter(f => f.classified.type === 'strict_mode').length,
        assertion: failures.filter(f => f.classified.type === 'assertion').length,
        not_found: failures.filter(f => f.classified.type === 'not_found').length,
        selector: failures.filter(f => f.classified.type === 'selector').length,
        navigation: failures.filter(f => f.classified.type === 'navigation').length,
        network: failures.filter(f => f.classified.type === 'network').length,
        unknown: failures.filter(f => f.classified.type === 'unknown').length
      },
      bySeverity: {
        critical: failures.filter(f => f.classified.severity === 'critical').length,
        high: failures.filter(f => f.classified.severity === 'high').length,
        medium: failures.filter(f => f.classified.severity === 'medium').length,
        low: failures.filter(f => f.classified.severity === 'low').length
      },
      criticalCount: failures.filter(f => f.classified.severity === 'critical').length
    };
  }

  /**
   * Find results.json file in test results directory
   */
  static findResultsJson(baseDir: string = process.cwd()): string | null {
    const commonPaths = [
      path.join(baseDir, 'test-results', 'results.json'),
      path.join(baseDir, 'results.json'),
      path.join(baseDir, 'playwright-report', 'results.json'),
      path.join(baseDir, '.playwright', 'results.json')
    ];

    for (const filePath of commonPaths) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    // Search recursively
    const searchDir = (dir: string, depth = 0): string | null => {
      if (depth > 3) return null;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name === 'results.json' && entry.isFile()) {
            return path.join(dir, entry.name);
          }

          if (
            entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules'
          ) {
            const found = searchDir(path.join(dir, entry.name), depth + 1);
            if (found) return found;
          }
        }
      } catch (error) {
        // Ignore permission errors
      }

      return null;
    };

    return searchDir(baseDir);
  }

  /**
   * Generate detailed error report from results.json
   */
  static generateDetailedReport(failures: ParsedTestFailure[]): string {
    const summary = this.generateSummary(failures);

    let report = `
═══════════════════════════════════════════════════════════════
                    TEST FAILURE ANALYSIS REPORT
═══════════════════════════════════════════════════════════════

SUMMARY STATISTICS
──────────────────────────────────────────────────────────────
Total Failed Tests: ${summary.total}
  • timeout:     ${summary.byType.timeout}
  • strict_mode: ${summary.byType.strict_mode}
  • assertion:   ${summary.byType.assertion}
  • not_found:   ${summary.byType.not_found}
  • unknown:     ${summary.byType.unknown}

Severity Distribution:
  • CRITICAL: ${summary.bySeverity.critical}
  • HIGH:     ${summary.bySeverity.high}
  • MEDIUM:   ${summary.bySeverity.medium}
  • LOW:      ${summary.bySeverity.low}

═══════════════════════════════════════════════════════════════
                         DETAILED FAILURES
═══════════════════════════════════════════════════════════════
`;

    failures.forEach((failure, index) => {
      report += `
[${index + 1}] ${failure.testName}
──────────────────────────────────────────────────────────────
Test File: ${failure.testFile}
Error Type: ${failure.classified.type} [${failure.classified.severity.toUpperCase()}]
Category: ${failure.classified.category}
Severity Score: ${ErrorClassifier.getSeverityScore(failure.classified.type)}/100

Error Message:
${failure.errorMessage}

${failure.errorStack ? `Stack Trace:\n${failure.errorStack}\n` : ''}

Analysis:
${failure.classified.message}

Suggested Fix:
${failure.classified.suggestedFix}

`;
    });

    report += `
═══════════════════════════════════════════════════════════════
`;

    return report;
  }

  /**
   * Export failures as JSON for further processing
   */
  static exportAsJson(failures: ParsedTestFailure[]): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalFailures: failures.length,
        summary: this.generateSummary(failures),
        failures: failures.map(f => ({
          testName: f.testName,
          testFile: f.testFile,
          errorType: f.classified.type,
          severity: f.classified.severity,
          message: f.classified.message,
          suggestedFix: f.classified.suggestedFix,
          context: f.classified.context
        }))
      },
      null,
      2
    );
  }
}
