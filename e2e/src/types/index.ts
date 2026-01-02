/**
 * Type Definitions for Self-Heal Mechanism
 * Defines all interfaces and types used across the healing framework
 */

/**
 * Test information containing failure details
 */
export interface TestInfo {
  filePath: string;
  error: string;
  errorType: ErrorType;
  errorContext?: string;
  timestamp: Date;
}

/**
 * Test error classification
 */
export type ErrorType =
  | 'timeout'
  | 'not_found'
  | 'assertion'
  | 'selector'
  | 'navigation'
  | 'network'
  | 'strict_mode'
  | 'unknown';

/**
 * Sanitized test data ready for LLM consumption
 */
export interface SanitizedTestData {
  errorMessage: string;
  errorType: string;
  testCode: string;
  filePath: string;
  timestamp: string;
}

/**
 * Analysis result from LLM
 */
export interface AnalysisResult {
  suggestedFix: string;
  explanation: string;
  confidence: number; // 0-100
}

/**
 * Result of healing attempt
 */
export interface HealingResult {
  success: boolean;
  fix?: string;
  reason?: string;
  appliedAt?: Date;
  verifiedAt?: Date;
}

/**
 * Backup information for rollback capability
 */
export interface BackupData {
  originalPath: string;
  backupPath: string;
  timestamp: number;
  fileSize: number;
}

/**
 * Configuration for healer instances
 */
export interface HealerConfig {
  apiKey: string;
  maxRetries: number;
  apiTimeout: number;
  maxFileSize: number;
  backupDir: string;
  auditLogPath: string;
  verbose: boolean;
}

/**
 * Rate limiter state
 */
export interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  timestamp: string;
  action: string;
  filePath: string;
  details: string;
  status: 'success' | 'failure' | 'warning';
}
/**
 * Healing session report
 */
export interface HealingReport {
  timestamp: string;
  duration: string;
  provider: string;
  totalTests: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  successRate: number;
  tests: Array<{
    filePath: string;
    error: string;
    errorType: string;
    analysis: string;
    suggestedFix: string;
    success: boolean;
    timestamp: string;
    /** AI provider used (Gemini, Claude, etc.) */
    aiProvider?: string;
    /** Classification of error type */
    classification?: {
      type: ErrorType;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      severityScore: number;
      category: string;
    };
    /** Confidence score for the fix (0-100) */
    confidence?: number;
    /** Detailed root cause analysis */
    rootCauseAnalysis?: string;
    /** Recommended approach to fix */
    recommendedApproach?: string;
  }>;
}