#!/usr/bin/env node
/**
 * Batch Self-Healing Script
 * 
 * Run multiple tests and heal failing ones in batch mode (manual, no watcher)
 * 
 * Usage:
 *   npm run heal:batch -- --testFile tests/broken_link.spec.ts
 *   npm run heal:batch -- --testFile tests/*.spec.ts --parallel 3
 *   npm run heal:batch -- --all (heal all failing tests)
 */

import 'dotenv/config';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, extname, basename } from 'path';
import { SelfHealingOrchestrator } from './orchestrator.js';
import { AuditLogger, consoleLogger } from './reporters/audit-logger.js';
import { FailureClassifier } from './classifiers/failure-classifier.js';

const exec = promisify(spawn);
const logger = new AuditLogger();
const orchestrator = new SelfHealingOrchestrator();
const classifier = new FailureClassifier();

// ─────────────────────────────────────────────────────────────
// COMMAND LINE PARSING
// ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { parallel: 1, timeout: 30000, skipApproval: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--all') {
      args.all = true;
    } else if (argv[i] === '--skipApproval' || argv[i] === '--skipapproval') {
      args.skipApproval = true;
    } else if (argv[i].startsWith('--')) {
      const key = argv[i].substring(2);
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        // Normalize lowercase keys to camelCase (npm lowercases all arg names)
        let normalizedKey = key;
        if (key === 'testfile') normalizedKey = 'testFile';
        if (key === 'testname') normalizedKey = 'testName';
        if (key === 'skipapproval') normalizedKey = 'skipApproval';
        
        args[normalizedKey] = value;
        i++;
      }
    }
  }
  return args;
}

/**
 * Resolve test file patterns to actual test files
 */
function resolveTestFiles(pattern) {
  // Check if pattern contains wildcards
  if (pattern.includes('*')) {
    const dir = resolve(pattern.substring(0, pattern.lastIndexOf('/')));
    const glob = basename(pattern);
    const regex = new RegExp(glob.replace(/\./g, '\\.').replace(/\*/g, '.*'));
    
    if (!existsSync(dir)) {
      consoleLogger.error(`Directory not found: ${dir}`);
      return [];
    }
    
    return readdirSync(dir)
      .filter(file => regex.test(file) && file.endsWith('.spec.ts'))
      .map(file => resolve(dir, file));
  }

  // Single file
  if (existsSync(pattern)) {
    return [pattern];
  }

  consoleLogger.error(`Test file not found: ${pattern}`);
  return [];
}

/**
 * Extract test names from a test file
 */
function extractTestNames(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const testNames = [];
    
    // Match test(...) or it(...) patterns
    const regex = /test\(['"`](.+?)['"`]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      testNames.push(match[1]);
    }
    
    return testNames;
  } catch (err) {
    consoleLogger.error(`Failed to extract tests from ${filePath}: ${err.message}`);
    return [];
  }
}

/**
 * Run a test and return pass/fail status
 */
async function runTest(testFile, testName, timeout = 30000) {
  try {
    const npxPath = process.platform === 'win32' ? 'C:\\Users\\Home\\AppData\\Roaming\\npm\\npx.cmd' : 'npx';
    const args = ['playwright', 'test', testFile, '--grep', testName, '--timeout', timeout.toString()];

    consoleLogger.debug(`Spawn command: ${npxPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const child = spawn(npxPath, args, { stdio: 'pipe' });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        consoleLogger.debug(`Test process exited with code: ${code}`);
        consoleLogger.debug(`Test stdout: ${stdout.substring(0, 300)}`);
        consoleLogger.debug(`Test stderr: ${stderr.substring(0, 300)}`);

        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Test failed with exit code ${code}`));
        }
      });

      child.on('error', (err) => {
        consoleLogger.error(`Spawn error: ${err.message}`);
        reject(err);
      });
    });
  } catch (err) {
    consoleLogger.error(`Test execution failed: ${err.message}`);
    throw err;
  }
}

/**
 * Parse failure details from test error for healing
 */
function buildFailureEvent(testFile, testName, errorMsg) {
  return {
    testFile,
    testName,
    errorMessage: errorMsg,
    stackTrace: '',
    errorType: classifyErrorType(errorMsg),
    failedSelector: extractSelector(errorMsg),
    assertionCode: extractAssertion(errorMsg),
    timeoutMs: extractTimeout(errorMsg),
    testCode: readFileSync(testFile, 'utf8').substring(0, 5000),
    domSnapshot: '',
    screenshotPath: '',
  };
}

// Helper functions (same as manual-heal.js)
function classifyErrorType(errorText) {
  if (!errorText) return 'UNKNOWN';
  if (errorText.includes('Timeout') || errorText.includes('timeout')) return 'TIMEOUT';
  if (errorText.includes('selector') || errorText.includes('not found') || errorText.includes('locator')) return 'SELECTOR';
  if (errorText.includes('assertion') || errorText.includes('toBe') || errorText.includes('toEqual')) return 'ASSERTION';
  if (errorText.includes('Network') || errorText.includes('fetch') || errorText.includes('connection')) return 'NETWORK';
  if (errorText.includes('401') || errorText.includes('403') || errorText.includes('auth')) return 'AUTH';
  if (errorText.includes('CSS') || errorText.includes('style') || errorText.includes('display')) return 'LAYOUT';
  return 'UNKNOWN';
}

function extractSelector(errorText) {
  const match = errorText.match(/(locator|selector):\s*(.+?)(?:\n|$)/i);
  return match ? match[2] : '';
}

function extractAssertion(errorText) {
  const match = errorText.match(/expect\(.+?\)\..+?;/s);
  return match ? match[0] : '';
}

function extractTimeout(errorText) {
  const match = errorText.match(/(\d+)\s*ms/i);
  return match ? parseInt(match[1], 10) : 5000;
}

// ─────────────────────────────────────────────────────────────
// BATCH HEALING
// ─────────────────────────────────────────────────────────────

/**
 * Process tests in parallel batches
 */
async function runBatch(testCases, parallelCount = 1) {
  const results = {
    total: testCases.length,
    passed: [],
    failed: [],
    healed: [],
    pending: [],
    errors: [],
  };

  console.log(`\n📊 Batch Plan: ${testCases.length} test(s), parallel: ${parallelCount}\n`);

  // Process in parallel chunks
  for (let i = 0; i < testCases.length; i += parallelCount) {
    const batch = testCases.slice(i, i + parallelCount);
    const batchResults = await Promise.allSettled(
      batch.map(tc => runTest(tc.testFile, tc.testName))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        const testResult = result.value;
        if (testResult.passed) {
          results.passed.push(testResult);
          consoleLogger.info(`✅ ${testResult.testName}`);
        } else {
          results.failed.push(testResult);
          consoleLogger.warn(`❌ ${testResult.testName}`);
        }
      } else {
        consoleLogger.error(`⚠️  Error running test: ${result.reason}`);
        results.errors.push(result.reason);
      }
    }
  }

  return results;
}

/**
 * Heal a single test failure
 */
async function healTest(testFile, testName, errorMsg, skipApproval = false) {
  const failureEvent = buildFailureEvent(testFile, testName, errorMsg);
  
  try {
    const result = await orchestrator.heal(failureEvent);

    switch (result.status) {
      case 'HEALED':
        return { status: 'healed', result };
      case 'PENDING_APPROVAL':
        if (skipApproval) {
          return { status: 'approved', result };
        } else {
          return { status: 'pending', result };
        }
      default:
        return { status: 'error', result };
    }
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

/**
 * Heal failing tests from batch results
 */
async function healFailedTests(failedTests, skipApproval = false, parallelCount = 1) {
  if (failedTests.length === 0) {
    return { healed: 0, pending: 0, failed: 0 };
  }

  consoleLogger.info(`\n🤖 Healing ${failedTests.length} failed test(s)...\n`);

  const healResults = {
    healed: [],
    pending: [],
    failed: [],
  };

  // Heal in parallel batches
  for (let i = 0; i < failedTests.length; i += parallelCount) {
    const batch = failedTests.slice(i, i + parallelCount);
    const healings = await Promise.allSettled(
      batch.map(test =>
        healTest(test.testFile, test.testName, test.error, skipApproval)
      )
    );

    for (const healing of healings) {
      if (healing.status === 'fulfilled') {
        const { status } = healing.value;
        if (status === 'healed') {
          healResults.healed.push(healing.value);
          consoleLogger.info(`✨ Healed: ${healing.value.result.healingId}`);
        } else if (status === 'pending') {
          healResults.pending.push(healing.value);
          consoleLogger.warn(`⏳ Pending: ${healing.value.result.healingId}`);
        } else {
          healResults.failed.push(healing.value);
          consoleLogger.error(`❌ Failed to heal`);
        }
      }
    }
  }

  return healResults;
}

// ─────────────────────────────────────────────────────────────
// REPORT
// ─────────────────────────────────────────────────────────────

function displayBatchReport(testResults, healResults) {
  consoleLogger.info(`\n${'═'.repeat(70)}`);
  consoleLogger.info('   📊 BATCH HEALING REPORT');
  consoleLogger.info(`${'═'.repeat(70)}\n`);

  consoleLogger.info(`Total Tests Run:        ${testResults.total}`);
  consoleLogger.info(`✅ Passed:              ${testResults.passed.length}`);
  consoleLogger.info(`❌ Failed:              ${testResults.failed.length}`);

  if (healResults) {
    consoleLogger.info(`\n✨ Healed:              ${healResults.healed.length}`);
    consoleLogger.info(`⏳ Pending Approval:    ${healResults.pending.length}`);
    consoleLogger.info(`❌ Failed to Heal:      ${healResults.failed.length}`);
  }

  // Calculate success rate
  const postHealFailures = healResults
    ? testResults.failed.length - healResults.healed.length
    : testResults.failed.length;
  const successRate = ((1 - postHealFailures / testResults.total) * 100).toFixed(1);

  consoleLogger.info(`\n📈 Overall Success Rate: ${successRate}%`);

  if (healResults?.pending.length > 0) {
    consoleLogger.info(`\n💡 Approve pending healings with:`);
    consoleLogger.info(`   npm run heal:approve -- --healingId <id>`);
  }

  consoleLogger.info(`\n${'═'.repeat(70)}\n`);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  try {
    consoleLogger.info('\n╔════════════════════════════════════════════════════════════════════╗');
    consoleLogger.info('║         🔄 Batch Self-Healing E2E Tests (Manual Mode)              ║');
    consoleLogger.info('╚════════════════════════════════════════════════════════════════════╝\n');

    const args = parseArgs(process.argv);

    // Determine test files
    let testFiles = [];
    if (args.all) {
      // Run all tests in tests/ directory
      const testDir = resolve('./tests');
      if (!existsSync(testDir)) {
        consoleLogger.error(`Tests directory not found: ${testDir}`);
        process.exit(1);
      }
      testFiles = readdirSync(testDir)
        .filter(f => f.endsWith('.spec.ts'))
        .map(f => resolve(testDir, f));
    } else if (args.testFile) {
      testFiles = resolveTestFiles(args.testFile);
    } else {
      consoleLogger.error('❌ Provide --testFile or use --all');
      consoleLogger.info('\nUsage:');
      consoleLogger.info('  npm run heal:batch -- --testFile tests/broken_link.spec.ts');
      consoleLogger.info('  npm run heal:batch -- --all');
      process.exit(1);
    }

    if (testFiles.length === 0) {
      consoleLogger.error('No test files found');
      process.exit(1);
    }

    consoleLogger.info(`📋 Found ${testFiles.length} test file(s)`);

    // Extract all test cases
    const testCases = [];
    for (const file of testFiles) {
      const names = extractTestNames(file);
      for (const name of names) {
        testCases.push({ testFile: file, testName: name });
      }
    }

    consoleLogger.info(`📝 Found ${testCases.length} test case(s)\n`);

    // Run tests
    const testResults = await runBatch(testCases, parseInt(args.parallel || '1', 10));

    // Heal failed tests
    let healResults = null;
    if (testResults.failed.length > 0) {
      healResults = await healFailedTests(
        testResults.failed,
        args.skipApproval,
        parseInt(args.parallel || '1', 10)
      );
    }

    // Display report
    displayBatchReport(testResults, healResults);

    // Exit status
    if (testResults.failed.length === 0) {
      process.exit(0); // All passed
    } else if (healResults?.healed.length === testResults.failed.length) {
      process.exit(0); // All healed
    } else if (healResults?.pending.length > 0) {
      process.exit(2); // Approval needed
    } else {
      process.exit(1); // Failures remaining
    }
  } catch (err) {
    consoleLogger.error('❌ Fatal error', { error: err.message });
    process.exit(1);
  }
}

main();

// Helper function to handle common failure scenarios
function handleFailure(failure) {
  switch (failure.type) {
    case 'selector':
      consoleLogger.warn('Selector issue detected. Consider using stable data-testid attributes.');
      break;
    case 'timing':
      consoleLogger.warn('Timing issue detected. Increasing timeout and retrying.');
      break;
    case 'network':
      consoleLogger.warn('Network issue detected. Retrying with exponential backoff.');
      break;
    default:
      consoleLogger.warn('Unknown failure type. Logging details for further analysis.');
  }
}

// Example usage
failures.forEach(handleFailure);
