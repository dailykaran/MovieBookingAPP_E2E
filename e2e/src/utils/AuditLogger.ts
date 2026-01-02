/**
 * AuditLogger Utility Class
 * Provides centralized logging for all healer operations
 */

import fs from 'fs';
import path from 'path';
import { AuditLogEntry } from '../types/index.js';

export class AuditLogger {
  private logPath: string;
  private verbose: boolean;

  /**
   * Initialize audit logger
   * @param logPath - Path where audit logs are written
   * @param verbose - Enable console output
   */
  constructor(logPath: string, verbose: boolean = false) {
    this.logPath = logPath;
    this.verbose = verbose;

    // Ensure log directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Log a healing action
   */
  log(entry: AuditLogEntry): void {
    const logLine = `[${entry.timestamp}] [${entry.status.toUpperCase()}] ${entry.action}: ${entry.filePath} | ${entry.details}\n`;

    // Write to file
    try {
      fs.appendFileSync(this.logPath, logLine);
    } catch (error) {
      console.error(`Failed to write audit log: ${error}`);
    }

    // Optionally print to console
    if (this.verbose) {
      const statusEmoji = entry.status === 'success' ? '✅' : entry.status === 'warning' ? '⚠️' : '❌';
      console.log(`${statusEmoji} [${entry.action}] ${entry.details}`);
    }
  }

  /**
   * Log success action
   */
  logSuccess(action: string, filePath: string, details: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      action,
      filePath,
      details,
      status: 'success'
    });
  }

  /**
   * Log warning action
   */
  logWarning(action: string, filePath: string, details: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      action,
      filePath,
      details,
      status: 'warning'
    });
  }

  /**
   * Log failure action
   */
  logFailure(action: string, filePath: string, details: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      action,
      filePath,
      details,
      status: 'failure'
    });
  }

  /**
   * Get audit log contents
   */
  getLog(): string {
    try {
      return fs.readFileSync(this.logPath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Clear audit log
   */
  clear(): void {
    try {
      fs.writeFileSync(this.logPath, '');
    } catch (error) {
      console.error(`Failed to clear audit log: ${error}`);
    }
  }
}
