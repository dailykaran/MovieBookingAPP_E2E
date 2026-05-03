#!/usr/bin/env node
/**
 * Manual Self-Healing Script
 * 
 * CLI-based test runner for manual self-healing (no file watcher)
 * Runs the test first to capture real failure, then attempts healing
 * 
 * Usage:
 *   node src/manual-heal.js tests/gemini-pro-demo.spec.ts "should display movie list with cards"
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'child_process';
import { SelfHealingOrchestrator } from './orchestrator.js';
import { consoleLogger } from './reporters/audit-logger.js';
import dotenv from 'dotenv';
dotenv.config();

const orchestrator = new SelfHealingOrchestrator();

function parseArgs(argv) {
    const args = {};
    const positional = [];

    for (let i = 2; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].substring(2);
            const value = argv[i + 1];
            
            // Normalize lowercase keys to camelCase (npm lowercases all arg names)
            let normalizedKey = key;
            if (key === 'testfile') normalizedKey = 'testFile';
            if (key === 'testname') normalizedKey = 'testName';
            
            args[normalizedKey] = value;
            i++;
        } else {
            positional.push(argv[i]);
        }
    }

    if (!args.testFile && positional.length >= 1) {
        args.testFile = positional[0];
    }
    if (!args.testName && positional.length >= 2) {
        args.testName = positional.slice(1).join(' ');
    }

    return args;
}

const args = parseArgs(process.argv);

if (!args.testFile || !existsSync(resolve(args.testFile))) {
    consoleLogger.error(`Test file not found: ${args.testFile}`);
    process.exit(1);
}
if (!args.testName) {
    consoleLogger.error('Test name is required.');
    process.exit(1);
}

consoleLogger.info(`Running test: ${args.testName} in file: ${args.testFile}`);

// Step 1: Run the test to capture real failure
async function runTestForFailure(testFile, testName) {
  return new Promise((resolve) => {
    // Run ONLY the specific test file without grep to get precise JSON output
    const args = ['playwright', 'test', testFile, '--reporter=json'];
    
    consoleLogger.debug(`Running: npx ${args.join(' ')}`);
    const child = spawn('npx', args, { stdio: 'pipe', shell: true });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        if (result.suites && result.suites.length > 0) {
          // Search through suites to find matching test
          for (const suite of result.suites) {
            // Check if this is a nested suite structure
            if (suite.suites && suite.suites.length > 0) {
              // Nested structure: suite.suites[].specs[].tests[]
              for (const nestedSuite of suite.suites) {
                if (nestedSuite.specs) {
                  for (const spec of nestedSuite.specs) {
                    if (spec.title && spec.title.toLowerCase().includes(testName.toLowerCase())) {
                      if (spec.tests && spec.tests.length > 0) {
                        const testResult = spec.tests[0];
                        if (testResult.status === 'failed' && testResult.results && testResult.results.length > 0) {
                          const failedResult = testResult.results[0];
                          if (failedResult.error) {
                            resolve({
                              passed: false,
                              testName: spec.title,
                              errorMessage: failedResult.error.message || 'Test failed',
                              stackTrace: failedResult.error.stack || '',
                              file: nestedSuite.file || suite.file,
                            });
                            return;
                          }
                        } else if (testResult.status === 'passed') {
                          resolve({
                            passed: true,
                            testName: spec.title,
                            file: nestedSuite.file || suite.file,
                          });
                          return;
                        }
                      }
                    }
                  }
                }
              }
            }
            
            // Flat structure: suite.specs[].tests[]
            if (suite.specs) {
              for (const spec of suite.specs) {
                if (spec.title && spec.title.toLowerCase().includes(testName.toLowerCase())) {
                  if (spec.tests && spec.tests.length > 0) {
                    const testResult = spec.tests[0];
                    if (testResult.status === 'failed' && testResult.results && testResult.results.length > 0) {
                      const failedResult = testResult.results[0];
                      if (failedResult.error) {
                        resolve({
                          passed: false,
                          testName: spec.title,
                          errorMessage: failedResult.error.message || 'Test failed',
                          stackTrace: failedResult.error.stack || '',
                          file: suite.file,
                        });
                        return;
                      }
                    } else if (testResult.status === 'passed') {
                      resolve({
                        passed: true,
                        testName: spec.title,
                        file: suite.file,
                      });
                      return;
                    }
                  }
                }
              }
            }
            
            // Alternative structure: suite.tests[] (older Playwright versions)
            if (suite.tests) {
              for (const test of suite.tests) {
                if (test.title && test.title.toLowerCase().includes(testName.toLowerCase())) {
                  if (test.status === 'failed') {
                    const error = test.error || {};
                    resolve({
                      passed: false,
                      testName: test.title,
                      errorMessage: error.message || test.name || 'Test failed',
                      stackTrace: error.stack || '',
                      file: suite.file,
                    });
                    return;
                  } else if (test.status === 'passed') {
                    resolve({
                      passed: true,
                      testName: test.title,
                      file: suite.file,
                    });
                    return;
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // JSON parse failed, try to extract error from stdout
        consoleLogger.debug(`Failed to parse Playwright JSON output: ${e.message}`);
      }

      // If we couldn't find the test in JSON, check if test passed by exit code
      // BUT: Only trust exit code if it's 0. If it's non-zero, look for actual error in stdout
      if (code === 0) {
        resolve({
          passed: true,
          testName,
          file: testFile,
        });
        return;
      }

      // Test failed (code !== 0) - extract error from stdout, not stderr (which contains npm warnings)
      // Look for the assertion error in stdout
      const assertionMatch = stdout.match(/Expected:.*\n.*Received:.*/s);
      const errorMessage = assertionMatch ? assertionMatch[0] : (stdout.substring(0, 500) || 'Test execution failed');

      resolve({
        passed: false,
        testName,
        errorMessage: errorMessage,
        stackTrace: stdout || stderr,
      });
    });
  });
}

/**
 * Extract the specific line of code that failed
 */
function extractFailingLine(testFilePath, lineNumber) {
  try {
    const content = readFileSync(testFilePath, 'utf8');
    const lines = content.split('\n');
    const lineIdx = parseInt(lineNumber) - 1; // Convert to 0-based index
    
    if (lineIdx >= 0 && lineIdx < lines.length) {
      return lines[lineIdx].trim();
    }
  } catch (err) {
    consoleLogger.debug(`Failed to extract failing line: ${err.message}`);
  }
  return '';
}

/**
 * Extract test code from the test file
 * Finds the test function that matches testName and extracts its code
 */
function extractTestCode(testFilePath, testName) {
  try {
    const content = readFileSync(testFilePath, 'utf8');
    const lines = content.split('\n');
    
    let inTest = false;
    let testStartLine = -1;
    let bracketCount = 0;
    let testCode = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line contains the test definition
      // Look for test('...') or test("...") with the test name
      if (!inTest) {
        const testPattern = new RegExp(`test\\(\\s*['"](.+?)['"]`, 'i');
        const match = line.match(testPattern);
        if (match && match[1].toLowerCase().includes(testName.toLowerCase())) {
          inTest = true;
          testStartLine = i;
          testCode.push(line);
          bracketCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
          continue;
        }
      }
      
      if (inTest) {
        testCode.push(line);
        bracketCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        // Check if we've closed all brackets for this test
        if (bracketCount === 0 && line.trim().endsWith('}')) {
          break;
        }
      }
    }
    
    return testCode.join('\n').substring(0, 2000); // Cap at 2000 chars
  } catch (err) {
    consoleLogger.debug(`Failed to extract test code: ${err.message}`);
    return '';
  }
}

/**
 * Extract error details including line numbers, expected/actual values from error message
 */
function parseErrorDetails(errorMessage, stackTrace) {
  const lineMatch = errorMessage.match(/at .*:(\d+):(\d+)/);
  const line = lineMatch ? lineMatch[1] : 'unknown';
  
  // Extract expected and actual values from assertion messages
  let expectedValue = '';
  let actualValue = '';
  
  // Handle ANSI codes that appear INSIDE quoted strings:
  // Pattern: Expected: "\u001b[32m\"\u001b[7mVALUE\u001b[27m\"\u001b[39m
  // Extract value between quotes, handling inline ANSI codes
  const expectedRegex = /Expected:\s*(?:\\u001b\[[0-9;]*m)*"([^"]*?)(?:\\u001b\[[0-9;]*m)*"/;
  const receivedRegex = /Received:\s*(?:\\u001b\[[0-9;]*m)*"([^"]*?)(?:\\u001b\[[0-9;]*m)*"/;
  
  // Also try simple version if above fails
  const expectedMatch = errorMessage.match(expectedRegex) || 
                        errorMessage.match(/Expected:\s*"([^"]*)"/);
  const receivedMatch = errorMessage.match(receivedRegex) || 
                        errorMessage.match(/Received:\s*"([^"]*)"/);
  
  if (expectedMatch) {
    expectedValue = (expectedMatch[1] || '').replace(/\\u001b\[[0-9;]*m/g, '').trim();
  }
  if (receivedMatch) {
    actualValue = (receivedMatch[1] || '').replace(/\\u001b\[[0-9;]*m/g, '').trim();
  }
  
  // If still empty, try a more aggressive extraction
  if (!expectedValue) {
    const allLines = errorMessage.split('\n');
    for (const line of allLines) {
      if (line.includes('Expected:')) {
        const match = line.match(/Expected:\s*(?:[^"]*)?"([^"]*)?/);
        if (match) expectedValue = (match[1] || '').replace(/\\u001b\[[0-9;]*m/g, '').trim();
      }
      if (line.includes('Received:')) {
        const match = line.match(/Received:\s*(?:[^"]*)?"([^"]*)?/);
        if (match) actualValue = (match[1] || '').replace(/\\u001b\[[0-9;]*m/g, '').trim();
      }
    }
  }
  
  return {
    errorType: errorMessage.includes('toHaveURL') ? 'ASSERTION_DRIFT' :
               errorMessage.includes('toHaveTitle') ? 'ASSERTION_DRIFT' :
               errorMessage.includes('toBeVisible') ? 'SELECTOR_STALE' :
               errorMessage.includes('Timeout') ? 'TIMING_FLAKINESS' :
               errorMessage.includes('404') || errorMessage.includes('Network') ? 'NETWORK_FAULT' :
               'UNKNOWN',
    failingLine: line,
    expectedValue,
    actualValue,
  };
}

// Perform healing
(async () => {
  // Step 1: Run test to capture real failure
  consoleLogger.info('Step 1: Running test to capture real failure...');
  const testResult = await runTestForFailure(args.testFile, args.testName);

  if (testResult.passed) {
    consoleLogger.info('✓ Test passed! No healing needed.');
    process.exit(0);
  }

  consoleLogger.info(`✗ Test failed: ${testResult.errorMessage}`);

  // Extract additional context
  const testCode = extractTestCode(resolve(args.testFile), args.testName);
  const errorDetails = parseErrorDetails(testResult.errorMessage, testResult.stackTrace);
  const assertionCode = extractFailingLine(resolve(args.testFile), errorDetails.failingLine);

  // Step 2: Prepare healing event with real failure context
  const event = {
    testFile: args.testFile,
    testName: args.testName,
    errorMessage: testResult.errorMessage,
    stackTrace: testResult.stackTrace,
    testCode,
    errorType: errorDetails.errorType,
    failingLineContext: errorDetails.failingLine,
    expectedValue: errorDetails.expectedValue,
    actualValue: errorDetails.actualValue,
    assertionCode,
  };

  try {
    consoleLogger.info('Step 2: Attempting to heal the test...');
    const result = await orchestrator.heal(event);
    consoleLogger.info(`Healing result: ${JSON.stringify(result, null, 2)}`);
    process.exit(result.status === 'HEALED' || result.status === 'PENDING_APPROVAL' ? 0 : 1);
  } catch (error) {
    consoleLogger.error(`Healing failed: ${error.message}`);
    process.exit(1);
  }
})();
