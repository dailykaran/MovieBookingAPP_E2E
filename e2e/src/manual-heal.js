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
            args[key] = argv[i + 1];
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
    const args = ['playwright', 'test', testFile, '--grep', testName, '--reporter=json'];
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
          const suite = result.suites[0];
          if (suite.tests && suite.tests.length > 0) {
            const test = suite.tests[0];
            if (test.status === 'failed') {
              const error = test.error || {};
              resolve({
                passed: false,
                testName: test.title,
                errorMessage: error.message || test.name || 'Test failed',
                stackTrace: error.stack || '',
              });
              return;
            }
          }
        }
      } catch (e) {
        // JSON parse failed, try to extract error from stderr
      }

      resolve({
        passed: code === 0,
        testName,
        errorMessage: stderr || stdout || 'Test execution error',
        stackTrace: stderr,
      });
    });
  });
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

  // Step 2: Prepare healing event with real failure context
  const event = {
    testFile: args.testFile,
    testName: args.testName,
    errorMessage: testResult.errorMessage,
    stackTrace: testResult.stackTrace,
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
