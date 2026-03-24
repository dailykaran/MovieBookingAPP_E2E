// src/reporters/audit-logger.js
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { createLogger, transports, format } from 'winston';

const AUDIT_FILE = process.env.TEST_AUDIT_LOG || './artifacts/heal-audit.jsonl';

// Ensure artifact directories exist
const artifactDir = dirname(AUDIT_FILE);
if (!existsSync(artifactDir)) {
  mkdirSync(artifactDir, { recursive: true });
}

/**
 * Winston console logger
 */
export const consoleLogger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.colorize(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `[${timestamp}] ${level}: ${message} ${metaStr}`;
    })
  ),
  transports: [new transports.Console()],
});

/**
 * Immutable audit trail logger — append-only JSONL
 */
export class AuditLogger {
  #write(entry) {
    try {
      appendFileSync(
        AUDIT_FILE,
        JSON.stringify({
          ...entry,
          ts: new Date().toISOString(),
        }) + '\n'
      );
    } catch (err) {
      consoleLogger.error('Failed to write audit log', { error: err.message });
    }
  }

  info(message, meta = {}) {
    consoleLogger.info(message, meta);
  }

  warn(message, meta = {}) {
    consoleLogger.warn(message, meta);
    this.#write({ level: 'WARN', message, ...meta });
  }

  error(message, meta = {}) {
    consoleLogger.error(message, meta);
    this.#write({ level: 'ERROR', message, ...meta });
  }

  start(id, event) {
    this.#write({
      id,
      event: 'HEAL_START',
      testFile: event.testFile,
      testName: event.testName,
    });
  }

  stage(name, meta) {
    this.#write({ event: 'STAGE', stage: name, ...meta });
  }

  blocked(id, reason) {
    this.#write({ id, event: 'BLOCKED', reason });
  }

  pendingApproval(id, proposal) {
    this.#write({
      id,
      event: 'PENDING_APPROVAL',
      confidence: proposal.confidence,
      failureClass: proposal.failureClass,
      explanation: proposal.explanation || '',
      patches: (proposal.patches || []).slice(0, 10), // Limit to first 10 for audit
      requiresApproval: proposal.requiresApproval,
      retryStrategy: proposal.retryStrategy,
      // Store full response for debugging if needed
      fullResponse: JSON.stringify(proposal).substring(0, 2000),
    });
  }

  complete(id, result) {
    this.#write({
      id,
      event: 'COMPLETE',
      passed: result.passed,
      status: result.status,
    });
  }
}
