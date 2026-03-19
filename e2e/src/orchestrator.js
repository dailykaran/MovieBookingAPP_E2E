// src/orchestrator.js
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import pRetry from 'p-retry';
import { readFileSync } from 'fs';
import { GeminiHealingClient } from './gemini-client.js';
import { buildPrompt } from './prompt-builder.js';
import { FailureClassifier } from './classifiers/failure-classifier.js';
import { SecurityValidator } from './security/validator.js';
import { PatchApplicator } from './patch-applicator.js';
import { AuditLogger } from './reporters/audit-logger.js';

const SYSTEM_PROMPT = readFileSync('./prompts/system-prompt.md', 'utf8');
const CONFIDENCE_THRESHOLD = parseFloat(process.env.HEAL_CONFIDENCE_THRESHOLD || '0.82');
const exec = promisify(execFile);

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
    this.#client = new GeminiHealingClient();
    this.#classifier = new FailureClassifier();
    this.#validator = new SecurityValidator();
    this.#patcher = new PatchApplicator();
    this.#logger = new AuditLogger();
  }

  /**
   * Main entry point: receive a test failure event and attempt self-healing.
   * @param {TestFailureEvent} event
   * @returns {Promise<HealingResult>}
   */
  async heal(event) {
    const healingId = randomUUID().substring(0, 12);
    this.#logger.start(healingId, event);

    try {
      // ── Stage 1: Classify failure ─────────────────────────────────────
      const failureClass = this.#classifier.classify(event);
      this.#logger.stage('CLASSIFY', { failureClass, healingId });

      // ── Stage 2: Security — validate inbound event ────────────────────
      const inputCheck = this.#validator.validateInput(event);
      if (!inputCheck.safe) {
        this.#logger.blocked(healingId, inputCheck.reason);
        return {
          healingId,
          status: 'BLOCKED',
          reason: inputCheck.reason,
        };
      }

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
        FAILED_TEST_CODE: event.testCode || '',
        ERROR_MESSAGE: event.errorMessage || '',
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

      // ── Stage 4: Gemini AI analysis (with retry) ──────────────────────
      let aiResponse;
      try {
        aiResponse = await pRetry(
          () =>
            this.#client.requestHealing(SYSTEM_PROMPT, userPrompt, event.screenshotPath),
          {
            retries: parseInt(process.env.HEAL_MAX_RETRIES || '3', 10),
            minTimeout: parseInt(process.env.HEAL_RETRY_DELAY_MS || '2000', 10),
          }
        );
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

      // ── Stage 5: Validate AI output ───────────────────────────────────
      const outputCheck = this.#validator.validateOutput(aiResponse);
      if (!outputCheck.safe) {
        this.#logger.blocked(healingId, outputCheck.reason);
        return {
          healingId,
          status: 'BLOCKED',
          reason: outputCheck.reason,
        };
      }

      // ── Stage 6: Confidence gate ──────────────────────────────────────
      if (
        aiResponse.confidence < CONFIDENCE_THRESHOLD ||
        aiResponse.requiresApproval ||
        failureClass === 'ASSERTION_DRIFT'
      ) {
        this.#logger.pendingApproval(healingId, aiResponse);
        return {
          healingId,
          status: 'PENDING_APPROVAL',
          proposal: aiResponse,
          confidence: aiResponse.confidence,
          failureClass,
        };
      }

      // ── Stage 7: Apply patches (sandboxed) ───────────────────────────
      const patchResult = await this.#patcher.apply(aiResponse.patches);
      this.#logger.stage('PATCH_APPLIED', {
        successful: patchResult.successful,
        failed: patchResult.failed,
      });

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
      });
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
        const { stdout, stderr } = await exec('npx', [
          'playwright',
          'test',
          testFile,
          '--grep',
          testName,
          '--reporter=json',
        ]);

        try {
          const report = JSON.parse(stdout);
          return {
            passed: report.stats?.failures === 0,
            report,
          };
        } catch {
          return {
            passed: /pass|success/i.test(stdout),
            stdout,
            stderr,
          };
        }
      } else if (framework === 'cypress') {
        const { stdout } = await exec('npx', [
          'cypress',
          'run',
          '--spec',
          testFile,
          '--grep',
          testName,
        ]);
        return { passed: stdout.includes('passing'), stdout };
      }

      return { passed: false, error: `Unknown test framework: ${framework}` };
    } catch (err) {
      return {
        passed: false,
        error: err.message,
      };
    }
  }
}
