/**
 * Abstract Base Healer Class
 * Implements the Template Method pattern for test healing workflow
 * Defines the skeleton of the healing algorithm - subclasses override specific steps
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  TestInfo,
  SanitizedTestData,
  AnalysisResult,
  HealingResult,
  BackupData,
  HealerConfig
} from '../types/index.js';
import { AuditLogger } from '../utils/AuditLogger.js';
import { SecurityValidator } from '../utils/SecurityValidator.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { ErrorClassifier } from '../utils/ErrorClassifier.js';

/**
 * Abstract base class defining the healing algorithm template
 * Uses Template Method pattern: concrete subclasses implement specific AI providers
 */
export abstract class BaseHealer {
  protected config: HealerConfig;
  protected auditLogger: AuditLogger;
  protected rateLimiter: RateLimiter;

  /**
   * Initialize base healer with configuration
   */
  constructor(config: HealerConfig) {
    this.config = config;
    this.auditLogger = new AuditLogger(config.auditLogPath, config.verbose);
    this.rateLimiter = new RateLimiter({
      maxCalls: 5,
      windowMs: 60000 // 5 calls per minute
    });

    this.validateConfiguration();
  }

  /**
   * Template Method: The main healing algorithm skeleton
   * Defines the order of operations; subclasses override abstract methods
   */
  async healTest(testInfo: TestInfo, testCode: string): Promise<HealingResult> {
    try {
      // Step 1: Validate input
      this.validateInput(testInfo, testCode);

      // Step 2: Check if healing should be skipped
      if (!this.shouldHeal(testInfo)) {
        this.auditLogger.logWarning('HEAL_SKIPPED', testInfo.filePath, testInfo.error);
        return { success: false, reason: 'Test skipped (infrastructure error)' };
      }

      // Step 3: Sanitize inputs for LLM
      const sanitizedData = this.sanitizeInputs(testInfo, testCode);

      // Step 4: Call rate limiter
      await this.rateLimiter.wait();

      // Step 5: Analyze failure using LLM (abstract - implemented by subclass)
      const analysis = await this.analyzeFailure(sanitizedData);

      // Step 6: Validate generated code
      const codeValidation = SecurityValidator.validateGeneratedCode(analysis.suggestedFix);
      if (!codeValidation.valid) {
        throw new Error(`Generated code contains dangerous patterns: ${codeValidation.issues.join(', ')}`);
      }

      // Step 7: Create backup before modifying
      const backup = this.createBackup(testInfo.filePath);

      // Step 8: Apply the fix
      await this.applyFix(testInfo.filePath, analysis.suggestedFix);

      // Step 9: Verify fix works (abstract - implemented by subclass)
      const verified = await this.verifyFix(testInfo.filePath);

      if (!verified) {
        this.rollback(backup);
        this.auditLogger.logFailure('HEAL_FAILED', testInfo.filePath, 'Verification failed');
        return { success: false, reason: 'Verification failed' };
      }

      // Step 10: Clean up backup
      this.cleanupBackup(backup);

      this.auditLogger.logSuccess('HEAL_SUCCESS', testInfo.filePath, analysis.explanation);
      return {
        success: true,
        fix: analysis.suggestedFix,
        appliedAt: new Date(),
        verifiedAt: new Date()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.auditLogger.logFailure('HEAL_ERROR', testInfo.filePath, errorMsg);
      throw error;
    }
  }

  /**
   * Abstract methods - Must be implemented by subclasses
   */

  /**
   * Analyze failure using specific AI provider (e.g., Gemini, Claude, OpenAI)
   */
  abstract analyzeFailure(data: SanitizedTestData): Promise<AnalysisResult>;

  /**
   * Verify that the applied fix actually works
   */
  abstract verifyFix(filePath: string): Promise<boolean>;

  /**
   * Protected methods - Common healing logic shared across all healers
   */

  /**
   * Classify test error and enhance with error type context
   */
  protected classifyError(testInfo: TestInfo): void {
    const classified = ErrorClassifier.classify(testInfo.error, testInfo.errorContext);
    
    const aiContext = ErrorClassifier.buildAIContext(classified);
    
    const classificationMsg = `[ERROR_CLASSIFICATION] Type: ${classified.type} | Severity: ${classified.severity} | Score: ${ErrorClassifier.getSeverityScore(classified.type)}/100`;
    const detailsMsg = `[ERROR_DETAILS]\n${aiContext}`;

    this.auditLogger.logWarning('ERROR_CLASSIFICATION', testInfo.filePath, classificationMsg);
    this.auditLogger.logWarning('ERROR_DETAILS', testInfo.filePath, detailsMsg);

    // Store classification in testInfo for later use
    (testInfo as any).classifiedError = classified;
  }

  /**
   * Validate input test info and code
   */
  protected validateInput(testInfo: TestInfo, testCode: string): void {
    if (!testInfo?.filePath) {
      throw new Error('Missing testInfo.filePath');
    }
    if (!testCode?.trim()) {
      throw new Error('Missing test code');
    }

    const sizeValidation = SecurityValidator.validateTestCodeSize(testCode, this.config.maxFileSize);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error || 'Invalid test code size');
    }

    // Classify error during validation
    this.classifyError(testInfo);
  }

  /**
   * Determine if healing should be attempted
   */
  protected shouldHeal(testInfo: TestInfo): boolean {
    const skipKeywords = [
      'network error',
      'infrastructure',
      'configuration error',
      'env setup',
      'not installed',
      'connection refused',
      'eaddrinuse'
    ];

    const errorLower = testInfo.error.toLowerCase();
    return !skipKeywords.some(kw => errorLower.includes(kw));
  }

  /**
   * Sanitize test data for LLM consumption
   */
  protected sanitizeInputs(testInfo: TestInfo, testCode: string): SanitizedTestData {
    return {
      errorMessage: SecurityValidator.sanitizeErrorMessage(testInfo.error),
      errorType: SecurityValidator.sanitizeErrorMessage(testInfo.errorType),
      testCode: testCode.slice(0, 25000),
      filePath: '[LOCAL_PATH]',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create backup of original file for rollback
   */
  protected createBackup(filePath: string): BackupData {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const backupDir = this.config.backupDir;

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, `${fileName}.${Date.now()}.backup`);
    fs.writeFileSync(backupPath, content);

    return {
      originalPath: filePath,
      backupPath,
      timestamp: Date.now(),
      fileSize: content.length
    };
  }

  /**
   * Apply the fix to the test file
   */
  protected async applyFix(filePath: string, fixedCode: string): Promise<void> {
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, fixedCode);
    fs.renameSync(tmpPath, filePath);
  }

  /**
   * Rollback to backup if verification fails
   */
  protected rollback(backup: BackupData): void {
    try {
      fs.copyFileSync(backup.backupPath, backup.originalPath);
      console.log(`✅ Rolled back to: ${backup.backupPath}`);
    } catch (error) {
      console.error(`Failed to rollback: ${error}`);
    }
  }

  /**
   * Clean up backup file after successful healing
   */
  protected cleanupBackup(backup: BackupData): void {
    try {
      fs.unlinkSync(backup.backupPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Validate healer configuration on startup
   */
  private validateConfiguration(): void {
    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }
    if (this.config.maxRetries < 1) {
      throw new Error('maxRetries must be >= 1');
    }
    if (this.config.apiTimeout < 1000) {
      throw new Error('apiTimeout must be >= 1000ms');
    }
  }
}
