// src/orchestrator.js
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import pRetry from 'p-retry';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { GeminiHealingClient } from './gemini-client.js';
import { buildPrompt } from './prompt-builder.js';
import { FailureClassifier } from './classifiers/failure-classifier.js';
import { SecurityValidator } from './security/validator.js';
import { PatchApplicator } from './patch-applicator.js';
import { AuditLogger } from './reporters/audit-logger.js';
import { consoleLogger } from './reporters/audit-logger.js';

const SYSTEM_PROMPT = readFileSync('./prompts/system-prompt.md', 'utf8');
const CONFIDENCE_THRESHOLD = parseFloat(process.env.HEAL_CONFIDENCE_THRESHOLD || '0.82');

/**
 * Load permissions config to check if approval gate is disabled
 */
function loadPermissionsConfig() {
  try {
    const permPath = join(process.cwd(), '.healer-permissions.json');
    if (existsSync(permPath)) {
      const config = JSON.parse(readFileSync(permPath, 'utf8'));
      return config?.approvalGate?.enabled !== true; // Default to requiring approval if not found
    }
  } catch (err) {
    // Silently fall back to default (require approval)
  }
  return false; // Require approval by default
}

/**
 * Main self-healing orchestrator — coordinates all healing stages
 */
export class SelfHealingOrchestrator {
  #client;
  #classifier;
  #validator;
  #patcher;
  #logger;

  constructor() {
    try {
      this.#client = new GeminiHealingClient();
    } catch (err) {
      consoleLogger.error(`Failed to initialize Gemini client: ${err.message}`);
      throw new Error('Self-healing initialization failed. Check environment variables and credentials.');
    }
    this.#classifier = new FailureClassifier();
    this.#validator = new SecurityValidator();
    this.#patcher = new PatchApplicator();
    this.#logger = new AuditLogger();
  }

  /**
   * Main entry point: receive a test failure event and attempt self-healing.
   * @param {TestFailureEvent} event
   * @param {HealingTraceLogger} traceLogger - Optional trace logger for detailed logging
   * @returns {Promise<HealingResult>}
   */
  async heal(event, traceLogger = null) {
    const healingId = randomUUID().substring(0, 12);
    this.#logger.start(healingId, event);

    let aiResponse = null; // Initialize aiResponse to prevent undefined reference
    let patchResult = null;
    let rerunResult = null;

    try {
      // ── Stage 1: Validate required fields ────────────────────────────
      if (!event.testFile || typeof event.testFile !== 'string') {
        return {
          healingId,
          status: 'INVALID_INPUT',
          reason: 'Missing or invalid testFile in event',
        };
      }
      if (!event.testName || typeof event.testName !== 'string') {
        return {
          healingId,
          status: 'INVALID_INPUT',
          reason: 'Missing or invalid testName in event',
        };
      }
      if (traceLogger) traceLogger.logStage(1, { testFile: event.testFile, testName: event.testName });

      // ── Stage 2: Classify failure ─────────────────────────────────────
      const failureClass = this.#classifier.classify(event);
      if (traceLogger) traceLogger.logStage(2, { failureClass, healingId });
      this.#logger.stage('CLASSIFY', { failureClass, healingId });

      // ── Stage 3: Security — validate inbound event ────────────────────
      const inputCheck = this.#validator.validateInput(event);
      if (!inputCheck.safe) {
        this.#logger.blocked(healingId, inputCheck.reason);
        return {
          healingId,
          status: 'BLOCKED',
          reason: inputCheck.reason,
        };
      }
      if (traceLogger) traceLogger.logStage(3, { safe: inputCheck.safe });

      // ── Stage 3: Build prompt ─────────────────────────────────────────
      const templateMap = {
        SELECTOR_STALE: 'selector-heal',
        TIMING_FLAKINESS: 'timing-heal',
        ASSERTION_DRIFT: 'assertion-heal',
        NETWORK_FAULT: 'network-heal',
        AUTH_DRIFT: 'auth-heal',
        ENV_MISMATCH: 'env-heal',
        LAYOUT_SHIFT: 'layout-heal',
      };
      const templateName = templateMap[failureClass] ?? 'selector-heal';

      const userPrompt = buildPrompt(templateName, {
        TEST_FILE: event.testFile || '',
        TEST_NAME: event.testName || '',
        FAILED_TEST_CODE: event.testCode || '',
        ERROR_MESSAGE: event.errorMessage || '',
        FAILING_LINE_CONTEXT: event.failingLineContext || '',
        DOM_SNAPSHOT: event.domSnapshot || '',
        FAILED_SELECTOR: event.failedSelector || '',
        ERROR_TYPE: event.errorType || '',
        TIMEOUT_MS: event.timeoutMs || 5000,
        NETWORK_LOG: JSON.stringify(event.networkLog || [], null, 2),
        FAILED_ASSERTION_CODE: event.assertionCode || '',
        EXPECTED_VALUE: event.expectedValue || '',
        ACTUAL_VALUE: event.actualValue || '',
        CHANGELOG_CONTEXT: event.changelogContext || 'Not available',
      });
      if (traceLogger) traceLogger.logStage(4, { promptLength: userPrompt.length });

      console.log('Gemini Prompt:', userPrompt);

      // ── Stage 4: Gemini AI analysis (with retry) ──────────────────────
      try {
        aiResponse = await pRetry(
          () =>
            this.#client.requestHealing(SYSTEM_PROMPT, userPrompt, event.screenshotPath),
          {
            retries: parseInt(process.env.HEAL_MAX_RETRIES || '3', 10),
            minTimeout: parseInt(process.env.HEAL_RETRY_DELAY_MS || '2000', 10),
          }
        );
        console.log('Gemini AI Response:', aiResponse);
      } catch (err) {
        this.#logger.error('Gemini request failed after retries', { error: err.message });
        return {
          healingId,
          status: 'AI_ERROR',
          reason: `Gemini API error: ${err.message}`,
        };
      }

      this.#logger.stage('AI_RESPONSE', {
        confidence: aiResponse.confidence,
        healingId,
      });
      if (traceLogger) traceLogger.logStage(5, { confidence: aiResponse.confidence, healingId });

      // ── Stage 6: Validate AI output ───────────────────────────────────
      const outputCheck = this.#validator.validateOutput(aiResponse);
      if (!outputCheck.safe) {
        this.#logger.blocked(healingId, outputCheck.reason);
        return {
          healingId,
          status: 'BLOCKED',
          reason: outputCheck.reason,
        };
      }
      if (traceLogger) traceLogger.logStage(6, { safe: outputCheck.safe });

      // ── Stage 6: Approval gate (check permissions config) ────────────
      const autoApprovalEnabled = loadPermissionsConfig();
      const needsApproval =
        aiResponse.confidence < CONFIDENCE_THRESHOLD ||
        aiResponse.requiresApproval ||
        failureClass === 'ASSERTION_DRIFT';

      if (needsApproval && !autoApprovalEnabled) {
        // Approval required - not auto-approved
        this.#logger.pendingApproval(healingId, aiResponse);
        return {
          healingId,
          status: 'PENDING_APPROVAL',
          proposal: aiResponse,
          confidence: aiResponse.confidence,
          failureClass,
        };
      }

      // Auto-approval enabled OR low confidence is acceptable with auto-approval
      if (needsApproval && autoApprovalEnabled) {
        this.#logger.stage('AUTO_APPROVED', {
          reason: '.healer-permissions.json has approvalGate.enabled=false',
          confidence: aiResponse.confidence,
        });
        if (traceLogger) traceLogger.logStage(7, { reason: 'Auto-approved', confidence: aiResponse.confidence });
      }

      // ── Stage 7: Apply patches (sandboxed) ───────────────────────────
      const patchResult = await this.#patcher.apply(aiResponse.patches);
      this.#logger.stage('PATCH_APPLIED', {
        successful: patchResult.successful,
        failed: patchResult.failed,
      });
      if (traceLogger) traceLogger.logStage(8, { successful: patchResult.successful, failed: patchResult.failed });

      // ── Stage 8: Re-run test ──────────────────────────────────────────
      const rerunResult = await this.#runHealedTest(event.testFile, event.testName);
      this.#logger.complete(healingId, rerunResult);

      return {
        healingId,
        status: rerunResult.passed ? 'HEALED' : 'FAILED_AFTER_HEAL',
        aiResponse,
        patchResult,
        rerunResult,
      };
    } catch (err) {
      this.#logger.error('Orchestrator fatal error', {
        error: err.message,
        stack: err.stack.substring(0, 500),
        inputs: { aiResponse, patchResult, rerunResult }, // Log inputs for debugging
      });
      if (err instanceof TypeError) {
        this.#logger.error('TypeError occurred in orchestrator', { details: err.message });
      } else if (err instanceof ReferenceError) {
        this.#logger.error('ReferenceError occurred in orchestrator', { details: err.message });
      }
      return {
        healingId,
        status: 'ERROR',
        reason: `Fatal error: ${err.message}`,
      };
    }
  }

  /**
   * Re-run healed test to validate the fix
   */
  async #runHealedTest(testFile, testName) {
    try {
      const framework = process.env.TEST_FRAMEWORK || 'playwright';

      if (framework === 'playwright') {
        consoleLogger.debug(`Running retest for: ${testFile}`);

        const args = ['playwright', 'test', testFile, '--grep', testName, '--reporter=line'];

        consoleLogger.debug(`Spawn command: npx ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
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
            consoleLogger.debug(`Retest process exited with code: ${code}`);
            consoleLogger.debug(`Retest stdout: ${stdout.substring(0, 300)}`);

            const passed = code === 0 && 
                          (stdout.includes('1 passed') || 
                           (stdout.includes('passed') && !stdout.includes('failed')));
            
            resolve({
              passed,
              stdout,
              stderr,
              exitCode: code,
            });
          });

          child.on('error', (err) => {
            consoleLogger.error(`Retest spawn error: ${err.message}`);
            reject(err);
          });
        });
      } else {
        throw new Error(`Unknown test framework: ${framework}`);
      }
    } catch (err) {
      consoleLogger.error(`Retest execution failed: ${err.message}`);
      return {
        passed: false,
        error: err.message,
      };
    }
  }
}
