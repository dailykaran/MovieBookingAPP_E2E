// src/watcher.js
import 'dotenv/config';
import { watch } from 'fs';
import { resolve } from 'path';
import { SelfHealingOrchestrator } from './orchestrator.js';
import { AuditLogger, consoleLogger } from './reporters/audit-logger.js';

const logger = new AuditLogger();
const orchestrator = new SelfHealingOrchestrator();

/**
 * File watcher mode — monitors test files and results for automatic healing
 * Useful for development and local testing
 */
async function setupWatcher() {
  consoleLogger.info('Starting Self-Healing Watcher...\n');

  const testDir = resolve('./tests');
  const testResultsDir = resolve('./test-results');

  consoleLogger.info(`Watching: ${testDir}`);
  consoleLogger.info(`Test results: ${testResultsDir}\n`);

  // Watch test results for failures
  watch(testResultsDir, async (eventType, filename) => {
    if (!filename || !filename.endsWith('.json')) return;

    consoleLogger.info(`📋 Test result detected: ${filename}`);

    try {
      // Parse test result
      const resultPath = resolve(testResultsDir, filename);
      const { readFileSync } = await import('fs');
      const result = JSON.parse(readFileSync(resultPath, 'utf8'));

      if (!result.suites || result.suites.length === 0) return;

      // Find failed tests
      for (const suite of result.suites) {
        for (const test of suite.tests || []) {
          if (test.status === 'fail') {
            consoleLogger.warn(`❌ Failed: ${suite.title} → ${test.title}`);

            // Attempt healing
            const healEvent = {
              testFile: suite.file,
              testName: test.title,
              errorMessage: test.error?.message || 'Test failed',
              stackTrace: test.error?.stack || '',
              testCode: '',
              domSnapshot: '',
            };

            const result = await orchestrator.heal(healEvent);
            if (result.status === 'HEALED') {
              consoleLogger.info(`✅ Healed: ${test.title}`);
            } else if (result.status === 'PENDING_APPROVAL') {
              consoleLogger.warn(`⏳ Pending approval: ${test.title}`);
              consoleLogger.info(`   Confidence: ${result.confidence}`);
            } else {
              consoleLogger.error(`❌ Healing failed: ${result.reason}`);
            }
          }
        }
      }
    } catch (err) {
      consoleLogger.error('Watcher error', { error: err.message });
    }
  });

  consoleLogger.info('✅ Watcher ready. Run tests with: npm test');
  consoleLogger.info('💡 Failed tests will be auto-analyzed for healing...\n');
}

setupWatcher().catch(err => {
  consoleLogger.error('Watcher setup failed', { error: err.message });
  process.exit(1);
});
