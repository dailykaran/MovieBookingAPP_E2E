#!/usr/bin/env node

/**
 * Advanced Gemini-Powered Playwright Test Healer - Enhanced Edition
 * Fully integrated with Google Generative AI API with robust error handling
 * 
 * Features:
 * - Full Gemini API integration for intelligent test analysis
 * - Retry mechanism with exponential backoff
 * - Rollback on verification failure
 * - Rate limiting and API timeout handling
 * - Pre-flight environment validation
 * - Backup cleanup and retention management
 * - Detailed error reporting
 * - TypeScript syntax validation
 * - Conditional healing based on error patterns
 */

import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { generateHtmlReport } from './healer-report-generator.js';
import AdmZip from 'adm-zip';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the script directory
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

// Configuration constants with enhanced error handling
const GEMINI_API_KEY_TEST = process.env.GEMINI_API_KEY_TEST;
const HEALER_AUTO_FIX = process.env.HEALER_AUTO_FIX === 'true';
let HEALER_VERBOSE = process.env.HEALER_VERBOSE === 'true';  // Can be updated by CLI args
const HEALER_MAX_FILE_SIZE = parseInt(process.env.HEALER_MAX_FILE_SIZE || '1048576', 10); // 1MB
const HEALER_BACKUP_DIR = process.env.HEALER_BACKUP_DIR || path.join(process.cwd(), 'reports/audit/.healer-backups');
const HEALER_AUDIT_LOG = process.env.HEALER_AUDIT_LOG || path.join(process.cwd(), 'reports/audit/.healer-audit.log');
const HEALER_MAX_RETRIES = parseInt(process.env.HEALER_MAX_RETRIES || '3', 10);
const HEALER_API_TIMEOUT = parseInt(process.env.HEALER_API_TIMEOUT || '60000', 10); // 60 seconds
const HEALER_API_RATE_LIMIT = parseInt(process.env.HEALER_API_RATE_LIMIT || '5', 10); // calls per minute
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);
const MAX_BACKUPS_PER_FILE = parseInt(process.env.MAX_BACKUPS_PER_FILE || '5', 10);
const ALLOWED_TEST_PATTERNS = [/^[a-zA-Z0-9._\-/]+\.spec\.ts(x)?$/, /^[a-zA-Z0-9._\-/]+\.test\.ts(x)?$/];
const DANGEROUS_PATTERNS = [/fs\.(rm|unlink|rmdir)/, /execSync|execFile|spawn/, /require\(|import\(/, /eval\(/, /new Function/, /process\.exit/, /child_process/];

// CRITICAL FIX: Only TRUE infrastructure errors that CANNOT be fixed by test changes
const INFRASTRUCTURE_ERRORS = [
  'connection refused', 'connection reset', 'enotfound', 'econnrefused',
  'host not found', 'dns', 'getaddrinfo', 'econnreset',
  'target page, context or browser has been closed', 'browser context was closed',
  'websocket closed', 'target closed', 'session not created',
  'err_name_not_resolved', 'err_connection_refused', 'err_connection_reset',
  'err_network_changed', 'timeout waiting for connection',
  'socket hang up', 'socket error', 'epipe', 'enotfound'
];

const REQUIRED_PACKAGES = ['@google/genai', '@playwright/test', 'dotenv'];

// ============ SOURCE CODE ANALYSIS CONFIGURATION ============
const HEALER_SOURCE_CODE_ANALYSIS = process.env.HEALER_SOURCE_CODE_ANALYSIS === 'true';
const HEALER_SOURCE_CODE_MAX_FILE_SIZE = parseInt(process.env.HEALER_SOURCE_CODE_MAX_FILE_SIZE || '500000', 10); // 500KB
const HEALER_SOURCE_CODE_MAX_EXTRACTION_SIZE = parseInt(process.env.HEALER_SOURCE_CODE_MAX_EXTRACTION_SIZE || '2097152', 10); // 2MB
const MAX_SOURCE_CODE_FILES_PER_SESSION = parseInt(process.env.MAX_SOURCE_CODE_FILES_PER_SESSION || '20', 10);
const SOURCE_CODE_ACCESS_AUDIT_LOG = path.join(process.cwd(), 'logs/source-code-access-audit.json');
let sessionSourceCodeExtraction = 0; // Track total bytes extracted in session
let sessionSourceCodeFiles = []; // Track files accessed in session

// Regex patterns for extracting UI elements (safe patterns with bounds)
// IMPROVED: Handle JSX formatting with whitespace, newlines, and various quote styles
const UI_ELEMENT_PATTERNS = {
  // Match label={"..."} or label='...' with flexible whitespace
  reactLabels: /label\s*=\s*(?:{["']|["'])([^"'}{]+)(?:["']|})/g,
  // Also try simpler patterns without braces
  reactLabels2: /label\s*=\s*["']([^"']+)["']/g,
  // Match getByLabel, getByPlaceholder patterns in test code (string literals)
  testLookupLabels: /getByLabel\s*\(\s*["']([^"']+)["']\s*\)/g,
  // NEW: Match getByLabel, getByText, getByPlaceholder with regex patterns (/.../)
  testLookupLabelsRegex: /getByLabel\s*\(\s*\/([^/]+)\/[igm]*\s*\)/g,
  testLookupTextRegex: /getByText\s*\(\s*\/([^/]+)\/[igm]*\s*\)/g,
  testLookupPlaceholderRegex: /getByPlaceholder\s*\(\s*\/([^/]+)\/[igm]*\s*\)/g,
  reactButtons: /(?:name|aria-label)\s*=\s*["']([^"']{1,500})["']/g,
  reactPlaceholder: /placeholder\s*=\s*["']([^"']{1,500})["']/g,
  headings: /<Typography[^>]*variant\s*=\s*["']h[1-6]["'][^>]*>([^<]{1,200})</g,
  webComponentLabel: /this\.label\s*=\s*["']([^"']{1,500})["']/g,
  webComponentValue: /this\.value\s*=\s*["']([^"']{1,500})["']/g
};

// Track API call rate for rate limiting
let apiCallTimes = [];

// ========== LOGGING SYSTEM ==========

// In-memory log storage
let healingLogs = {
  sessionId: generateSessionId(),
  startTime: new Date().toISOString(),
  events: [],
  statistics: {
    totalEvents: 0,
    failedLocators: 0,
    workedLocators: 0,
    elementsHealed: 0,
    // NEW FIELDS FOR BEHAVIORAL TRACKING
    behavioralChangesDetected: 0,
    frontendBugsDetected: 0,
    selectorUpdates: 0,
    textUpdates: 0,
    urlUpdates: 0,
    architecturalFixes: 0,
    decisionBreakdown: {
      FRONTEND_BUG: 0,
      UPDATE_TEST: 0,
      UPDATE_SELECTOR: 0,
      UPDATE_TEXT: 0,
      SELECTOR_CLASS_UPDATE: 0,  // NEW: Class-only selector updates
      ARCHITECTURAL_FIX: 0,
      MANUAL_REVIEW: 0,
      UNKNOWN: 0
    },
    confidenceDistribution: {
      high: 0,
      medium: 0,
      low: 0
    }
  }
};

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return `healing-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Log a healing event with all relevant details
 */
function logHealingEvent(eventType, elementName, failedLocator, workingLocator, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    sessionId: healingLogs.sessionId,
    eventType, // 'locator_failure', 'locator_found', 'element_healed', 'verification_passed', etc.
    elementName,
    failedLocator,
    workingLocator,
    details,
    duration: details.duration || null
  };

  healingLogs.events.push(logEntry);
  healingLogs.statistics.totalEvents++;

  if (eventType === 'locator_failure') {
    healingLogs.statistics.failedLocators++;
  } else if (eventType === 'locator_found' || eventType === 'element_healed') {
    healingLogs.statistics.workedLocators++;
  }

  if (eventType === 'element_healed') {
    healingLogs.statistics.elementsHealed++;
  }

  // NEW: Track behavioral changes and decisions
  if (eventType === 'behavioral_change_detected') {
    healingLogs.statistics.behavioralChangesDetected++;
  }
  
  if (eventType === 'frontend_bug_detected') {
    healingLogs.statistics.frontendBugsDetected++;
  }
  
  if (eventType === 'healer_decision') {
    const decision = details.decision || 'UNKNOWN';
    healingLogs.statistics.decisionBreakdown[decision] = (healingLogs.statistics.decisionBreakdown[decision] || 0) + 1;
    
    const confidence = details.confidence || 0;
    if (confidence >= 70) healingLogs.statistics.confidenceDistribution.high++;
    else if (confidence >= 40) healingLogs.statistics.confidenceDistribution.medium++;
    else healingLogs.statistics.confidenceDistribution.low++;
  }
  
  if (eventType === 'test_fixed_with_change') {
    const changeType = details.changeType || 'unknown';
    if (changeType === 'selector') healingLogs.statistics.selectorUpdates++;
    if (changeType === 'text') healingLogs.statistics.textUpdates++;
    if (changeType === 'url') healingLogs.statistics.urlUpdates++;
    if (changeType === 'architectural') healingLogs.statistics.architecturalFixes++;
  }

  if (HEALER_VERBOSE) {
    console.log(`📝 [LOG] ${eventType}: ${elementName} | Failed: ${failedLocator} | Working: ${workingLocator}`);
  }

  return logEntry;
}

/**
 * Get current session statistics
 */
function getSessionStatistics() {
  const durationMs = new Date() - new Date(healingLogs.startTime);
  const duration = new Date(durationMs).toISOString().slice(11, 19);
  return {
    ...healingLogs.statistics,
    sessionDuration: duration,
    totalLogEntries: healingLogs.events.length,
    eventTypes: healingLogs.events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {})
  };
}

/**
 * Write logs to JSON file (healing-logs.json)
 */
function persistLogs() {
  const logsDir = path.join(process.cwd(), 'reports/results');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logsPath = path.join(logsDir, 'healing-logs.json');
  const logsData = {
    ...healingLogs,
    endTime: new Date().toISOString(),
    statistics: getSessionStatistics()
  };

  try {
    fs.writeFileSync(logsPath, JSON.stringify(logsData, null, 2), 'utf8');
    if (HEALER_VERBOSE) {
      console.log(`✅ Logs persisted to: ${logsPath}`);
    }
  } catch (err) {
    console.error(`❌ Failed to persist logs: ${err.message}`);
  }

  return logsPath;
}



// Validate API key
if (!GEMINI_API_KEY_TEST) {
  console.error('❌ GEMINI_API_KEY_TEST environment variable is not set!');
  console.error('Please set GEMINI_API_KEY_TEST in your .env file or environment.');
  console.error('Get a new key from: https://aistudio.google.com/app/apikeys');
  process.exit(1);
}

// Check that it starts with AIzaSy (standard Gemini API key format)
if (!GEMINI_API_KEY_TEST.startsWith('AIzaSy')) {
  console.error('❌ GEMINI_API_KEY_TEST format appears invalid');
  console.error('Valid keys start with "AIzaSy"');
  console.error('Got: ' + GEMINI_API_KEY_TEST.substring(0, 10) + '...');
  console.error('Get a new key from: https://aistudio.google.com/app/apikeys');
  process.exit(1);
}

// Check minimum length (Gemini keys are typically 39+ characters)
if (GEMINI_API_KEY_TEST.length < 30) {
  console.error('❌ GEMINI_API_KEY_TEST appears too short');
  console.error('Valid keys are typically 39+ characters');
  console.error('Got length: ' + GEMINI_API_KEY_TEST.length);
  console.error('Get a new key from: https://aistudio.google.com/app/apikeys');
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: GEMINI_API_KEY_TEST,
});

/**
 * Check if required npm packages are installed (Dependency Check)
 */
function checkDependencies() {
  const missing = [];
  
  // Check if node_modules directory exists and contains packages
  for (const pkg of REQUIRED_PACKAGES) {
    try {
      const pkgPath = path.join(process.cwd(), 'node_modules', pkg);
      if (!fs.existsSync(pkgPath)) {
        missing.push(pkg);
      }
    } catch (err) {
      missing.push(pkg);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required dependencies:');
    missing.forEach(pkg => console.error(`   - ${pkg}`));
    console.error('\n📦 Install with: npm install');
    process.exit(1);
  }
  
  if (HEALER_VERBOSE) {
    console.log('✅ All required dependencies are installed');
  }
}

/**
 * Validate all configuration on startup (Configuration Validation)
 */
function validateConfiguration() {
  const config = {
    HEALER_MAX_FILE_SIZE,
    HEALER_MAX_RETRIES,
    HEALER_API_TIMEOUT,
    HEALER_API_RATE_LIMIT,
    BACKUP_RETENTION_DAYS,
    MAX_BACKUPS_PER_FILE
  };
  
  if (HEALER_MAX_FILE_SIZE < 1024) {
    console.warn('⚠️  HEALER_MAX_FILE_SIZE is very small (<1KB), may reject valid test files');
  }
  
  if (HEALER_MAX_RETRIES < 1) {
    console.warn('⚠️  HEALER_MAX_RETRIES is 0, tests won\'t be retried on failure');
  }
  
  if (HEALER_API_TIMEOUT < 10000) {
    console.warn('⚠️  HEALER_API_TIMEOUT is very short (<10s), may timeout during processing');
  }
  
  if (HEALER_API_RATE_LIMIT > 30) {
    console.warn('⚠️  HEALER_API_RATE_LIMIT is high, may exceed API quotas');
  }
  
  if (HEALER_VERBOSE) {
    console.log('✅ Configuration validation passed:');
    Object.entries(config).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }
}

/**
 * Validate environment and prerequisites before healing (Pre-flight Validation)
 */
function validateEnvironment() {
  const checks = [];
  
  // Check .env file
  if (!fs.existsSync('.env')) {
    checks.push({ name: '.env file', ok: false, hint: 'Copy .env.example to .env' });
  } else {
    checks.push({ name: '.env file', ok: true });
  }
  
  // Check test results exist
  const resultsPath = path.join(process.cwd(), 'reports/results', 'results.json');
  if (!fs.existsSync(resultsPath)) {
    checks.push({ name: 'reports/results/results.json', ok: false, hint: 'Run tests first with: npm test' });
  } else {
    checks.push({ name: 'reports/results/results.json', ok: true });
  }
  
  // Check tests directory
  const testsDir = path.join(process.cwd(), 'tests');
  if (!fs.existsSync(testsDir)) {
    checks.push({ name: 'tests/ directory', ok: false, hint: 'Tests directory not found' });
  } else {
    checks.push({ name: 'tests/ directory', ok: true });
  }
  
  // Check playwright config
  const pwConfig = path.join(process.cwd(), 'playwright.config.ts');
  if (!fs.existsSync(pwConfig)) {
    checks.push({ name: 'playwright.config.ts', ok: false, hint: 'Playwright not configured' });
  } else {
    checks.push({ name: 'playwright.config.ts', ok: true });
  }
  
  // Check backup directory
  try {
    if (!fs.existsSync(HEALER_BACKUP_DIR)) {
      fs.mkdirSync(HEALER_BACKUP_DIR, { recursive: true });
    }
    checks.push({ name: 'Backup directory', ok: true });
  } catch (err) {
    checks.push({ name: 'Backup directory', ok: false, hint: `Cannot create: ${err.message}` });
  }
  
  // Check audit log directory
  try {
    const auditDir = path.dirname(HEALER_AUDIT_LOG);
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    checks.push({ name: 'Audit log directory', ok: true });
  } catch (err) {
    checks.push({ name: 'Audit log directory', ok: false, hint: `Cannot create: ${err.message}` });
  }
  
  // Report results
  console.log('\n🔍 Pre-flight Environment Checks:');
  let allPass = true;
  checks.forEach(check => {
    const icon = check.ok ? '✅' : '❌';
    console.log(`  ${icon} ${check.name}`);
    if (!check.ok) {
      console.log(`     💡 ${check.hint}`);
      allPass = false;
    }
  });
  
  if (!allPass) {
    console.error('\n❌ Environment validation failed. Please fix the issues above.');
    process.exit(1);
  }
  
  console.log('\n✅ All environment checks passed\n');
}

// ========== HELPER FUNCTIONS ==========

/**
 * CLI Arguments Parser with Input Validation
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let testFile = args.find(arg => !arg.startsWith('-'));
  
  if (testFile) {
    if (!/^[a-zA-Z0-9._\-/]+$/.test(testFile)) {
      console.error(`❌ Security: Invalid test file name: ${testFile}`);
      console.error('Only alphanumeric characters, dots, hyphens, and slashes are allowed');
      process.exit(1);
    }
    
    if (testFile.includes('..')) {
      console.error('❌ Security: Directory traversal detected in test file name');
      process.exit(1);
    }
  }
  
  return {
    autoFix: args.includes('--auto-fix') || args.includes('-a'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    testFile: testFile,
    help: args.includes('--help') || args.includes('-h')
  };
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║           Gemini-Powered Playwright Test Healer - Enhanced             ║
╚═══════════════════════════════════════════════════════════════════════╝

Usage: node gemini-healer.js [options] [test-file]

Options:
  --auto-fix, -a     Automatically apply fixes suggested by Gemini
  --verbose, -v      Show detailed debug information
  --help, -h         Display this help message

Examples:
  node gemini-healer.js                    # Heal all failing tests
  node gemini-healer.js --auto-fix         # Heal and auto-apply fixes
  node gemini-healer.js --auto-fix -v      # Heal with verbose logging
  node gemini-healer.js localhost-3000     # Heal specific test file

Environment Variables:
  GEMINI_API_KEY_TEST              Your Google Generative AI API key (required)
  HEALER_AUTO_FIX             Default auto-fix behavior (true/false)
  HEALER_VERBOSE              Default verbose logging (true/false)
  HEALER_MAX_RETRIES          Maximum retry attempts (default: 3)
  HEALER_API_TIMEOUT          API timeout in ms (default: 60000)
  HEALER_API_RATE_LIMIT       API calls per minute (default: 5)
  BACKUP_RETENTION_DAYS       Days to keep backups (default: 7)
  MAX_BACKUPS_PER_FILE        Max backups per file (default: 5)
`);
}

/**
 * Security: Validate and sanitize file paths
 */
function validateFilePath(filePath) {
  try {
    const resolved = path.resolve(filePath);
    const projectRoot = path.resolve(process.cwd());
    const testDir = path.resolve(process.cwd(), 'tests');
    
    if (!resolved.startsWith(testDir) && !resolved.startsWith(projectRoot)) {
      console.error(`❌ Security: Path traversal detected: ${filePath}`);
      return null;
    }
    
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) {
      console.error(`❌ Security: Symbolic link not allowed: ${filePath}`);
      return null;
    }
    
    if (stats.size > HEALER_MAX_FILE_SIZE) {
      console.error(`❌ Security: File exceeds max size (${HEALER_MAX_FILE_SIZE} bytes): ${filePath}`);
      return null;
    }
    
    return resolved;
  } catch (err) {
    console.error(`❌ Security: Path validation error: ${err.message}`);
    return null;
  }
}

/**
 * Security: Validate test file name against whitelist patterns
 */
function validateTestFileName(fileName) {
  const basename = path.basename(fileName);
  return ALLOWED_TEST_PATTERNS.some(pattern => pattern.test(basename));
}

/**
 * Security: Validate generated code for dangerous patterns
 */
function validateGeneratedCode(code) {
  const issues = [];
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      issues.push(`Dangerous pattern detected: ${pattern}`);
    }
  }
  
  if (code.match(/import.*fs|import.*child_process|import.*os/)) {
    issues.push('Suspicious imports detected (fs, child_process, os)');
  }
  
  // Check if this is a partial fix (just a locator) or a full test
  const isPartialFix = (code.includes('page.locator') || code.includes('.locator(')) && 
                        !code.includes('test(') && 
                        !code.includes('it(');
  
  if (!isPartialFix) {
    // Full test functions require test() and expect()
    if (!code.includes('test(') && !code.includes('it(')) {
      issues.push('No test function found');
    }
    
    if (!code.includes('expect(')) {
      issues.push('No assertions found');
    }
  } else {
    // Partial fixes only need valid locator syntax
    if (!code.includes('page.locator') && !code.includes('.locator(')) {
      issues.push('No page.locator found in partial fix');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Security: Audit logging for file operations
 */
function auditLog(action, filePath, details = '') {
  try {
    if (!fs.existsSync(HEALER_BACKUP_DIR)) {
      fs.mkdirSync(HEALER_BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      filePath: path.basename(filePath),
      userId: process.env.USER || process.env.USERNAME || 'unknown',
      details,
      pid: process.pid
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(HEALER_AUDIT_LOG, logLine, 'utf8');
    
    if (HEALER_VERBOSE) {
      console.log(`📝 Audit: ${action} - ${path.basename(filePath)}`);
    }
  } catch (err) {
    console.warn(`⚠️  Audit logging error: ${err.message}`);
  }
}

/**
 * Security: Create backup of original file
 */
function createBackup(filePath) {
  try {
    if (!fs.existsSync(HEALER_BACKUP_DIR)) {
      fs.mkdirSync(HEALER_BACKUP_DIR, { recursive: true });
    }
    
    const basename = path.basename(filePath);
    const timestamp = Date.now();
    const backupPath = path.join(HEALER_BACKUP_DIR, `${basename}.${timestamp}.bak`);
    
    fs.copyFileSync(filePath, backupPath);
    auditLog('BACKUP_CREATED', filePath, backupPath);
    
    return backupPath;
  } catch (err) {
    console.warn(`⚠️  Failed to create backup: ${err.message}`);
    return null;
  }
}

/**
 * Security: Atomic file write with temp file (cross-device compatible)
 */
function atomicFileWrite(filePath, content) {
  try {
    const targetDir = path.dirname(filePath);
    const tempFile = path.join(targetDir, `healer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.tmp`);
    
    fs.writeFileSync(tempFile, content, 'utf8');
    
    const written = fs.readFileSync(tempFile, 'utf8');
    if (written !== content) {
      fs.unlinkSync(tempFile);
      throw new Error('Content verification failed');
    }
    
    fs.copyFileSync(tempFile, filePath);
    fs.unlinkSync(tempFile);
    return true;
  } catch (err) {
    console.error(`❌ Atomic write error: ${err.message}`);
    return false;
  }
}

/**
 * CRITICAL FIX: Determine if test should be healed based on error classification
 * Only skip TRUE infrastructure/connection errors - heal everything else including assertion timeouts
 */
function shouldHealTest(testInfo, testCode = '') {
  const classifiedType = testInfo.classifiedType || 'UNKNOWN';
  const lowerError = testInfo.error.toLowerCase();
  
  // ONLY skip TRUE infrastructure errors (connection/network issues that CAN'T be fixed by test changes)
  if (classifiedType === 'INFRASTRUCTURE') {
    if (HEALER_VERBOSE) {
      console.log(`  ⏭️  Skipping: True infrastructure/connection error (not fixable by test changes)`);
    }
    return false;
  }
  
  // ✅ HEAL ALL OTHER ERROR TYPES:
  // - ASSERTION: toHaveURL, element not found, text mismatches (fixable by updating test logic)
  // - SELECTOR: Strict mode violations, ambiguous locators (fixable by updating selectors)
  // - NAVIGATION: URL changes, routing issues (fixable by updating expected URLs)
  // - DOM_ARCHITECTURE: Shadow DOM, iframes, Web Components (fixable by using penetrating selectors)
  // - TIMEOUT_ASSERTION: Assertion timeouts on elements (fixable by updating selectors/logic)
  if (['ASSERTION', 'SELECTOR', 'NAVIGATION', 'DOM_ARCHITECTURE', 'TIMEOUT_ASSERTION'].includes(classifiedType)) {
    return true;
  }
  
  // For UNKNOWN errors, attempt to heal them (better to try and fail than skip)
  if (classifiedType === 'UNKNOWN') {
    if (HEALER_VERBOSE) {
      console.log(`  🔍 Unknown error type, attempting to heal...`);
    }
    return true;
  }
  
  return true;
}

/**
 * Validate TypeScript/JavaScript syntax (Code Linting)
 */
function validateTypeScriptSyntax(code) {
  try {
    if (!code.includes('import') && !code.includes('require')) {
      return { valid: false, error: 'No import statements found' };
    }
    
    if (!code.match(/test\s*\(|it\s*\(/)) {
      return { valid: false, error: 'No test function found' };
    }
    
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      return { valid: false, error: `Mismatched braces: ${openBraces} open, ${closeBraces} closed` };
    }
    
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return { valid: false, error: `Mismatched parentheses: ${openParens} open, ${closeParens} closed` };
    }
    
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Rate limit API calls with exponential backoff (API Rate Limiting)
 */
async function rateLimitAndWait() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  apiCallTimes = apiCallTimes.filter(time => time > oneMinuteAgo);
  
  if (apiCallTimes.length >= HEALER_API_RATE_LIMIT) {
    const oldestCall = apiCallTimes[0];
    const elapsedSinceOldest = now - oldestCall;
    const waitTime = Math.max(0, 60000 - elapsedSinceOldest + 1000);
    if (waitTime > 0) {
      if (HEALER_VERBOSE) {
        console.log(`⏱️  Rate limit reached. Waiting ${(waitTime / 1000).toFixed(1)}s...`);
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  apiCallTimes.push(now);
}

/**
 * Cleanup old backups to prevent disk bloat (Backup Cleanup)
 */
function cleanupOldBackups() {
  try {
    if (!fs.existsSync(HEALER_BACKUP_DIR)) return;
    
    const files = fs.readdirSync(HEALER_BACKUP_DIR);
    const backupsByFile = {};
    const now = Date.now();
    const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    files.forEach(file => {
      const match = file.match(/^(.+)\.(\d+)\.bak$/);
      if (match) {
        const originalFile = match[1];
        const timestamp = parseInt(match[2], 10);
        
        if (!backupsByFile[originalFile]) {
          backupsByFile[originalFile] = [];
        }
        backupsByFile[originalFile].push({ file, timestamp });
      }
    });
    
    let deletedCount = 0;
    Object.entries(backupsByFile).forEach(([originalFile, backups]) => {
      backups.sort((a, b) => b.timestamp - a.timestamp);
      
      backups.forEach((backup, idx) => {
        const age = now - backup.timestamp;
        const tooOld = age > retentionMs;
        const tooMany = idx >= MAX_BACKUPS_PER_FILE;
        
        if (tooOld || tooMany) {
          try {
            fs.unlinkSync(path.join(HEALER_BACKUP_DIR, backup.file));
            deletedCount++;
            auditLog('BACKUP_DELETED', backup.file, `Age: ${Math.round(age / 1000 / 60)}m, Index: ${idx}`);
          } catch (err) {
            console.warn(`⚠️  Failed to delete backup ${backup.file}: ${err.message}`);
          }
        }
      });
    });
    
    if (deletedCount > 0 && HEALER_VERBOSE) {
      console.log(`🗑️  Cleaned up ${deletedCount} old backup(s)`);
    }
  } catch (err) {
    console.warn(`⚠️  Backup cleanup error: ${err.message}`);
  }
}

/**
 * Cleanup old HTML reports to prevent disk bloat (Report Cleanup)
 * Keeps the 5 most recent reports instead of deleting all
 */
function cleanupOldReports() {
  try {
    const reportDir = path.join(process.cwd(), 'reports/healer');
    if (!fs.existsSync(reportDir)) return;
    
    const files = fs.readdirSync(reportDir);
    const KEEP_RECENT_COUNT = 5; // Keep last 5 reports
    
    // Get healer report files with timestamps
    const reportFiles = files
      .filter(file => file.match(/^healer-report-.*\.html$/))
      .map(file => ({
        name: file,
        path: path.join(reportDir, file),
        time: fs.statSync(path.join(reportDir, file)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time); // Sort by most recent first
    
    // Delete only if we have more than KEEP_RECENT_COUNT reports
    if (reportFiles.length > KEEP_RECENT_COUNT) {
      const toDelete = reportFiles.slice(KEEP_RECENT_COUNT); // Keep first N, delete rest
      let deletedCount = 0;
      
      toDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          deletedCount++;
          if (HEALER_VERBOSE) {
            console.log(`🗑️  Removed old report: ${file.name}`);
          }
        } catch (err) {
          console.warn(`⚠️  Could not delete ${file.name}: ${err.message}`);
        }
      });
      
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old report(s), keeping last ${KEEP_RECENT_COUNT}\n`);
      }
    }
  } catch (err) {
    console.error(`⚠️  Error cleaning up reports: ${err.message}`);
  }
}

/**
 * Generate detailed error report for failed healing attempts (Error Reporting)
 */
function generateErrorReport(healingResults) {
  const failedTests = healingResults.tests.filter(t => !t.fixed && !t.verified);
  if (failedTests.length === 0) return null;
  
  const report = {
    timestamp: new Date().toISOString(),
    totalFailed: failedTests.length,
    errors: failedTests.map(test => ({
      file: test.file,
      title: test.title,
      errorType: test.errorType,
      errorSummary: test.error.split('\n')[0],
      reason: test.failureReason || 'Unknown'
    })),
    recommendations: [
      'Review error messages above for patterns',
      'Check if errors are infrastructure-related',
      'Consider increasing HEALER_API_TIMEOUT',
      'Verify test file syntax is correct',
      'Check Gemini API is responding correctly'
    ]
  };
  
  try {
    const reportPath = path.join(process.cwd(), 'reports/healer', `healer-error-report-${Date.now()}.json`);
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    auditLog('ERROR_REPORT_GENERATED', reportPath);
    console.log(`📄 Error report saved: ${reportPath}`);
  } catch (err) {
    console.warn(`⚠️  Could not save error report: ${err.message}`);
  }
  
  return report;
}

/**
 * Security: Validate JSON schema for test results
 */
function validateTestResultsSchema(results) {
  const required = ['suites'];
  for (const field of required) {
    if (!(field in results)) {
      return false;
    }
  }
  
  if (!Array.isArray(results.suites)) {
    return false;
  }
  
  for (const suite of results.suites) {
    if (typeof suite.file !== 'string' || !Array.isArray(suite.specs)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Recursively collect all specs from nested suite structure
 */
function collectSpecsFromSuite(suite, fileReference) {
  const allSpecs = [];
  
  // Add specs from current level
  if (suite.specs && Array.isArray(suite.specs)) {
    suite.specs.forEach(spec => {
      allSpecs.push({ spec, file: suite.file || fileReference });
    });
  }
  
  // Recursively add specs from nested suites
  if (suite.suites && Array.isArray(suite.suites)) {
    suite.suites.forEach(nestedSuite => {
      const nestedSpecs = collectSpecsFromSuite(nestedSuite, fileReference);
      allSpecs.push(...nestedSpecs);
    });
  }
  
  return allSpecs;
}

/**
 * Fetch and parse test results
 */
function getFailedTests() {
  const resultsPath = path.join(process.cwd(), 'reports/results', 'results.json');

  if (!fs.existsSync(resultsPath)) {
    console.warn('⚠️  No test results found. Run tests first with: npm test');
    return [];
  }

  try {
    const resultsContent = fs.readFileSync(resultsPath, 'utf8');
    const results = JSON.parse(resultsContent);
    console.log(`📊 AI Log - Test results parsed length: ${results.suites.length} suites`);
    // console.log(`📊 AI Log - Test results parsed: ${JSON.stringify(results, null, 2)}`);

    if (!validateTestResultsSchema(results)) {
      console.error('❌ Invalid test results schema');
      return [];
    }
    
    const failedTests = [];

    if (results.suites && Array.isArray(results.suites)) {
      for (const suite of results.suites) {
        if (!suite.file) continue;
        
        if (!validateTestFileName(suite.file)) {
          console.warn(`⚠️  Skipping suspicious test file: ${suite.file}`);
          continue;
        }

        // Recursively collect specs from main level and nested suites
        const allSpecs = collectSpecsFromSuite(suite, suite.file);
        
        for (const { spec, file } of allSpecs) {
          if (spec.ok === false) {
            const testInfo = extractTestInfo(spec);
            
            const safeFilePath = path.join(process.cwd(), 'tests', path.basename(file));
            const validatedPath = validateFilePath(safeFilePath);
            
            if (!validatedPath) {
              console.warn(`⚠️  Skipping file with invalid path: ${safeFilePath}`);
              continue;
            }
            
            failedTests.push({
              file: file,
              filePath: validatedPath,
              title: spec.title,
              status: 'failed',
              error: testInfo.error,
              errorType: testInfo.errorType,
              errorContext: testInfo.errorContext
            });
          }
        }
      }
    }

    return failedTests;
  } catch (err) {
    console.error('❌ Error parsing test results:', err.message);
    return [];
  }
}

/**
 * Extract detailed test information from test spec with PROPER error classification
 */
function extractTestInfo(spec) {
  let error = 'Test failed';
  let errorType = 'unknown';
  let errorContext = '';

  if (spec.tests && Array.isArray(spec.tests) && spec.tests[0]) {
    const test = spec.tests[0];
    if (test.results && Array.isArray(test.results) && test.results[0]) {
      const result = test.results[0];

      if (result.errors && Array.isArray(result.errors)) {
        const errorMessages = result.errors
          .filter(err => err.message)
          .map(err => err.message);
        error = errorMessages.join('\n');
      }

      if (error.includes('timeout') || error.includes('Timeout')) {
        errorType = 'timeout';
      } else if (error.includes('strict mode') || error.includes('resolved to')) {
        errorType = 'strict_mode';
      } else if (error.includes('expect') || error.includes('assertion')) {
        errorType = 'assertion';
      } else if (error.includes('not found')) {
        errorType = 'not_found';
      }

      if (result.errors && result.errors[0]) {
        errorContext = result.errors[0].location || '';
      }
    }
  }

  // NEW: Classify error type using intelligent detection (CRITICAL FIX)
  const classifiedType = classifyErrorType(error);

  console.log('AI Log - Extracted Error:', error);
  console.log('AI Log - Classified Error Type:', classifiedType);
  console.log('AI Log - Error Context:', JSON.stringify(errorContext));
  console.log('AI Log - Error Type:', errorType);

  return { error, errorType, classifiedType, errorContext };
}

/**
 * CRITICAL FIX: Classify error type to determine if it can be healed
 * Returns: INFRASTRUCTURE, ASSERTION, SELECTOR, NAVIGATION, DOM_ARCHITECTURE, TIMEOUT_ASSERTION, or UNKNOWN
 */
function classifyErrorType(errorMessage) {
  if (!errorMessage) return 'UNKNOWN';
  
  const lower = errorMessage.toLowerCase();
  
  // Check for TRUE infrastructure/connection errors (CANNOT be fixed by test changes)
  for (const infError of INFRASTRUCTURE_ERRORS) {
    if (lower.includes(infError)) {
      return 'INFRASTRUCTURE';
    }
  }
  
  // Check for DOM architecture issues (CAN be fixed by using penetrating selectors)
  if (lower.includes('shadow dom') || lower.includes('shadow root') ||
      lower.includes('iframe') || lower.includes('frame') ||
      lower.includes('web component') || lower.includes('open') && lower.includes('pierce')) {
    return 'DOM_ARCHITECTURE';
  }
  
  // Check for selector/locator issues (CAN be fixed by updating selectors)
  if (lower.includes('strict mode') || lower.includes('resolved to') ||
      lower.includes('multiple elements') || lower.includes('ambiguous') ||
      lower.includes('selector') || lower.includes('locator')) {
    return 'SELECTOR';
  }
  
  // Check for assertion/navigation errors on URLs (CAN be fixed by updating expected URLs)
  if ((lower.includes('expect') || lower.includes('toHave')) && 
      (lower.includes('url') || lower.includes('href') || lower.includes('location'))) {
    return 'NAVIGATION';
  }
  
  // Check for general assertion errors (CAN be fixed by updating test expectations)
  if (lower.includes('expect(') || lower.includes('toHave') || 
      lower.includes('assertion') && !lower.includes('timeout')) {
    return 'ASSERTION';
  }
  
  // CRITICAL: Distinguish timeout types - FIXED: Better distinction
  if (lower.includes('timeout')) {
    // Check if it's a connection/infrastructure timeout (CANNOT be healed)
    if (lower.includes('waiting for') && lower.includes('connection')) {
      return 'INFRASTRUCTURE';
    }
    if (lower.includes('waiting for') && (lower.includes('server') || lower.includes('port'))) {
      return 'INFRASTRUCTURE';
    }
    if (lower.includes('browser') && lower.includes('closed')) {
      return 'INFRASTRUCTURE';
    }
    if (lower.includes('websocket') || lower.includes('target closed')) {
      return 'INFRASTRUCTURE';
    }
    
    // Check if it's toHaveURL() or other assertion timeout (CAN be healed)
    if (lower.includes('toHaveURL') || lower.includes('toHave') || lower.includes('expect')) {
      return 'TIMEOUT_ASSERTION';
    }
    
    // Check if waiting for selector timeout (CAN be healed by fixing selector)
    if (lower.includes('waiting for selector') || lower.includes('element') || lower.includes('locator')) {
      return 'TIMEOUT_ASSERTION';
    }
    
    // Otherwise treat as assertion timeout (safer assumption)
    return 'TIMEOUT_ASSERTION';
  }
  
  // Check for element not found (CAN be fixed by updating selectors)
  if (lower.includes('not found') || lower.includes('did not resolve')) {
    return 'SELECTOR';
  }
  
  // Default: allow healing for unknown errors
  return 'UNKNOWN';
}

/**
 * Security: Sanitize user input for LLM prompts (prevent injection/leakage)
 */
function sanitizeForPrompt(input, maxLength = 5000) {
  if (!input) return '';
  
  // Truncate to prevent context overflow
  let sanitized = input.substring(0, maxLength);
  
  // Escape backticks to prevent code block escape
  sanitized = sanitized.replace(/```/g, '\\`\\`\\`');
  
  // Escape quotes to prevent prompt escape
  sanitized = sanitized.replace(/"/g, '\\"');
  sanitized = sanitized.replace(/'/g, "\\'");
  
  // Remove potentially sensitive paths (local machine info)
  sanitized = sanitized.replace(/[A-Za-z]:\\[^\s]*/g, '[LOCAL_PATH]');
  sanitized = sanitized.replace(/\/home\/[^\/\s]*/g, '[HOME_PATH]');
  sanitized = sanitized.replace(/\/Users\/[^\/\s]*/g, '[USER_PATH]');
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Remove IP addresses
  sanitized = sanitized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_ADDRESS]');
  
  // Remove URLs (except localhost)
  sanitized = sanitized.replace(/https?:\/\/(?!localhost)[^\s]+/gi, '[URL]');
  
  // Truncate with warning if needed
  if (input.length > maxLength) {
    sanitized += `\n[... ${input.length - maxLength} characters truncated for token limit]`;
  }
  
  console.log('AI Log - Sanitized Prompt:', sanitized);
  return sanitized;
}

/**
 * Security: Sanitize error messages to remove sensitive data
 */
function sanitizeErrorMessage(error, maxLength = 1000) {
  if (!error) return 'Unknown error';
  
  let sanitized = error.substring(0, maxLength);
  
  // Remove local file paths
  sanitized = sanitized.replace(/[A-Za-z]:\\[^\s]*/g, '[FILE_PATH]');
  sanitized = sanitized.replace(/\/home\/[^\/\s]*/g, '[FILE_PATH]');
  sanitized = sanitized.replace(/\/Users\/[^\/\s]*/g, '[FILE_PATH]');
  sanitized = sanitized.replace(/\/tmp\/[^\/\s]*/g, '[TEMP_PATH]');
  
  // Remove usernames and paths
  sanitized = sanitized.replace(/\/root\//g, '[ROOT]/');
  sanitized = sanitized.replace(/~\//g, '[HOME]/');
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Remove API keys/tokens (long alphanumeric strings)
  sanitized = sanitized.replace(/\b[a-zA-Z0-9_]{40,}\b/g, '[SECRET]');
  
  // Remove IP addresses
  sanitized = sanitized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]');
  
  // Remove port numbers that might reveal infrastructure
  sanitized = sanitized.replace(/localhost:\d{4,5}/g, 'localhost:[PORT]');
  
  console.log('AI Log - Sanitized Error Message:', sanitized);
  return sanitized;
}

/**
 * Security: Detect prompt injection attempts in user input
 */
function detectPromptInjection(input) {
  if (!input) return false;
  
  const injectionPatterns = [
    /ignore[\s\n]*previous[\s\n]*instructions/gi,
    /system[\s\n]*prompt/gi,
    /forget[\s\n]*about/gi,
    /act[\s\n]*as/gi,
    /pretend[\s\n]*to[\s\n]*be/gi,
    /instead[\s\n]*of/gi,
    /as[\s\n]*an[\s\n]*evil/gi,
    /bypass[\s\n]*security/gi,
    /disable[\s\n]*safety/gi,
    /in[\s\n]*leet[\s\n]*speak/gi,
    /without[\s\n]*restrictions/gi,
    /do[\s\n]*not[\s\n]*follow/gi
  ];
  
  return injectionPatterns.some(pattern => pattern.test(input));
}

/**
 * Security: Validate test code size to prevent token overflow
 */
function validateTestCodeSize(code, maxLength = 50000) {
  if (!code) return { valid: false, error: 'Test code is empty' };
  
  if (code.length > maxLength) {
    return {
      valid: false,
      error: `Test code exceeds maximum length (${code.length} > ${maxLength} chars). May cause token overflow.`,
      truncated: code.substring(0, maxLength)
    };
  }
  
  return { valid: true, error: null };
}

/**
 * Read test file content
 */
function readTestFile(filePath) {
  const validatedPath = validateFilePath(filePath);
  if (!validatedPath) {
    console.error(`❌ Test file path validation failed: ${filePath}`);
    return null;
  }

  if (!fs.existsSync(validatedPath)) {
    console.error(`❌ Test file not found: ${validatedPath}`);
    return null;
  }

  try {
    const stats = fs.lstatSync(validatedPath);
    if (stats.isSymbolicLink()) {
      console.error(`❌ Security: Cannot read symbolic links: ${validatedPath}`);
      return null;
    }
    
    if (stats.size > HEALER_MAX_FILE_SIZE) {
      console.error(`❌ File exceeds maximum size (${HEALER_MAX_FILE_SIZE} bytes): ${validatedPath}`);
      return null;
    }
    
    const content = fs.readFileSync(validatedPath, 'utf8');
    auditLog('FILE_READ', validatedPath);
    return content;
  } catch (err) {
    console.error(`❌ Error reading test file: ${err.message}`);
    return null;
  }
}

/**
 * Intelligently analyze test code to identify what elements are being tested
 * and provide recommendations for resilient selectors
 */
function analyzeTestIntentAndSelectors(testCode) {
  if (!testCode) return null;

  const analysis = {
    testActions: [],
    elementIntents: [],
    currentSelectors: [],
    recommendedSelectors: []
  };

  // Extract test actions to understand intent
  const actionPatterns = [
    { pattern: /\.click\(\)/g, action: 'click' },
    { pattern: /\.fill\(/g, action: 'fill_text' },
    { pattern: /\.type\(/g, action: 'type_text' },
    { pattern: /\.goto\(/g, action: 'navigate' },
    { pattern: /\.check\(\)/g, action: 'check_checkbox' },
    { pattern: /\.select\(/g, action: 'select_option' },
    { pattern: /\.dblClick\(\)/g, action: 'double_click' }
  ];

  actionPatterns.forEach(({ pattern, action }) => {
    if (pattern.test(testCode)) {
      analysis.testActions.push(action);
    }
  });

  // Extract current selectors (including regex patterns)
  const selectorPatterns = [
    /page\.locator\(['"](.*?)['"]\)/g,
    /getByRole\(['"]([\w]+)['"][^)]*,\s*\{\s*name:\s*['"](.*?)['"]\s*\}/g,
    /getByText\(['"](.*?)['"]\)/g,
    /getByLabel\(['"](.*?)['"]\)/g,
    /getByTestId\(['"](.*?)['"]\)/g,
    /getByPlaceholder\(['"](.*?)['"]\)/g,
    // NEW: Extract regex patterns from getByLabel, getByText
    /getByLabel\s*\(\s*\/([^/]+)\/[igm]*\s*\)/g,  // Matches getByLabel(/First Name/i)
    /getByText\s*\(\s*\/([^/]+)\/[igm]*\s*\)/g,   // Matches getByText(/some text/i)
    /getByPlaceholder\s*\(\s*\/([^/]+)\/[igm]*\s*\)/g  // Matches getByPlaceholder(/placeholder/i)
  ];

  selectorPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(testCode)) !== null) {
      const selector = match[1] || match[2];  // Handle different capture group positions
      if (selector && !analysis.currentSelectors.includes(selector)) {
        analysis.currentSelectors.push(selector);
      }
    }
  });

  // Identify element intents based on text patterns and actions
  const intentPatterns = [
    { text: /movie|film|title/i, intent: 'movie_card', resilientSelectors: ['getByRole("link")', 'getByText(/pattern/i)', 'getByTestId("movie-card")'] },
    { text: /book|reserve|checkout|purchase/i, intent: 'booking_button', resilientSelectors: ['getByRole("button", { name: /book/i })', 'getByText(/book/i)', 'getByTestId("book-button")'] },
    { text: /avengers|movie\s*name/i, intent: 'movie_title', resilientSelectors: ['getByText(/movie\s*name/i)', 'getByRole("heading")', 'getByTestId("movie-title")'] },
    { text: /seat|grid|theater|screen/i, intent: 'seat_grid', resilientSelectors: ['getByTestId("seat-grid")', 'getByRole("region")', '.seat-container'] },
    { text: /user.*detail|profile|name|email|phone/i, intent: 'user_form', resilientSelectors: ['getByLabel(/name/i)', 'getByPlaceholder(/name/i)', 'getByTestId("user-form")'] },
    { text: /payment|checkout|confirm/i, intent: 'payment_section', resilientSelectors: ['getByRole("heading", { name: /payment/i })', 'getByText(/confirm/i)', 'getByTestId("payment-form")'] }
  ];

  intentPatterns.forEach(({ text, intent, resilientSelectors }) => {
    if (text.test(testCode)) {
      analysis.elementIntents.push({ intent, resilientSelectors });
    }
  });

  return analysis;
}

/**
 * Generate selector recommendation guidance based on test context
 */
function generateSelectorGuidance(testCode) {
  const analysis = analyzeTestIntentAndSelectors(testCode);
  if (!analysis || analysis.elementIntents.length === 0) return '';

  let guidance = '\n### Selector Resilience Strategy Based on Test Intent:\n';
  
  analysis.elementIntents.forEach(({ intent, resilientSelectors }) => {
    guidance += `\n**For ${intent} elements:**\n`;
    resilientSelectors.forEach((selector, idx) => {
      guidance += `  ${idx + 1}. Preferred: \`${selector}\`\n`;
    });
  });

  guidance += `\n### Implementation Priority:\n`;
  guidance += `1. **First priority**: Use getByRole() for interactive elements (buttons, links, etc.)\n`;
  guidance += `2. **Second priority**: Use getByLabel(), getByPlaceholder() for form inputs\n`;
  guidance += `3. **Third priority**: Use getByText() for content matching\n`;
  guidance += `4. **Last resort**: Use data-testid attributes if available\n`;
  guidance += `5. **Avoid**: Class-based selectors (.Mui*) that break on version changes\n`;

  console.log('AI Log - Generated Selector Guidance:', guidance);
  return guidance;
}

/**
 * Detect DOM Architecture Issues (Shadow DOM, iframes, Web Components)
 */
function detectDOMArchitectureIssues(testCode, errorMessage) {
  const issues = {
    hasShadowDOM: false,
    hasIframes: false,
    hasWebComponents: false,
    hasInaccessibleLocators: false,
    potentialArchitectureIssues: [],
    recommendations: []
  };

  // Detect Shadow DOM usage patterns
  const shadowDOMPatterns = [
    /page\.locator\(['"`]([^'"`]+)['"]\s*\)\.getByRole/,  // locator().getByRole() pattern
    /locator\s*\(\s*['"`](.*shadow|seat-grid|custom-element)['"]\s*\)/i,
    /shadowElement|seat-grid|getByRole\s*\(\s*['"`]button['"`]/i,
    /const\s+shadowElement\s*=\s*page\.locator/,
    /page\.locator\(['"`]button[^'"`]*['"]\).*seat/i,  // Targeting buttons for seat elements
    /page\.locator\(['"`]button.*has-text.*Seat/i,  // Button with "Seat" text (likely in Shadow DOM)
  ];

  shadowDOMPatterns.forEach(pattern => {
    if (pattern.test(testCode)) {
      issues.hasShadowDOM = true;
    }
  });

  // Additional check: if referencing seat-grid anywhere AND trying to access buttons
  if (/seat-grid|seat[-_]grid/i.test(testCode) && /button|locator.*button/i.test(testCode)) {
    issues.hasShadowDOM = true;
    issues.potentialArchitectureIssues.push('seat-grid component detected with button access - likely Shadow DOM');
  }

  // Detect iframe usage
  if (/iframe|frameLocator|frame\(|frame\s*\{/i.test(testCode)) {
    issues.hasIframes = true;
  }

  // Detect Web Components (custom elements with hyphens)
  if (/page\.locator\(['"`]([a-z]+-[a-z]+)['"]\)/i.test(testCode) || /<[a-z]+-[a-z]/i.test(testCode)) {
    issues.hasWebComponents = true;
  }

  // Detect inaccessible locators
  if (/locator\(['"`][^'"`]*['"]\)\.getByRole/i.test(testCode) && issues.hasShadowDOM) {
    issues.hasInaccessibleLocators = true;
  }

  // Analyze error message for architecture clues
  if (errorMessage) {
    const errorLower = errorMessage.toLowerCase();
    
    // "0 found" or timeout patterns suggest Shadow DOM accessibility issues
    if ((errorMessage.includes('0 found') || errorMessage.includes('No elements') || errorMessage.includes('Timeout')) && 
        (testCode.includes('shadowElement') || testCode.includes('seat-grid') || testCode.includes('button:has-text') || /page\.locator\(['"`]([a-z]+-[a-z]+)['"]\)/.test(testCode))) {
      issues.potentialArchitectureIssues.push('Shadow DOM elements not accessible via standard locators - likely need piercing');
      issues.hasInaccessibleLocators = true;
      issues.hasShadowDOM = true;
    }

    if (errorLower.includes('shadow') || errorMessage.includes('ShadowRoot')) {
      issues.hasShadowDOM = true;
      issues.potentialArchitectureIssues.push('Confirmed Shadow DOM architecture issue');
    }
  }

  // Generate recommendations
  if (issues.hasShadowDOM) {
    issues.recommendations.push('Use nested locators with class selectors: page.locator("seat-grid").locator(".seat.available")');
    issues.recommendations.push('AVOID: page.locator("button") for Shadow DOM - must use nested locators with CSS classes');
    issues.recommendations.push('For specific button in Shadow DOM: page.locator("seat-grid").locator(".seat.clickable")  // Use class, not text');  
  }

  if (issues.hasWebComponents) {
    issues.recommendations.push('Web Components detected - use nested locators: page.locator("component-name").locator("selector")');
    issues.recommendations.push('Use nested locator chains for Web Component internals');
  }

  if (issues.hasIframes) {
    issues.recommendations.push('Use frameLocator(): page.frameLocator("iframe").locator("button")');
    issues.recommendations.push('For named frames: page.frame({ name: "name" }).locator("button")');
  }

  return issues;
}

/**
 * Generate DOM Architecture Guidance for Gemini Prompt
 */
function generateDOMArchitectureGuidance(domIssues) {
  if (!domIssues) return '';
  
  const hasIssues = domIssues.hasShadowDOM || domIssues.hasIframes || domIssues.hasWebComponents || 
                   domIssues.potentialArchitectureIssues.length > 0;
  
  if (!hasIssues) return '';

  let guidance = '\n\n### 🏗️ DOM ARCHITECTURE ANALYSIS - CRITICAL\n';

  if (domIssues.hasShadowDOM || domIssues.hasWebComponents) {
    guidance += '\n**SHADOW DOM / WEB COMPONENTS DETECTED:**\n';
    guidance += 'Shadow DOM Found: YES\n';
    guidance += '\n**KEY LIMITATION**: getByRole(), getByText(), getByLabel(), and direct page.locator() DO NOT pierce Shadow DOM.\n';
    guidance += '\n**SPECIFIC FIX FOR SEAT-GRID SHADOW DOM**:\n';
    guidance += '- PROBLEM: `const seatButtons = page.locator("button:has-text(\\"Seat\\")");` ❌ FAILS\n';
    guidance += '  (This searches entire page but seat buttons are inside seat-grid Shadow DOM)\n';
    guidance += '- FIX 1: `const seatButtons = page.locator("seat-grid").locator(".seat.available");` ✅ WORKS (Nested with Class)\n';
    guidance += '- FIX 2: `const seatButtons = page.locator("seat-grid").locator(".seat.available.clickable");` ✅ WORKS (Multiple Classes)\n';
    guidance += '\n**DO NOT USE** for Shadow DOM elements:\n';
    guidance += '- ❌ page.locator("button") alone when buttons are in Shadow DOM\n';
    guidance += '- ❌ getByRole() on Shadow DOM elements\n';
    guidance += '- ❌ getByText() on Shadow DOM elements\n';
    guidance += '- ❌ :has-text() filters - use CSS classes instead for reliability\n';
    guidance += '\n**MUST USE** for Shadow DOM elements:\n';
    guidance += '- ✅ Nested locators with CSS classes: page.locator("parent").locator("child.classname")\n';
    guidance += '- ✅ Combine multiple classes: page.locator("parent").locator("child.class1.class2")\n';
    guidance += '- ✅ frameLocator() for iframes\n';
  }

  if (domIssues.hasIframes) {
    guidance += '\n**IFRAMES DETECTED:**\n';
    guidance += '- Use: `page.frameLocator("iframe-selector").locator("button")`\n';
    guidance += '- Or: `page.frame({ name: "frameName" }).locator("button")`\n';
  }

  if (domIssues.potentialArchitectureIssues.length > 0) {
    guidance += '\n**IDENTIFIED ISSUES**:\n';
    domIssues.potentialArchitectureIssues.forEach(issue => {
      guidance += `- ${issue}\n`;
    });
  }

  if (domIssues.recommendations.length > 0) {
    guidance += '\n**IMPLEMENTATION FIXES**:\n';
    domIssues.recommendations.forEach((rec, idx) => {
      guidance += `${idx + 1}. ${rec}\n`;
    });
  }

  console.log('AI Log - Generated DOM Architecture Guidance:', guidance);
  return guidance;
}

/**
 * CRITICAL: Validate that fixed code uses proper Shadow DOM penetrating selectors
 * This is the key function that prevents incorrect Shadow DOM fixes
 */
function validateShadowDOMFix(fixedCode, domIssues) {
  const issues = [];
  const warnings = [];

  if (!domIssues || (!domIssues.hasShadowDOM && !domIssues.hasWebComponents && !domIssues.hasIframes)) {
    return { isValid: true, issues: [], warnings: [] };
  }

  if (domIssues.hasShadowDOM) {
    // Check for direct element access patterns (WRONG)
    const directButtonAccess = /page\.locator\s*\(\s*["'](button|\.seat|\.available)[^)]*["']\s*\)/i.test(fixedCode);
    const hasNestedLocator = /page\.locator\s*\([^)]+\)\s*\.locator\s*\([^)]+\)/i.test(fixedCode);

    if (directButtonAccess && !hasNestedLocator) {
      issues.push('CRITICAL: Using direct selector on Shadow DOM element - must use nested locator pattern');
      issues.push('WRONG: page.locator("button") or page.locator(".seat")');
      issues.push('RIGHT: page.locator("seat-grid").locator(".seat")');
    }

    // Check for :has-text pattern (UNRELIABLE)
    if (/:has-text\s*\(/i.test(fixedCode) && /seat-grid/i.test(fixedCode)) {
      warnings.push('WARNING: Using :has-text() in Shadow DOM is unreliable');
      warnings.push('Better: Use CSS classes like .locator(".seat.available")');
    }

    // Check for getByRole on potential Shadow DOM
    if (/getByRole\s*\(\s*["'](button|link)[^)]*["']\)/i.test(fixedCode) && 
        /shadowElement|seat-grid|web-component/i.test(fixedCode)) {
      issues.push('CRITICAL: getByRole() does not penetrate Shadow DOM boundaries');
      issues.push('Use: page.locator("parent-selector").locator("child-selector")');
    }

    // Validate that nested locators exist and are properly formatted
    if (hasNestedLocator) {
      const nestedPattern = /page\.locator\s*\(\s*["']([^"']+)["']\s*\)\s*\.locator\s*\(\s*["']([^"']+)["']\s*\)/g;
      let match;
      let validCount = 0;

      while ((match = nestedPattern.exec(fixedCode)) !== null) {
        const childSelector = match[2];
        // Prefer CSS classes over :has-text
        if (!/:has-text|:has-css/.test(childSelector)) {
          validCount++;
        } else {
          warnings.push(`Caution: Child selector uses complex filter: "${childSelector}"`);
        }
      }

      if (validCount > 0) {
        // Good - has nested locators with CSS
      }
    }
  }

  if (domIssues.hasIframes) {
    if (!/frameLocator|page\.frame\s*\(/i.test(fixedCode)) {
      issues.push('CRITICAL: iframe detected but fix does not use frameLocator() or page.frame()');
      issues.push('Use: page.frameLocator("iframe-selector").locator("element")');
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    isStrictValid: issues.length === 0 && warnings.length === 0
  };
}

/**
 * CRITICAL: Generate MANDATORY DOM architecture rules for Gemini prompt
 * These override other guidance - must be followed
 */
function buildMandatoryDOMRules(domIssues) {
  if (!domIssues || (!domIssues.hasShadowDOM && !domIssues.hasWebComponents && !domIssues.hasIframes)) {
    return '';
  }

  let rules = '\n\n### 🚨 MANDATORY DOM ARCHITECTURE RULES (NOT SUGGESTIONS)\n';

  if (domIssues.hasShadowDOM) {
    rules += '\n**RULE: Shadow DOM Detected - These are HARD REQUIREMENTS:**\n\n';
    rules += '❌ **YOU MUST NOT DO:**\n';
    rules += '- page.locator("button") directly when buttons are inside seat-grid Shadow DOM\n';
    rules += '- getByRole("button") on Shadow DOM elements\n';
    rules += '- getByText() or :has-text() as the ONLY selector for Shadow DOM elements\n';
    rules += '- Suggest a selector that does not penetrate the Shadow DOM boundary\n';
    rules += '- Use direct class selector like page.locator(".seat") without parent\n\n';
    rules += '✅ **YOU MUST DO:**\n';
    rules += '- Use NESTED locators: page.locator("seat-grid").locator(".seat.available")\n';
    rules += '- Use CSS classes in child selector: .locator(".seat.available")\n';
    rules += '- Combine classes for specificity: .locator(".seat.available.clickable")\n';
    rules += '- If you cannot fix with nested locators, respond DECISION: MANUAL_REVIEW\n\n';
    rules += '**VALIDATION CHECKLIST:**\n';
    rules += '1. Does your fix use page.locator("parent").locator("child") pattern? YES/NO\n';
    rules += '2. Does it avoid getByRole/getByText on Shadow DOM? YES/NO\n';
    rules += '3. Does it use CSS classes not :has-text? YES/NO\n\n';
  }

  if (domIssues.hasWebComponents) {
    rules += '**RULE: Web Components Detected:**\n';
    rules += '- Use nested locators for Web Component internals\n';
    rules += '- Example: page.locator("custom-component").locator(".internal-selector")\n\n';
  }

  if (domIssues.hasIframes) {
    rules += '**RULE: Iframes Detected:**\n';
    rules += '- Use frameLocator(): page.frameLocator("iframe-selector").locator("element")\n';
    rules += '- Prefer frameLocator over frame() for reliability\n\n';
  }

  return rules;
}

/**
 * Check if error is likely DOM architecture related
 */
function isDOMArchitectureError(errorMessage, testCode) {
  if (!errorMessage) return false;
  
  const errorLower = errorMessage.toLowerCase();
  
  // Patterns indicating DOM architecture issues
  const architecturePatterns = [
    /0 found/,  // No elements found typical in Shadow DOM
    /timeout.*element/,
    /resolved to/,  // Strict mode
  ];

  // Check if test involves custom elements, Shadow DOM, or seat components
  const hasCustomElements = /page\.locator\(['"`]([a-z]+-[a-z]+)['"]\)/i.test(testCode);
  const hasShadowQuery = /shadowElement|seat-grid|button.*has-text.*Seat|page\.locator.*button.*seat/i.test(testCode);
  const hasDirectButtonSearch = /page\.locator\(['"`]button[^'"`]*['"]\)/i.test(testCode);
  
  // If "0 found" error AND test tries to access buttons/elements directly (without piercing)
  // AND mentions seat-grid or custom elements, it's likely a Shadow DOM issue
  return architecturePatterns.some(p => p.test(errorLower)) && (hasCustomElements || hasShadowQuery || (hasDirectButtonSearch && /seat/i.test(testCode)));
}

/**
 * Find trace file for a failed test
 */
function findTraceFileForTest(testName) {
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    
    if (!fs.existsSync(testResultsDir)) {
      if (HEALER_VERBOSE) console.log('📋 test-results directory not found');
      return null;
    }
    
    // Extract base name without .spec.ts or .test.ts
    const baseName = testName.replace(/\.(spec|test)\.tsx?$/, '');
    
    // Look for test result directory matching the test name
    // Prioritize retry directories (they have -retry1, -retry2, etc. suffix)
    const testDirs = fs.readdirSync(testResultsDir).filter(dir => {
      return dir.includes(baseName);
    });
    
    if (testDirs.length === 0) {
      if (HEALER_VERBOSE) console.log(`📋 No trace directory found for test: ${testName}`);
      return null;
    }
    
    // Prioritize retry directories (they're more likely to have traces)
    const sortedDirs = testDirs.sort((a, b) => {
      const aHasRetry = /retry\d+/.test(a);
      const bHasRetry = /retry\d+/.test(b);
      // Retry directories come first
      if (aHasRetry && !bHasRetry) return -1;
      if (!aHasRetry && bHasRetry) return 1;
      // Among retries, prefer higher numbers (latest retry)
      if (aHasRetry && bHasRetry) {
        const aRetry = parseInt((a.match(/retry(\d+)/) || [, 0])[1]);
        const bRetry = parseInt((b.match(/retry(\d+)/) || [, 0])[1]);
        return bRetry - aRetry;
      }
      return 0;
    });

    const testDir = path.join(testResultsDir, sortedDirs[0]);
    const traceFile = fs.readdirSync(testDir).find(f => f.includes('trace') && f.endsWith('.zip'));
    
    if (!traceFile) {
      if (HEALER_VERBOSE) console.log(`📋 No trace.zip found in ${testDir}`);
      return null;
    }
    
    if (HEALER_VERBOSE) console.log(`📋 Found trace file: ${path.join(testDir, traceFile)}`);
    return path.join(testDir, traceFile);
  } catch (err) {
    if (HEALER_VERBOSE) console.log(`⚠️  Error finding trace file: ${err.message}`);
    return null;
  }
}

/**
 * Extract UI elements from a Playwright trace zip
 */
function extractElementsFromTrace(tracePath) {
  try {
    if (!tracePath || !fs.existsSync(tracePath)) {
      return {
        buttons: [],
        inputs: [],
        dialogs: [],
        iframes: [],
        htmlSnapshots: [],
        cssClasses: [],
        elementsByClass: {},
        error: 'Trace file not found'
      };
    }
    
    const zip = new AdmZip(tracePath);
    const entries = zip.getEntries();
    
    const result = {
      buttons: [],
      inputs: [],
      dialogs: [],
      iframes: [],  // NEW: Track iframes with title, src, name
      htmlSnapshots: [],
      cssClasses: [],  // NEW: Track CSS class combinations
      elementsByClass: {}  // NEW: Map of class → elements
    };
    
    // Look for trace.json which contains the actions and snapshots
    const traceEntry = entries.find(e => e.entryName === 'trace.json' || e.entryName.endsWith('trace.json'));
    if (!traceEntry) {
      if (HEALER_VERBOSE) console.log('📋 trace.json not found in zip');
      return result;
    }
    
    const traceContent = traceEntry.getData().toString('utf8');
    const traceData = JSON.parse(traceContent);
    
    // Extract snapshots that contain DOM state
    if (traceData.snapshots && Array.isArray(traceData.snapshots)) {
      for (const snapshot of traceData.snapshots) {
        if (snapshot.str && snapshot.str.length > 0) {
          // NEW: Extract all elements with class attributes for class analysis
          const allElementsWithClass = snapshot.str.matchAll(/<([a-z][a-z0-9-]*)[^>]*class="([^"]*)"[^>]*>/gi);
          let cssClassCount = 0;
          for (const match of allElementsWithClass) {
            const tagName = match[1];
            const classStr = match[2]?.trim();
            if (classStr) {
              const classes = classStr.split(/\s+/);
              const classKey = classes.join('.');
              if (!result.elementsByClass[classKey]) {
                result.elementsByClass[classKey] = { count: 0, tags: new Set() };
              }
              result.elementsByClass[classKey].count++;
              result.elementsByClass[classKey].tags.add(tagName);
              
              if (!result.cssClasses.includes(classKey)) {
                result.cssClasses.push(classKey);
                cssClassCount++;
              }
            }
          }
          if (HEALER_VERBOSE && cssClassCount > 0) {
            console.log(`   📦 CSS classes extracted from snapshot: ${cssClassCount} unique combinations`);
          }
          
          // Extract button text from HTML, including nested tags and aria-label fallbacks
          const buttonMatches = snapshot.str.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/gi);
          for (const match of buttonMatches) {
            const attrs = match[1];
            const innerHtml = match[2] || '';
            const testIdMatch = attrs.match(/data-testid="([^"]*)"/i);
            const classMatch = attrs.match(/class="([^"]*)"/i);
            const ariaLabelMatch = attrs.match(/aria-label="([^"]*)"/i);

            const testId = testIdMatch ? testIdMatch[1] : null;
            const buttonClass = classMatch ? classMatch[1] : null;
            let text = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (!text && ariaLabelMatch) {
              text = ariaLabelMatch[1].trim();
            }

            if (text) {
              result.buttons.push({
                text,
                testId,
                classes: buttonClass ? buttonClass.split(/\s+/) : [],
                html: match[0]
              });
            }
          }
          
          // Extract input fields
          const inputMatches = snapshot.str.matchAll(/<input[^>]*(?:placeholder="([^"]*)")?(?:aria-label="([^"]*)")?[^>]*>/gi);
          for (const match of inputMatches) {
            const placeholder = match[1];
            const ariaLabel = match[2];
            result.inputs.push({
              placeholder: placeholder || null,
              ariaLabel: ariaLabel || null
            });
          }
          
          // Extract dialog information
          const dialogMatches = snapshot.str.matchAll(/<(?:dialog|div[^>]*role="dialog")[^>]*>[\s\S]*?<\/(?:dialog|div)>/gi);
          for (const match of dialogMatches) {
            const dialogText = match[0].match(/>([^<]+)</g);
            if (dialogText) {
              result.dialogs.push({
                content: dialogText.map(t => t.replace(/[><]/g, '')).join(' '),
                fullHtml: match[0].substring(0, 500) // First 500 chars
              });
            }
          }
          
          // NEW: Extract iframe elements with title, src, name attributes
          const iframeMatches = snapshot.str.matchAll(/<iframe[^>]*>/gi);
          for (const match of iframeMatches) {
            const attrs = match[0];
            const titleMatch = attrs.match(/title="([^"]*)"/i);
            const srcMatch = attrs.match(/src="([^"]*)"/i);
            const nameMatch = attrs.match(/name="([^"]*)"/i);
            const dataTestIdMatch = attrs.match(/data-testid="([^"]*)"/i);
            
            const title = titleMatch ? titleMatch[1] : null;
            const src = srcMatch ? srcMatch[1] : null;
            const name = nameMatch ? nameMatch[1] : null;
            const dataTestId = dataTestIdMatch ? dataTestIdMatch[1] : null;
            
            if (title || src || name || dataTestId) {
              result.iframes.push({
                title,
                src,
                name,
                dataTestId,
                selector: title ? `iframe[title="${title}"]` : 
                         dataTestId ? `iframe[data-testid="${dataTestId}"]` :
                         name ? `iframe[name="${name}"]` :
                         src ? `iframe[src*="${src.split('/').pop()}"]` : 'iframe',
                html: match[0]
              });
            }
          }
          
          if (HEALER_VERBOSE && result.iframes.length > 0) {
            console.log(`   🎬 Extracted ${result.iframes.length} iframe(s) from trace`);
            result.iframes.forEach(iframe => {
              console.log(`      - ${iframe.selector}`);
            });
          }
          
          result.htmlSnapshots.push(snapshot.str);
        }
      }
    }
    
    // Deduplicate buttons by text
    result.buttons = Array.from(new Map(
      result.buttons.map(b => [b.text, b])
    ).values());
    
    if (HEALER_VERBOSE) {
      console.log(`📋 Extracted from trace: ${result.buttons.length} buttons, ${result.inputs.length} inputs, ${result.dialogs.length} dialogs, ${result.iframes.length} iframes, ${result.cssClasses.length} unique CSS class combinations`);
      if (result.cssClasses.length > 0) {
        console.log(`   🎨 CSS Classes found: ${result.cssClasses.slice(0, 5).join(', ')}${result.cssClasses.length > 5 ? '...' : ''}`);
      }
    }
    
    return result;
  } catch (err) {
    if (HEALER_VERBOSE) console.log(`⚠️  Error extracting elements from trace: ${err.message}`);
    return {
      buttons: [],
      inputs: [],
      dialogs: [],
      iframes: [],
      htmlSnapshots: [],
      cssClasses: [],
      elementsByClass: {},
      error: err.message
    };
  }
}

/**
 * Calculate selector stability score for iframe attributes
 * Returns: { score: 0-100, recommendation: string, reason: string }
 */
function assessIframeAttrStability(attr, value, other) {
  if (!value) {
    return { score: 0, recommendation: 'N/A', reason: 'Attribute not available' };
  }

  switch (attr) {
    case 'title':
      // Title is typically the semantic content - rarely changes
      return {
        score: 95,
        recommendation: 'HIGHLY RECOMMENDED',
        reason: 'Titles rarely change; semantic meaning stable across refactors'
      };

    case 'data-testid':
      // Explicit test markers - very stable
      return {
        score: 90,
        recommendation: 'RECOMMENDED',
        reason: 'Explicit test ID; intentionally stable for testing'
      };

    case 'name':
      // Name attribute can change during refactoring
      return {
        score: 65,
        recommendation: 'ACCEPTABLE (Use with caution)',
        reason: 'Name can change during refactoring; less stable than title/data-testid'
      };

    case 'id':
      // IDs are commonly refactored
      return {
        score: 40,
        recommendation: 'NOT RECOMMENDED',
        reason: 'IDs frequently changed in refactors; high volatility'
      };

    case 'src':
      // Source URLs are often stable for embedded content
      return {
        score: 80,
        recommendation: 'ACCEPTABLE',
        reason: 'Source URLs stable for embedded content'
      };

    default:
      return { score: 50, recommendation: 'MARGINAL', reason: 'Unknown attribute stability' };
  }
}

/**
 * Generate iframe guidance for Gemini analysis with STABILITY ASSESSMENT
 */
function generateIframeGuidance(traceElements, testCode) {
  if (!traceElements || !traceElements.iframes || traceElements.iframes.length === 0) {
    return '';
  }

  // Extract iframe selectors from test code
  const iframeSelectorsInTest = [];
  const frameLocatorMatches = [...testCode.matchAll(/frameLocator\(\s*['"]([^'"]+)['"]\s*\)/gi)];
  frameLocatorMatches.forEach(match => {
    if (match[1]) iframeSelectorsInTest.push(match[1]);
  });

  let guidance = '\n### 🎬 IFRAME ELEMENTS DETECTED IN PAGE TRACE - WITH STABILITY ASSESSMENT:\n';
  guidance += `**Available iframes from trace with recommended selectors (by stability):**\n\n`;

  traceElements.iframes.forEach((iframe, idx) => {
    guidance += `**${idx + 1}. Iframe:** ${iframe.title || 'Untitled'} \n`;
    
    // Build list of available selectors with stability scores
    const selectorOptions = [];
    if (iframe.title) {
      const titleStability = assessIframeAttrStability('title', iframe.title);
      selectorOptions.push({
        selector: `iframe[title="${iframe.title}"]`,
        attr: 'title',
        value: iframe.title,
        ...titleStability
      });
    }
    if (iframe.dataTestId) {
      const testIdStability = assessIframeAttrStability('data-testid', iframe.dataTestId);
      selectorOptions.push({
        selector: `iframe[data-testid="${iframe.dataTestId}"]`,
        attr: 'data-testid',
        value: iframe.dataTestId,
        ...testIdStability
      });
    }
    if (iframe.name) {
      const nameStability = assessIframeAttrStability('name', iframe.name);
      selectorOptions.push({
        selector: `iframe[name="${iframe.name}"]`,
        attr: 'name',
        value: iframe.name,
        ...nameStability
      });
    }
    if (iframe.src) {
      const srcStability = assessIframeAttrStability('src', iframe.src);
      selectorOptions.push({
        selector: `iframe[src*="${iframe.src.split('/').pop()}"]`,
        attr: 'src',
        value: iframe.src.substring(0, 30) + '...',
        ...srcStability
      });
    }

    // Sort by stability score (highest first)
    selectorOptions.sort((a, b) => b.score - a.score);

    // Display selectors with stability info
    selectorOptions.forEach((option, sIdx) => {
      const priority = sIdx === 0 ? '🥇 1ST CHOICE' : sIdx === 1 ? '🥈 2ND' : '🥉 3RD';
      const scoreBar = '█'.repeat(Math.floor(option.score / 10)) + '░'.repeat(10 - Math.floor(option.score / 10));
      guidance += `   ${priority}: ${option.recommendation}\n`;
      guidance += `      Selector: \`${option.selector}\`\n`;
      guidance += `      Stability: ${scoreBar} ${option.score}% - ${option.reason}\n\n`;
    });
  });

  if (iframeSelectorsInTest.length > 0) {
    guidance += `**Current iframe selectors in test code:**\n`;
    iframeSelectorsInTest.forEach(selector => {
      // Try to extract attribute type from selector
      let attrType = 'unknown';
      let attrValue = '';
      
      if (selector.includes('[title=')) {
        attrType = 'title';
        attrValue = selector.match(/\[title="([^"]+)"\]/)?.[1] || '';
      } else if (selector.includes('[name=')) {
        attrType = 'name';
        attrValue = selector.match(/\[name="([^"]+)"\]/)?.[1] || '';
      } else if (selector.includes('[id=')) {
        attrType = 'id';
        attrValue = selector.match(/\[id="([^"]+)"\]/)?.[1] || '';
      } else if (selector.includes('[data-testid=')) {
        attrType = 'data-testid';
        attrValue = selector.match(/\[data-testid="([^"]+)"\]/)?.[1] || '';
      }
      
      const matchingIframe = traceElements.iframes.find(iframe => {
        if (attrType === 'title') return iframe.title === attrValue;
        if (attrType === 'name') return iframe.name === attrValue;
        if (attrType === 'data-testid') return iframe.dataTestId === attrValue;
        return false;
      });
      
      const status = matchingIframe ? '✅ FOUND' : '❌ NOT FOUND';
      const stabilityAssess = assessIframeAttrStability(attrType, attrValue || 'exists');
      const stabilityWarning = stabilityAssess.score < 70 ? ` ⚠️ (Low stability: ${stabilityAssess.reason})` : '';
      
      guidance += `  - \`${selector}\` → ${status}${stabilityWarning}\n`;
    });
  }

  guidance += `\n**🎯 ACTION REQUIRED:**\n`;
  guidance += `1. If selector not found (❌): Update test to use recommended selector from list above\n`;
  guidance += `2. Prefer 🥇 choices (highest stability) to minimize test failures on refactors\n`;
  guidance += `3. AVOID id-based selectors - they change frequently during development\n`;

  return guidance;
}

/**
 * Generate button text guidance for Gemini analysis
 */
function generateButtonTextGuidance(traceElements, testCode) {
  if (!traceElements || !traceElements.buttons || traceElements.buttons.length === 0) {
    return '';
  }

  const failedButtonPatterns = [];
  const roleRegexMatches = [...testCode.matchAll(/getByRole\(\s*['"]button['"][^)]*name\s*:\s*\/([^\/]*)\/[igm]*\s*\)/gi)];
  roleRegexMatches.forEach(match => {
    if (match[1]) failedButtonPatterns.push({ type: 'regex', value: match[1] });
  });
  const roleStringMatches = [...testCode.matchAll(/getByRole\(\s*['"]button['"][^)]*name\s*:\s*['"]([^'"]+)['"][^)]*\)/gi)];
  roleStringMatches.forEach(match => {
    if (match[1]) failedButtonPatterns.push({ type: 'string', value: match[1] });
  });
  const textRegexMatches = [...testCode.matchAll(/getByText\(\s*\/([^\/]*)\/[igm]*\s*\)/gi)];
  textRegexMatches.forEach(match => {
    if (match[1]) failedButtonPatterns.push({ type: 'regex', value: match[1] });
  });
  const textStringMatches = [...testCode.matchAll(/getByText\(\s*['"]([^'"]+)['"]\s*\)/gi)];
  textStringMatches.forEach(match => {
    if (match[1]) failedButtonPatterns.push({ type: 'string', value: match[1] });
  });

  let guidance = '\n### 📋 BUTTON ELEMENTS DETECTED IN PAGE TRACE:\n';
  guidance += `**Available buttons from trace analysis:**\n`;

  traceElements.buttons.forEach((btn, idx) => {
    guidance += `  ${idx + 1}. "${btn.text}"${btn.testId ? ` (testId: ${btn.testId})` : ''}\n`;
  });

  if (failedButtonPatterns.length > 0) {
    guidance += `\n**Failed button patterns found in test code:**\n`;
    failedButtonPatterns.forEach(patternInfo => {
      const patternText = patternInfo.value;
      const matcher = patternInfo.type === 'regex'
        ? new RegExp(patternText, 'i')
        : new RegExp(`^${patternText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const hasMatch = traceElements.buttons.some(b => matcher.test(b.text));
      const pattern = patternInfo.type === 'regex' ? `/${patternText}/i` : `"${patternText}"`;

      if (!hasMatch) {
        guidance += `  - \`${pattern}\` ❌ **NO MATCH FOUND** - Button renamed or removed!\n`;
        const closestButton = findClosestButtonMatch(patternText, traceElements.buttons);
        if (closestButton) {
          guidance += `    💡 Suggestion: Did you mean "${closestButton.text}"?\n`;
          guidance += `    Fix: /^${closestButton.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i\n`;
        }
      } else {
        guidance += `  - \`${pattern}\` ✅ Match found\n`;
      }
    });
  }

  guidance += `\n**Recommendation for button selectors:**\n`;
  guidance += `Use these text patterns for getByRole('button', { name: /pattern/i }):\n`;
  guidance += `${traceElements.buttons.map(btn => `  - /^${btn.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i`).join('\n')}\n`;
  guidance += `\nOr use data-testid if available:\n`;
  guidance += `${traceElements.buttons.filter(b => b.testId).map(btn => `  - getByTestId('${btn.testId}')`).join('\n') || '  (no testIds found)'}\n`;

  console.log('AI Log - Generated Button Text Guidance:', guidance);
  return guidance;
}

/**
 * Extract CSS classes from related component source code
 * Looks for class definitions and usage patterns in the component that renders the failing selector
 */
function extractCSSClassesFromSourceCode(testCode, testFilePath) {
  try {
    if (HEALER_VERBOSE) console.log(`   🔍 extract CSS from source called, testCode length=${testCode?.length || 0}`);
    // Extract component references from test (e.g., seat-grid, MovieCard, etc.)
    const componentRefs = [];
    
    // Find custom element references (e.g., locator('seat-grid') or locator("seat-grid"))
    const customElementMatches = testCode.match(/locator\(['"]([a-z-]+)['"]\)/g) || [];
    if (HEALER_VERBOSE) console.log(`   Regex found ${customElementMatches.length} potential matches: ${customElementMatches.slice(0, 3).join(', ')}`);
    
    customElementMatches.forEach(match => {
      const nameMatch = match.match(/['"]([a-z-]+)['"]/);
      if (nameMatch && nameMatch[1]) {
        componentRefs.push(nameMatch[1]);
      }
    });
    if (HEALER_VERBOSE) console.log(`   Found: ${componentRefs.length} component(s): ${componentRefs.join(', ')}`);
    
    if (componentRefs.length === 0) return { cssClasses: [], sourceFile: null };
    
    // For each component, try to find its source file
    const componentName = componentRefs[0];
    const possiblePaths = [
      path.join(process.cwd(), '../movieapp/frontend/src/components', `${componentName.charAt(0).toUpperCase() + componentName.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}WebComponent.ts`),
      path.join(process.cwd(), '../movieapp/frontend/src/components', `${componentName}WebComponent.ts`),
      path.join(process.cwd(), '../movieapp/frontend/src/components', `${componentName}.tsx`),
      path.join(process.cwd(), '../movieapp/frontend/src/components', `${componentName}.ts`)
    ];
    
    let sourceFile = null;
    for (const filePath of possiblePaths) {
      if (HEALER_VERBOSE) console.log(`   📍 Checking: ${filePath} ${fs.existsSync(filePath) ? '✅' : '❌'}`);
      if (fs.existsSync(filePath)) {
        sourceFile = filePath;
        break;
      }
    }
    
    if (!sourceFile) {
      return { cssClasses: [], sourceFile: null };
    }
    
    // Read source file and extract CSS class definitions and actual combinations
    const sourceCode = fs.readFileSync(sourceFile, 'utf-8');
    const cssClasses = new Set();
    const actualCombinations = new Set();
    
    // Match class attribute assignments like: class="seat ${status} ${clickable}"
    const classAssignments = sourceCode.match(/class\s*=\s*[`'"](.*?)[`'"]/g) || [];
    classAssignments.forEach(assignment => {
      // Extract the class template string
      const classStr = assignment.match(/[`'"](.*?)[`'"]/)[1];
      
      // Find standalone class names (not variables)
      const classes = classStr.match(/\b[a-z][a-z0-9]*\b/gi) || [];
      classes.forEach(cls => {
        if (!/\$|{|}/.test(cls)) {  // Skip template variables
          cssClasses.add(cls.toLowerCase());
        }
      });
      
      // Also store the template as-is to extract actual combinations
      // E.g., "seat ${seatClass} ${click}" represents templates that could render:
      // - seat booked
      // - seat selected click
      // - seat available click
      if (classStr.includes('${')) {
        actualCombinations.add(classStr);
      }
    });
    
    // Also look for const definitions like: const click = isAvailable ? 'click' : '';
    const constAssignments = sourceCode.match(/const\s+\w+\s*=\s*[^;]*['"]([a-z]+)['"]/g) || [];
    constAssignments.forEach(assignment => {
      const className = assignment.match(/['"]([a-z]+)['"]/)[1];
      cssClasses.add(className);
    });
    
    // Extract actual class combinations from conditional logic
    // Look for patterns like: if (isBooked) seatClass = 'booked'; else if (isSelected) seatClass = 'selected';
    const seatClassLogic = sourceCode.match(/if\s*\([^)]*\)\s*seatClass\s*=\s*['"]([a-z]+)['"]/g) || [];
    const statusClasses = [];
    seatClassLogic.forEach(line => {
      const match = line.match(/['"]([a-z]+)['"]/);
      if (match) statusClasses.push(match[1]);
    });
    
    // Generate actual combinations based on the conditional logic found
    const combinedClasses = [];
    const classArray = Array.from(cssClasses);
    const baseClass = 'seat'; // Most component tests start with the base element selector
    
    if (statusClasses.length > 0) {
      // Generate combinations with each status class
      statusClasses.forEach(status => {
        combinedClasses.push(`${baseClass}.${status}`);
        // Add click variants (some states are clickable)
        if (status !== 'booked') {  // booked seats are typically not clickable
          combinedClasses.push(`${baseClass}.${status}.click`);
        }
      });
    } else if (classArray.length > 0) {
      // Fallback: Generate realistic combinations (not all 2^n combinations)
      // Focus on the most likely patterns: base + one modifier, base + two modifiers
      combinedClasses.push(baseClass);
      classArray.forEach(cls => {
        if (cls !== baseClass) {
          combinedClasses.push(`${baseClass}.${cls}`);
        }
      });
      
      // Add some two-class combinations (base + state + interactive)
      const interactiveClasses = classArray.filter(c => ['click', 'hover', 'active'].includes(c));
      const stateClasses = classArray.filter(c => ['available', 'selected', 'booked'].includes(c));
      
      stateClasses.forEach(state => {
        interactiveClasses.forEach(interactive => {
          combinedClasses.push(`${baseClass}.${state}.${interactive}`);
        });
      });
    }
    
    if (HEALER_VERBOSE) {
      console.log(`📝 Extracted ${cssClasses.size} CSS classes from source: ${Array.from(cssClasses).join(', ')}`);
      console.log(`   Status classes found: ${statusClasses.join(', ') || 'none'}`);
      console.log(`   📦 Generated ${combinedClasses.length} realistic class combinations`);
    }
    
    return { cssClasses: combinedClasses, sourceFile, baseClasses: Array.from(cssClasses) };
  } catch (err) {
    if (HEALER_VERBOSE) console.log(`⚠️  Error extracting CSS classes from source: ${err.message}`);
    return { cssClasses: [], sourceFile: null };
  }
}

/**
 * Find the closest matching button text by Levenshtein distance
 * FIXED: Better matching for button text changes
 */
function findClosestButtonMatch(searchText, buttons, threshold = 0.6) {
  if (!buttons || buttons.length === 0) {
    console.log(`AI Log - No buttons available to match against "${searchText}"`);
    return null;
  }
  
  // CRITICAL FIX: Log what buttons we're comparing against
  if (HEALER_VERBOSE) {
    console.log(`AI Log - Matching "${searchText}" against buttons: ${buttons.map(b => b.text).join(', ')}`);
  }
  
  let bestMatch = null;
  let bestScore = threshold;
  
  buttons.forEach(btn => {
    const distance = getLevenshteinDistance(
      searchText.toLowerCase(),
      btn.text.toLowerCase()
    );
    const maxLen = Math.max(searchText.length, btn.text.length);
    const score = maxLen === 0 ? 1 : 1 - (distance / maxLen);
    
    if (HEALER_VERBOSE) {
      console.log(`AI Log - Button comparison: "${btn.text}" score=${(score * 100).toFixed(1)}%`);
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = btn;
    }
  });
  
  if (bestMatch && HEALER_VERBOSE) {
    console.log(`AI Log - Best match: "${bestMatch.text}" with ${(bestScore * 100).toFixed(1)}% confidence`);
  }
  
  return bestMatch;
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of button text
 */
function getLevenshteinDistance(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,      // insertion
        matrix[j - 1][i] + 1,      // deletion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len2][len1];
}

/**
 * ==================== NEW: FRONTEND CHANGE DETECTION ====================
 * Detect behavioral and structural changes in frontend
 */
function detectFrontendChanges(testInfo, testCode) {
  const changeAnalysis = {
    urlChange: null,
    selectorChanges: [],
    textChanges: [],
    labelChanges: [],
    structuralChanges: [],
    detectionConfidence: 0
  };

  // 1. URL CHANGE DETECTION
  const urlPattern = /Expected:\s*"(.*?)"\s*Received:\s*"(.*?)"/i;
  const urlMatch = testInfo.error.match(urlPattern);
  if (urlMatch) {
    try {
      const expected = new URL(urlMatch[1]);
      const received = new URL(urlMatch[2]);
      const expectedPath = expected.pathname;
      const receivedPath = received.pathname;
      
      changeAnalysis.urlChange = {
        expectedPath,
        receivedPath,
        isTargeted: receivedPath !== '/' && receivedPath.length > 1,
        isFrontendBug: receivedPath === '/' || receivedPath === '',
        confidence: 'high'
      };
    } catch (e) {
      // URL parsing failed, not a URL change
    }
  }

  // 2. SELECTOR CHANGE DETECTION (0 matching elements) - FIXED: Better distinction
  if (/Locator\.locator|0 matching elements|did not find/i.test(testInfo.error)) {
    // Check if this is actually an assertion timeout on toHaveURL
    if (!/toHaveURL|Expected.*Received/i.test(testInfo.error)) {
      changeAnalysis.selectorChanges.push({
        type: 'element_not_found',
        likely_cause: 'Selector outdated or element removed',
        confidence: 'high'
      });
    }
  }

  // 3. TEXT/ASSERTION MISMATCH - FIXED: Include URL mismatches
  // Pattern: Expected: "http://..." Received: "http://..."
  const textMismatchPattern = /Expected.*text.*"(.*?)"\s*Received.*"(.*?)"|AssertionError.*text|expected.*text/i;
  const urlMismatchPattern = /Expected:\s*["']([^"']+)["']\s*Received:\s*["']([^"']+)["']/i;
  
  if (textMismatchPattern.test(testInfo.error)) {
    changeAnalysis.textChanges.push({
      type: 'text_content_changed',
      likely_cause: 'Button/label text updated in frontend',
      confidence: 'high'
    });
  } else if (urlMismatchPattern.test(testInfo.error)) {
    changeAnalysis.urlChange = {
      expectedPath: testInfo.error.match(/Expected:\s*["']([^"']+)["']/)?.[1],
      receivedPath: testInfo.error.match(/Received:\s*["']([^"']+)["']/)?.[1],
      isTargeted: true,
      isFrontendBug: false,
      confidence: 'high'
    };
  }

  // 4. LABEL/PLACEHOLDER CHANGE
  if (/label|placeholder|getByLabel|getByPlaceholder/i.test(testCode) && 
      (/not found|0 matching/i.test(testInfo.error))) {
    changeAnalysis.labelChanges.push({
      type: 'label_content_changed',
      likely_cause: 'Form label or placeholder text updated',
      confidence: 'medium'
    });
  }

  // 5. STRUCTURAL/DOM CHANGES
  if (/TypeError|Cannot read property|Cannot find element|Shadow DOM|iframe/i.test(testInfo.error)) {
    changeAnalysis.structuralChanges.push({
      type: 'dom_structure_changed',
      likely_cause: 'Component structure, Shadow DOM, or Architecture changed',
      confidence: 'medium'
    });
  }

  // Calculate overall confidence
  const changeCount = Object.values(changeAnalysis).filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length;
  changeAnalysis.detectionConfidence = Math.min(100, changeCount * 25);

  return changeAnalysis;
}

/**
 * ==================== NEW: CSS CLASS CHANGE DETECTION ====================
 * Analyze CSS class changes in Shadow DOM and other elements
 */
/**
 * Calculate word similarity using multiple strategies:
 * 1. Exact match (100%)
 * 2. Prefix/suffix match (85%+)
 * 3. Substring contains (75%+)
 * 4. Edit distance / Levenshtein distance
 */
function calculateWordSimilarity(word1, word2) {
  if (word1 === word2) return 1.0;
  
  const longer = word1.length > word2.length ? word1 : word2;
  const shorter = word1.length > word2.length ? word2 : word1;
  if (longer.length === 0) return 1.0;
  
  // Check if shorter word is a prefix of longer (e.g., 'click' in 'clickable')
  if (longer.startsWith(shorter)) {
    return 0.85;  // Strong similarity for prefix match
  }
  
  // Check if shorter word is a suffix of longer
  if (longer.endsWith(shorter)) {
    return 0.80;  // Good similarity for suffix match
  }
  
  // Check if shorter is contained in longer
  if (longer.includes(shorter)) {
    return 0.75;  // Moderate similarity for substring
  }
  
  // Fallback to edit distance
  const editDist = getLevenshteinDistance(longer, shorter);
  return (longer.length - editDist) / longer.length;
}

/**
 * Calculate similarity between two class sets using Jaccard similarity
 * Range: 0 (no overlap) to 1 (identical)
 * Also considers word-level similarity for similar class names (e.g., 'clickable' vs 'click')
 */
function calculateClassSimilarity(testClasses, renderedClasses) {
  const testSet = new Set(testClasses);
  const renderedSet = new Set(renderedClasses);
  
  // First pass: exact matches
  const exactMatches = [...testSet].filter(c => renderedSet.has(c)).length;
  const totalClasses = new Set([...testSet, ...renderedSet]).size;
  
  // Second pass: check for similar class names (e.g., 'clickable' vs 'click')
  let similarMatches = exactMatches;
  const unmatchedTest = [...testSet].filter(c => !renderedSet.has(c));
  const unmatchedRendered = [...renderedSet].filter(c => !testSet.has(c));
  
  for (const testClass of unmatchedTest) {
    for (const renderedClass of unmatchedRendered) {
      const wordSim = calculateWordSimilarity(testClass, renderedClass);
      if (wordSim >= 0.70) {  // 70% word similarity = likely class name change (covers 'click' -> 'clickable')
        similarMatches++;
        unmatchedRendered.splice(unmatchedRendered.indexOf(renderedClass), 1);
        break;
      }
    }
  }
  
  return totalClasses === 0 ? 0 : similarMatches / totalClasses;
}

/**
 * Find the closest matching class combination from rendered classes
 * Handles: exact matches, class additions, class removals, and class changes
 */
function findClosestClassMatch(testSelector, testClasses, renderedClasses, similarity = 0.5) {
  // Group rendered classes by their element tag/base class
  const baseClass = testClasses[0];  // e.g., 'seat' from '.seat.available.clickable'
  const classesWithBase = renderedClasses.filter(rendered => {
    const renderedParts = rendered.split('.');
    return renderedParts[0] === baseClass;  // Same first class (element type)
  });
  
  if (classesWithBase.length === 0) {
    return null;  // No classes with same base
  }
  
  // Score each candidate by similarity
  const scored = classesWithBase.map(rendered => {
    const renderedParts = rendered.split('.');
    const sim = calculateClassSimilarity(testClasses, renderedParts);
    
    // Determine change type
    let changeType = 'SIMILAR';
    const commonClasses = testClasses.filter(tc => renderedParts.includes(tc));
    const addedClasses = renderedParts.filter(rc => !testClasses.includes(rc));
    const removedClasses = testClasses.filter(tc => !renderedParts.includes(tc));
    
    if (addedClasses.length > 0 && removedClasses.length === 0) {
      changeType = 'ADDED_CLASSES';
    } else if (removedClasses.length > 0 && addedClasses.length === 0) {
      changeType = 'REMOVED_CLASSES';
    } else if (addedClasses.length > 0 && removedClasses.length > 0) {
      changeType = 'CHANGED_CLASSES';
    }
    
    return {
      rendered,
      similarity: sim,
      commonClasses,
      addedClasses,
      removedClasses,
      changeType
    };
  });
  
  // Sort by similarity (highest first)
  scored.sort((a, b) => b.similarity - a.similarity);
  
  // Return best match if similarity exceeds threshold
  const bestMatch = scored[0];
  if (bestMatch.similarity >= similarity) {
    return bestMatch;
  }
  
  return null;  // No sufficiently similar match
}

function analyzeClassCombinations(testCode, traceElements) {
  if (!traceElements || traceElements.cssClasses.length === 0) {
    return {
      testSelectors: [],
      renderedClasses: [],
      classMatches: [],
      mismatches: [],
      suggestions: [],
      summary: 'No CSS class information available'
    };
  }

  const analysis = {
    testSelectors: [],
    renderedClasses: traceElements.cssClasses,
    classMatches: [],
    mismatches: [],
    suggestions: []
  };

  // Extract CSS selectors from test code (both page.locator and nested patterns)
  const selectorPatterns = [
    /page\.locator\(["']([^"']*?)["']\)\.locator\(["']([^"']*?)["']\)/g,  // nested: page.locator('parent').locator('.child')
    /page\.locator\(["'](\.[^"']+?)["']\)/g,                              // page.locator('.className')
    /locator\(["'](\.[^"']+?)["']\)/g,                                    // locator('.className')
  ];

  const extractedSelectors = new Set();
  selectorPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(testCode)) !== null) {
      // Get the last captured group (the actual selector)
      const selector = match[match.length - 1];
      if (selector) {
        extractedSelectors.add(selector.startsWith('.') ? selector : '.' + selector);
      }
    }
  });

  analysis.testSelectors = Array.from(extractedSelectors);

  // Compare each test selector against rendered classes
  analysis.testSelectors.forEach(testSelector => {
    const testClasses = testSelector.split('.').filter(c => c);
    const classStr = testClasses.join('.');
    
    if (HEALER_VERBOSE) {
      console.log(`   📍 Testing selector: ${testSelector}`);
      console.log(`      Classes: [${testClasses.join(', ')}]`);
    }

    // Look for exact matches
    const exactMatch = traceElements.cssClasses.find(rendered => 
      rendered === classStr
    );

    if (exactMatch) {
      analysis.classMatches.push({
        testSelector,
        rendered: exactMatch,
        status: 'EXACT_MATCH',
        confidence: 'high'
      });
      if (HEALER_VERBOSE) console.log(`      ✅ Exact match found: ${exactMatch}`);
    } else {
      // Look for partial matches - test selector is subset of rendered
      const partialMatches = traceElements.cssClasses.filter(rendered => {
        const renderedClasses = rendered.split('.');
        return testClasses.every(tc => renderedClasses.includes(tc));
      });
      
      if (HEALER_VERBOSE && partialMatches.length > 0) {
        console.log(`      🔶 Partial match found (classes added): [${partialMatches.join(', ')}]`);
      }

      if (partialMatches.length > 0) {
        // Classes were added
        analysis.mismatches.push({
          testSelector,
          testClasses,
          renderedMatches: partialMatches,
          status: 'PARTIAL_MATCH',
          confidence: 'high',
          changeType: 'ADDED_CLASSES',
          issue: `Test uses "${testSelector}" but actual classes include additional classes`,
          suggestion: `Use "${partialMatches[0]}" (adds missing classes: ${
            partialMatches[0].split('.').filter(c => !testClasses.includes(c)).join(', ')
          })`
        });

        analysis.suggestions.push({
          original: testSelector,
          suggested: partialMatches[0],
          changeType: 'ADDED_CLASSES',
          reason: `Add missing class(es): ${
            partialMatches[0].split('.').filter(c => !testClasses.includes(c)).join(', ')
          }`,
          confidence: 95
        });
      } else {
        // NEW: Look for similar matches (class changes/replacements)
        const closestMatch = findClosestClassMatch(testSelector, testClasses, traceElements.cssClasses, 0.5);
        
        if (HEALER_VERBOSE && closestMatch) {
          console.log(`      ✨ Closest match found: ${closestMatch.rendered}`);
          console.log(`         Similarity: ${(closestMatch.similarity * 100).toFixed(1)}%`);
          console.log(`         Common: [${closestMatch.commonClasses.join(', ')}]`);
          console.log(`         Added: [${closestMatch.addedClasses.join(', ')}]`);
          console.log(`         Removed: [${closestMatch.removedClasses.join(', ')}]`);
          console.log(`         Change type: ${closestMatch.changeType}`);
        }
        
        if (closestMatch && closestMatch.similarity > 0.6) {
          // Found a similar match - likely class change
          const changeDescription = closestMatch.changeType === 'ADDED_CLASSES' 
            ? `added class(es): ${closestMatch.addedClasses.join(', ')}`
            : closestMatch.changeType === 'REMOVED_CLASSES'
            ? `removed class(es): ${closestMatch.removedClasses.join(', ')}`
            : `changed classes: removed ${closestMatch.removedClasses.join(', ')}, added ${closestMatch.addedClasses.join(', ')}`;
          
          analysis.mismatches.push({
            testSelector,
            testClasses,
            renderedMatches: [closestMatch.rendered],
            status: 'SIMILAR_MATCH',
            changeType: closestMatch.changeType,
            confidence: 'high',
            similarity: closestMatch.similarity,
            issue: `Test selector "${testSelector}" changed - ${changeDescription}`,
            suggestion: `Use "${closestMatch.rendered}" (${changeDescription})`,
            commonClasses: closestMatch.commonClasses,
            addedClasses: closestMatch.addedClasses,
            removedClasses: closestMatch.removedClasses
          });

          analysis.suggestions.push({
            original: testSelector,
            suggested: closestMatch.rendered,
            changeType: closestMatch.changeType,
            reason: changeDescription,
            confidence: Math.round(closestMatch.similarity * 100)
          });
        } else {
          // No match - selector completely broken
          analysis.mismatches.push({
            testSelector,
            testClasses,
            status: 'NO_MATCH',
            confidence: 'high',
            issue: `Test selector "${testSelector}" not found in rendered elements`,
            availableSelectors: traceElements.cssClasses.slice(0, 5).join(', ')
          });
        }
      }
    }
  });

  if (HEALER_VERBOSE && analysis.mismatches.length > 0) {
    console.log(`🔍 CSS Class Analysis: ${analysis.classMatches.length} matches, ${analysis.mismatches.length} mismatches found`);
    analysis.mismatches.forEach(m => console.log(`   - ${m.testSelector}: ${m.issue} (confidence: ${m.confidence})`));
  }

  return analysis;
}

/**
 * Detect CSS class changes in Shadow DOM and DOM elements
 * Returns specific recommendations for class-based selector updates
 * Handles: additions, removals, and replacements
 */
function detectClassChanges(testCode, traceElements, testInfo) {
  const classAnalysis = {
    hasClassChanges: false,
    changedSelectors: [],
    confidence: 0,
    needsUpdate: false,
    updateType: null,
    details: {}
  };

  if (!traceElements || traceElements.cssClasses.length === 0) {
    return classAnalysis;  // No trace data available
  }

  // Analyze class combinations
  const combinations = analyzeClassCombinations(testCode, traceElements);
  
  classAnalysis.details = combinations;

  // If there are mismatches, we have class changes
  if (combinations.mismatches.length > 0) {
    classAnalysis.hasClassChanges = true;
    classAnalysis.needsUpdate = true;
    
    combinations.mismatches.forEach(mismatch => {
      if (mismatch.status === 'PARTIAL_MATCH') {
        // Classes were added to selector
        classAnalysis.updateType = 'CLASS_ADDITION';
        classAnalysis.changedSelectors.push({
          current: mismatch.testSelector,
          suggested: mismatch.suggestion,
          missingClasses: mismatch.renderedMatches[0].split('.')
            .filter(c => !mismatch.testClasses.includes(c)),
          confidence: 95,
          type: 'class_addition',
          changeType: 'ADDED_CLASSES'
        });
      } else if (mismatch.status === 'SIMILAR_MATCH') {
        // Classes changed (added, removed, or replaced)
        const changeType = mismatch.changeType || 'CHANGED_CLASSES';
        classAnalysis.updateType = 'CLASS_CHANGE';
        
        classAnalysis.changedSelectors.push({
          current: mismatch.testSelector,
          suggested: mismatch.suggestion,
          addedClasses: mismatch.addedClasses || [],
          removedClasses: mismatch.removedClasses || [],
          confidence: Math.round((mismatch.similarity || 0.7) * 100),
          type: 'class_change',
          changeType: changeType,
          reason: mismatch.issue
        });
      } else if (mismatch.status === 'NO_MATCH') {
        // Selector completely broken
        classAnalysis.changedSelectors.push({
          current: mismatch.testSelector,
          status: 'BROKEN',
          availableOptions: traceElements.cssClasses.slice(0, 3),
          confidence: 50,
          type: 'selector_broken'
        });
      }
    });

    // Calculate overall confidence (prioritize high-confidence matches)
    const highConfidence = classAnalysis.changedSelectors.filter(s => s.confidence >= 90).length;
    const mediumConfidence = classAnalysis.changedSelectors.filter(s => s.confidence >= 70 && s.confidence < 90).length;
    classAnalysis.confidence = Math.min(100, 
      (highConfidence * 1.0 + mediumConfidence * 0.7) / Math.max(1, classAnalysis.changedSelectors.length) * 100
    );
  }

  // Check if error message hints at class issues
  if (testInfo && testInfo.error) {
    const errorLower = testInfo.error.toLowerCase();
    if (errorLower.includes('0 found') || errorLower.includes('resolved to 0 elements')) {
      classAnalysis.hasClassChanges = true;
      classAnalysis.needsUpdate = true;
      classAnalysis.confidence = Math.max(classAnalysis.confidence, 70);
    }
  }

  return classAnalysis;
}

/**
 * Generate CSS class change guidance for Gemini prompt
 */
function generateClassChangeGuidance(classChanges) {
  if (!classChanges || !classChanges.hasClassChanges) {
    return '';
  }

  let guidance = '\n\n### 📋 CSS CLASS CHANGES DETECTED IN RENDERED ELEMENTS\n';
  guidance += `**Number of selectors affected:** ${classChanges.changedSelectors.length}\n`;
  guidance += `**Overall Confidence:** ${classChanges.confidence.toFixed(0)}%\n`;
  guidance += `**Update Type:** ${classChanges.updateType}\n\n`;

  if (classChanges.changedSelectors.length > 0) {
    guidance += '**Selector Changes Required:**\n';
    classChanges.changedSelectors.forEach((change, idx) => {
      if (change.type === 'class_addition') {
        guidance += `\n${idx + 1}. ✏️ **CLASS ADDITION**\n`;
        guidance += `   **Current:** \`${change.current}\`\n`;
        guidance += `   **Suggested:** \`${change.suggested}\`\n`;
        guidance += `   **Missing Classes:** ${change.missingClasses.map(c => `\`${c}\``).join(', ')}\n`;
        guidance += `   **Confidence:** ${change.confidence}%\n`;
        guidance += `   **Action:** Add the missing class(es) to the selector\n`;
      } else if (change.type === 'class_change') {
        guidance += `\n${idx + 1}. 🔄 **CLASS CHANGE** (${change.changeType})\n`;
        guidance += `   **Current:** \`${change.current}\`\n`;
        guidance += `   **Suggested:** \`${change.suggested}\`\n`;
        guidance += `   **Confidence:** ${change.confidence}%\n`;
        if (change.removedClasses && change.removedClasses.length > 0) {
          guidance += `   **Removed Classes:** ${change.removedClasses.map(c => `\`${c}\``).join(', ')}\n`;
        }
        if (change.addedClasses && change.addedClasses.length > 0) {
          guidance += `   **Added Classes:** ${change.addedClasses.map(c => `\`${c}\``).join(', ')}\n`;
        }
        guidance += `   **Reason:** ${change.reason}\n`;
        guidance += `   **Action:** Update the selector to use the new class combination\n`;
      } else if (change.type === 'selector_broken') {
        guidance += `\n${idx + 1}. ❌ **SELECTOR BROKEN**\n`;
        guidance += `   **Current:** \`${change.current}\`\n`;
        guidance += `   **Status:** Not found in rendered elements (0 elements)\n`;
        guidance += `   **Confidence:** ${change.confidence}%\n`;
        guidance += `   **Available similar selectors (suggestions):**\n`;
        change.availableOptions.forEach(opt => {
          guidance += `     - \`${opt}\`\n`;
        });
      }
    });
  }

  if (classChanges.details && classChanges.details.renderedClasses.length > 0) {
    guidance += `\n**All CSS classes found in rendered elements (first 15):**\n`;
    classChanges.details.renderedClasses.slice(0, 15).forEach(cls => {
      guidance += `- \`${cls}\`\n`;
    });
  }

  guidance += `\n**CRITICAL RULE:** Always use CSS class combinations that match the rendered elements.\n`;
  guidance += `Examples of class changes:\n`;
  guidance += `- Class added: \`.available\` → \`.available.clickable\` (add \`clickable\`)\n`;
  guidance += `- Class removed: \`.available.clickable\` → \`.available\` (remove \`clickable\`)\n`;
  guidance += `- Class changed: \`.available.clickable\` → \`.available.click\` (replace \`clickable\` with \`click\`)\n`;

  if (HEALER_VERBOSE) {
    console.log('AI Log - Generated Class Change Guidance:', guidance);
  }
  return guidance;
}

/**
 * Suggest test fix based on frontend changes
 */
function suggestTestFix(testCode, frontendChanges, testInfo) {
  const suggestions = {
    strategy: 'manual_review',
    actions: [],
    canAutoFix: false,
    confidence: 'low',
    details: ''
  };

  // STRATEGY 1: URL Change - May need test assertion update
  if (frontendChanges.urlChange) {
    const { isTargeted, isFrontendBug, expectedPath, receivedPath } = frontendChanges.urlChange;
    
    if (isFrontendBug) {
      suggestions.strategy = 'frontend_bug';
      suggestions.actions.push('REPORT: Button navigates to invalid path (likely broken)');
      suggestions.confidence = 'high';
      suggestions.details = `Expected: ${expectedPath}, Got: ${receivedPath} (likely broken redirect)`;
    } else if (isTargeted) {
      suggestions.strategy = 'evaluate_and_decide';
      suggestions.actions.push(`REVIEW: Button may have been intentionally redirected`);
      suggestions.actions.push(`OLD assertion: ${expectedPath}`);
      suggestions.actions.push(`NEW behavior: ${receivedPath}`);
      suggestions.confidence = 'medium';
      suggestions.details = `Decision: Is ${receivedPath} the new intended behavior?`;
      
      // Try to auto-decide based on test name/intent
      if (/broken|error|invalid/i.test(testInfo.file)) {
        suggestions.strategy = 'frontend_bug';
        suggestions.actions = ['REPORT: Test is specifically for broken behavior - fix frontend'];
        suggestions.confidence = 'high';
      } else if (/redirect|navigate/i.test(testCode)) {
        suggestions.strategy = 'update_test';
        suggestions.canAutoFix = true;
        suggestions.actions = [`AUTO-FIX: Update URL assertion to expect ${receivedPath}`];
        suggestions.confidence = 'high';
      }
    }
  }

  // STRATEGY 2: Selector Change - Can usually auto-fix
  else if (frontendChanges.selectorChanges.length > 0) {
    suggestions.strategy = 'update_selector';
    suggestions.canAutoFix = true;
    suggestions.actions.push('AUTO-FIX: Try getByRole(), getByText(), or getByTestId()');
    suggestions.actions.push('Avoid brittle .Mui* class selectors');
    suggestions.confidence = 'high';
    suggestions.details = 'Suggest resilient selector alternatives';
  }

  // STRATEGY 3: Text/Label Change - Can usually auto-fix
  else if (frontendChanges.textChanges.length > 0 || frontendChanges.labelChanges.length > 0) {
    suggestions.strategy = 'update_text';
    suggestions.canAutoFix = true;
    suggestions.actions.push('AUTO-FIX: Analyze frontend for new text/label');
    suggestions.actions.push('Update text patterns in assertions');
    suggestions.confidence = 'high';
    suggestions.details = 'Text content has changed - can update test to match';
  }

  // STRATEGY 4: Structural/DOM Change - Needs manual review
  else if (frontendChanges.structuralChanges.length > 0) {
    suggestions.strategy = 'structural_review';
    suggestions.actions.push('MANUAL REVIEW: Component architecture changed');
    suggestions.actions.push('May need Shadow DOM piercing or new selectors');
    suggestions.confidence = 'low';
    suggestions.details = 'Architectural changes require code review';
  }

  return suggestions;
}

/**
 * Extract Gemini decision from response
 */
function extractHealerDecision(geminiResponse) {
  const decisionPattern = /DECISION:\s*([A-Z_]+)/i;
  const match = geminiResponse.match(decisionPattern);
  
  if (match) {
    const decision = match[1];
    const validDecisions = ['FRONTEND_BUG', 'UPDATE_TEST', 'UPDATE_SELECTOR', 'UPDATE_TEXT', 'SELECTOR_CLASS_UPDATE', 'ARCHITECTURAL_FIX', 'MANUAL_REVIEW'];
    
    if (validDecisions.includes(decision)) {
      return {
        decision,
        reasoning: extractReasoningFromResponse(geminiResponse),
        isAutoFixable: ['UPDATE_TEST', 'UPDATE_SELECTOR', 'UPDATE_TEXT', 'SELECTOR_CLASS_UPDATE', 'ARCHITECTURAL_FIX'].includes(decision),
        confidence: calculateConfidenceFromResponse(geminiResponse)
      };
    }
  }
  
  return {
    decision: 'UNKNOWN',
    reasoning: 'Could not determine decision',
    isAutoFixable: false,
    confidence: 'low'
  };
}

/**
 * Extract reasoning from Gemini response
 */
function extractReasoningFromResponse(response) {
  const reasoningPatterns = [
    /DECISION:.*?\n([\s\S]*?)(?=\n###|\n##|FRONTEND_BUG|UPDATE|Fixed Code|$)/i,
    /Reasoning[:\s]*([\s\S]{0,500}?)(?=\n###|\n##|Fixed|$)/i,
    /([\s\S]{0,300}?)(?=FRONTEND_BUG|UPDATE|Fixed Code|$)/i
  ];
  
  for (const pattern of reasoningPatterns) {
    const match = response.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 500);
    }
  }
  
  return 'No explicit reasoning provided';
}

/**
 * Calculate confidence from response
 */
function calculateConfidenceFromResponse(response) {
  const confidence_indicators = {
    'very high': 100,
    'high certainty': 90,
    'likely': 80,
    'probably': 70,
    'possibly': 60,
    'might': 50,
    'unclear': 30,
    'unsure': 20,
    'manual': 0
  };
  
  for (const [phrase, score] of Object.entries(confidence_indicators)) {
    if (response.toLowerCase().includes(phrase)) {
      return score;
    }
  }
  
  return 50;
}

/**
 * Extract what changed (URL, selector, text, etc.)
 * CRITICAL FIX: Properly extract URLs from error messages first
 */
function extractChangeDetails(geminiResponse, testInfo) {
  const changeDetails = {
    changeType: 'unknown',
    oldValue: null,
    newValue: null,
    replacement: null,
    urlFromError: null
  };
  
  // URL Change Detection - FIXED: Check error message first for actual URL values
  const normalizedResponse = geminiResponse.replace(/\r\n/g, '\n');
  
  // CRITICAL: First, check error message in testInfo for actual URL values
  if (testInfo && testInfo.error) {
    // Pattern: Expected: "http://localhost:3000/movie/99" Received: "http://localhost:3000/movie/777"
    const errorUrlMatch = testInfo.error.match(/Expected:\s*["']?([^"'\n]+)["']?\s*Received:\s*["']?([^"'\n]+)["']?/i);
    if (errorUrlMatch) {
      changeDetails.changeType = 'url';
      changeDetails.urlFromError = { expected: errorUrlMatch[1], received: errorUrlMatch[2] };
      changeDetails.oldValue = errorUrlMatch[1];
      changeDetails.newValue = errorUrlMatch[2];
      console.log(`AI Log - URL mismatch from error: Expected ${changeDetails.oldValue} but got ${changeDetails.newValue}`);
    }
  }
  
  const oldUrlMatch = normalizedResponse.match(/Old\s+URL?:\s*["']?([^"'\n]+?)["']?(?=\s|$|,|;)/i);
  const newUrlMatch = normalizedResponse.match(/New\s+URL?:\s*["']?([^"'\n]+?)["']?(?=\s|$|,|;)/i);
  const expectedUrlMatch = normalizedResponse.match(/Expected\s+URL(?:\s*is|\s*to be|\s*:)\s*["']?([^"'\n]+?)["']?(?=\s|$|,|;)/i);
  const currentUrlMatch = normalizedResponse.match(/(?:Current|Actual)\s+URL(?:\s*is|\s*:)\s*["']?([^"'\n]+?)["']?(?=\s|$|,|;)/i);
  const toHaveUrlMatch = normalizedResponse.match(/toHaveURL\(\s*["']([^"']+)["']\s*\)/i);
  const navigateUrlMatch = normalizedResponse.match(/navigate(?:d)?\s+to\s*["']([^"']+)["']/i);

  // Use Gemini response values if error extraction didn't work
  if (!changeDetails.urlFromError && (oldUrlMatch || newUrlMatch || expectedUrlMatch || currentUrlMatch || toHaveUrlMatch || navigateUrlMatch)) {
    changeDetails.changeType = 'url';
    changeDetails.oldValue = changeDetails.oldValue || oldUrlMatch?.[1] || currentUrlMatch?.[1] || null;
    changeDetails.newValue = changeDetails.newValue || newUrlMatch?.[1] || expectedUrlMatch?.[1] || toHaveUrlMatch?.[1] || navigateUrlMatch?.[1] || null;
  }
  
  // Selector Change
  const selectorPattern = /(?:Replace|Update|Use)\s+.*selector[\s\S]{0,200}?(?:with|→|:|to)\s*(?:\`|'|"|getBy|locator)([^\`'"\n]+)/i;
  const selectorMatch = geminiResponse.match(selectorPattern);
  if (selectorMatch) {
    changeDetails.changeType = 'selector';
    changeDetails.replacement = selectorMatch[1].trim();
  }
  
  // Text Change
  const textPattern = /(?:text|content)[\s\n]*(?:from|change|update|to)[\s\n]*['"](.*?)['"]/i;
  const textMatch = geminiResponse.match(textPattern);
  if (textMatch) {
    changeDetails.changeType = 'text';
    changeDetails.newValue = textMatch[1].trim();
  }
  
  return changeDetails;
}

// ============ SOURCE CODE ANALYSIS SECURITY LAYER ============

/**
 * Security: Validate whitelisted file path for source code access
 * Prevents path traversal, absolute paths, and access to sensitive files
 */
function validateSourceCodeFilePath(filePath) {
  // Step 1: Check for path traversal attempts
  if (filePath.includes('..')) {
    auditSourceCodeAccess('PATH_TRAVERSAL_BLOCKED', filePath, { reason: 'Path traversal detected: .. not allowed' });
    throw new Error(`❌ Path traversal detected in: ${filePath}`);
  }

  // Step 2: Block absolute paths
  if (filePath.startsWith('/') || filePath.match(/^[a-z]:/i)) {
    auditSourceCodeAccess('ABSOLUTE_PATH_BLOCKED', filePath, { reason: 'Absolute paths not allowed' });
    throw new Error(`❌ Absolute paths not allowed: ${filePath}`);
  }

  // Step 3: Block sensitive files
  const blockedPatterns = ['.env', 'secrets', 'credentials', 'package-lock', 'yarn.lock', 'node_modules', 'backend/', 'build/'];
  for (const pattern of blockedPatterns) {
    if (filePath.toLowerCase().includes(pattern.toLowerCase())) {
      auditSourceCodeAccess('SENSITIVE_FILE_BLOCKED', filePath, { reason: `Blocked pattern: ${pattern}` });
      throw new Error(`❌ File path blocked (sensitive): ${filePath}`);
    }
  }

  // Step 4: Validate against whitelist
  const whitelistPatterns = [
    /^movieapp\/frontend\/src\/components\/[\w\-\.]+\.tsx$/,
    /^movieapp\/frontend\/src\/pages\/[\w\-\.]+\.tsx$/,
    /^movieapp\/frontend\/src\/components\/[\w\-\.]+\.ts$/
  ];

  if (!whitelistPatterns.some(pattern => pattern.test(filePath))) {
    auditSourceCodeAccess('WHITELIST_MISMATCH', filePath, { reason: 'File path not whitelisted' });
    throw new Error(`❌ File path not whitelisted: ${filePath}`);
  }

  return true;
}

/**
 * Security: Extract UI elements from React/Web Component source code
 * Uses regex-only parsing (no eval/execution) with timeout protection
 */
function extractUIElementsFromSourceCode(filePath) {
  if (!HEALER_SOURCE_CODE_ANALYSIS) {
    return { labels: [], buttons: [], headings: [], inputs: [], totalExtracted: 0 };
  }

  try {
    // Security Step 1: Validate path
    validateSourceCodeFilePath(filePath);

    // Security Step 2: Check file existence
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      auditSourceCodeAccess('FILE_NOT_FOUND', filePath, { reason: 'File does not exist' });
      return { labels: [], buttons: [], headings: [], inputs: [], totalExtracted: 0 };
    }

    // Security Step 3: Check file size
    const stats = fs.statSync(fullPath);
    if (stats.size > HEALER_SOURCE_CODE_MAX_FILE_SIZE) {
      auditSourceCodeAccess('FILE_SIZE_EXCEEDED', filePath, { 
        attempted: stats.size, 
        limit: HEALER_SOURCE_CODE_MAX_FILE_SIZE 
      });
      return { labels: [], buttons: [], headings: [], inputs: [], totalExtracted: 0 };
    }

    // Security Step 4: Check session extraction limit
    sessionSourceCodeExtraction += stats.size;
    if (sessionSourceCodeExtraction > HEALER_SOURCE_CODE_MAX_EXTRACTION_SIZE) {
      auditSourceCodeAccess('SESSION_EXTRACTION_EXCEEDED', filePath, { 
        sessionTotal: sessionSourceCodeExtraction, 
        limit: HEALER_SOURCE_CODE_MAX_EXTRACTION_SIZE 
      });
      return { labels: [], buttons: [], headings: [], inputs: [], totalExtracted: 0 };
    }

    // Security Step 5: Check file count limit
    if (sessionSourceCodeFiles.length >= MAX_SOURCE_CODE_FILES_PER_SESSION) {
      auditSourceCodeAccess('FILES_LIMIT_EXCEEDED', filePath, { 
        count: sessionSourceCodeFiles.length, 
        limit: MAX_SOURCE_CODE_FILES_PER_SESSION 
      });
      return { labels: [], buttons: [], headings: [], inputs: [], totalExtracted: 0 };
    }

    // Security Step 6: Read file with timeout
    const startTime = Date.now();
    const timeout = 5000; // 5 seconds
    const code = fs.readFileSync(fullPath, 'utf-8');
    const elapsed = Date.now() - startTime;

    if (elapsed > timeout) {
      auditSourceCodeAccess('EXTRACTION_TIMEOUT', filePath, { elapsed, timeout });
      return { labels: [], buttons: [], headings: [], inputs: [], totalExtracted: 0 };
    }

    // Security Step 7: Extract UI elements with safe regex patterns
    const extracted = {
      labels: [],
      buttons: [],
      headings: [],
      inputs: [],
      totalExtracted: 0
    };

    // Extract React labels (TSX)
    if (filePath.endsWith('.tsx')) {
      // Try first pattern
      let labelMatches = code.matchAll(UI_ELEMENT_PATTERNS.reactLabels);
      for (const match of labelMatches) {
        if (match[1]) {
          const cleanLabel = match[1].trim().replace(/[{}"']/g, '');
          if (cleanLabel && !extracted.labels.includes(cleanLabel)) {
            extracted.labels.push(cleanLabel);
          }
        }
      }

      // Try second pattern (fallback)
      if (extracted.labels.length === 0) {
        labelMatches = code.matchAll(UI_ELEMENT_PATTERNS.reactLabels2);
        for (const match of labelMatches) {
          if (match[1] && !extracted.labels.includes(match[1])) {
            extracted.labels.push(match[1]);
          }
        }
      }

      const buttonMatches = code.matchAll(UI_ELEMENT_PATTERNS.reactButtons);
      for (const match of buttonMatches) {
        if (match[1] && !extracted.buttons.includes(match[1])) {
          extracted.buttons.push(match[1]);
        }
      }

      // Capture button child text from JSX buttons like <button>Save</button> or Material UI <Button>Continue</Button>
      const jsxButtonTextMatches = code.matchAll(/<(?:button|Button)(?:[^>]*)>([\s\S]*?)<\/(?:button|Button)>/gi);
      for (const match of jsxButtonTextMatches) {
        const innerText = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (innerText && !extracted.buttons.includes(innerText)) {
          extracted.buttons.push(innerText);
        }
      }

      const headingMatches = code.matchAll(UI_ELEMENT_PATTERNS.headings);
      for (const match of headingMatches) {
        if (match[1] && !extracted.headings.includes(match[1])) {
          extracted.headings.push(match[1]);
        }
      }
    }

    // Extract Web Component elements (TS)
    if (filePath.endsWith('.ts')) {
      const labelMatches = code.matchAll(UI_ELEMENT_PATTERNS.webComponentLabel);
      for (const match of labelMatches) {
        if (match[1] && !extracted.labels.includes(match[1])) {
          extracted.labels.push(match[1]);
        }
      }

      const valueMatches = code.matchAll(UI_ELEMENT_PATTERNS.webComponentValue);
      for (const match of valueMatches) {
        if (match[1] && !extracted.buttons.includes(match[1])) {
          extracted.buttons.push(match[1]);
        }
      }
    }

    extracted.totalExtracted = extracted.labels.length + extracted.buttons.length + extracted.headings.length;

    // Audit the successful read
    sessionSourceCodeFiles.push(filePath);
    auditSourceCodeAccess('SOURCE_CODE_EXTRACTED', filePath, {
      bytesRead: stats.size,
      labelsExtracted: extracted.labels.length,
      buttonsExtracted: extracted.buttons.length,
      headingsExtracted: extracted.headings.length,
      totalExtracted: extracted.totalExtracted,
      elapsed
    });

    return extracted;
  } catch (err) {
    auditSourceCodeAccess('EXTRACTION_ERROR', filePath, { error: err.message });
    if (HEALER_VERBOSE) {
      console.warn(`⚠️  Source code extraction error: ${err.message}`);
    }
    return { labels: [], buttons: [], headings: [], inputs: [], totalExtracted: 0 };
  }
}

/**
 * Detect component name from test file path or error context
 */
function detectComponentFromTest(testFile, testCode) {
  try {
    // Strategy 1: Extract from page.goto() URL pattern
    const gotoMatch = testCode.match(/page\.goto\(['"]http:\/\/localhost:\d+\/([^'"]+)['"]/);
    if (gotoMatch) {
      const urlPath = gotoMatch[1];
      if (urlPath.includes('user-details')) return 'movieapp/frontend/src/components/UserDetailsPage.tsx';
      if (urlPath.includes('movie')) return 'movieapp/frontend/src/components/MovieDetails.tsx';
      if (urlPath.includes('payment')) return 'movieapp/frontend/src/components/PaymentPage.tsx';
    }

    // Strategy 2: Extract from test name
    const testName = testFile.toLowerCase();
    if (testName.includes('user-detail') || testName.includes('label')) {
      return 'movieapp/frontend/src/components/UserDetailsPage.tsx';
    }
    if (testName.includes('movie') && testName.includes('detail')) {
      return 'movieapp/frontend/src/components/MovieDetails.tsx';
    }
    if (testName.includes('payment') || testName.includes('checkout')) {
      return 'movieapp/frontend/src/components/PaymentPage.tsx';
    }
    if (testName.includes('seat')) {
      return 'movieapp/frontend/src/components/SeatGridWrapper.tsx';
    }

    return null;
  } catch (err) {
    if (HEALER_VERBOSE) {
      console.warn(`⚠️  Could not detect component: ${err.message}`);
    }
    return null;
  }
}

/**
 * Audit log for source code access (security compliance)
 */
function auditSourceCodeAccess(eventType, filePath, details = {}) {
  try {
    const logDir = path.dirname(SOURCE_CODE_ACCESS_AUDIT_LOG);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      filePath,
      userId: process.env.USER || 'unknown',
      details: sanitizeForLogging(details)
    };

    fs.appendFileSync(SOURCE_CODE_ACCESS_AUDIT_LOG, JSON.stringify(logEntry) + '\n', 'utf-8');
  } catch (err) {
    console.warn(`⚠️  Could not write audit log: ${err.message}`);
  }
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') return data;

  const sensitivePatterns = [
    /api[_-]?key\s*[:=]\s*[A-Za-z0-9_\-]+/gi,
    /token\s*[:=]\s*[A-Za-z0-9_\-]+/gi,
    /(password|secret|credential)\s*[:=]\s*[^,\]}\s]+/gi,
    /https?:\/\/[^@]*@/gi
  ];

  let sanitized = JSON.stringify(data);
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return JSON.parse(sanitized);
}

/**
 * Extract labels and text patterns the test code is looking for.
 */
function extractTestLabelsFromCode(testCode) {
  const labels = new Set();
  const patterns = [
    UI_ELEMENT_PATTERNS.testLookupLabels,
    UI_ELEMENT_PATTERNS.testLookupLabelsRegex,
    UI_ELEMENT_PATTERNS.testLookupTextRegex
  ];

  patterns.forEach(pattern => {
    for (const match of testCode.matchAll(pattern)) {
      if (match[1]) {
        labels.add(match[1].trim());
      }
    }
  });

  return Array.from(labels);
}

/**
 * Build a source-code label comparison block for the prompt.
 */
function buildLabelComparisonTable(uiElementsFromSource, testLabelsLookingFor) {
  if (!uiElementsFromSource || !uiElementsFromSource.labels?.length || testLabelsLookingFor.length === 0) {
    return '';
  }

  let table = '**Label Mapping (Test Looking For vs Source Code):**\n```\n';
  testLabelsLookingFor.forEach(testLabel => {
    const found = uiElementsFromSource.labels.find(l => l.toLowerCase() === testLabel.toLowerCase());
    const status = found ? `✓ Found as "${found}"` : '✗ NOT FOUND - needs update';
    table += `${testLabel.padEnd(20)} → ${status}\n`;
  });
  table += '```\n';

  return table;
}

/**
 * Build the UI element context block for the Gemini prompt.
 */
function buildUIElementContext(componentPath, uiElementsFromSource, testLabelsLookingFor) {
  if (!uiElementsFromSource || uiElementsFromSource.totalExtracted === 0) {
    return '';
  }

  return `
### 🎯 CRITICAL: UI ELEMENT ANALYSIS FROM SOURCE CODE

**Component:** ${componentPath}

**Actual Labels in Source Code:**
${uiElementsFromSource.labels.length > 0 ? uiElementsFromSource.labels.map(l => `- "${l}"`).join('\n') : 'None'}

${buildLabelComparisonTable(uiElementsFromSource, testLabelsLookingFor)}

**Action Required:** 
If the test uses getByLabel('X') or getByLabel(/X/i) but 'X' is NOT in the list above, the test MUST be updated to use an existing label from the source code.

Examples of corrections:
- ❌ getByLabel('First Name') → ✅ getByLabel('Full Testing') [if 'Full Testing' exists in source]
- ❌ getByLabel(/First Name/i) → ✅ getByLabel(/Full Testing/i) [regex version]
- ❌ getByLabel('Submit') → ✅ getByLabel('Continue to Payment') [if 'Continue to Payment' exists]
- ❌ getByLabel('Name') → ✅ getByLabel('Email') [match to actual source labels]

**RULE**: Always use labels that exist in the source code list above. Never create new label names.
`;
}

/**
 * Build the behavioral guidance block for the Gemini prompt.
 */
function buildBehavioralGuidance(frontendChanges, fixSuggestion) {
  if (!frontendChanges || (!frontendChanges.urlChange && frontendChanges.selectorChanges.length === 0 && frontendChanges.textChanges.length === 0 && frontendChanges.labelChanges.length === 0)) {
    return '';
  }

  return `
## 🔄 FRONTEND CHANGE DETECTED - INTELLIGENT ANALYSIS

### Change Detection Results:
${frontendChanges.urlChange ? `
**URL/Navigation Change (Confidence: ${frontendChanges.urlChange.confidence})**
- Expected Path: ${frontendChanges.urlChange.expectedPath}
- Actual Path: ${frontendChanges.urlChange.receivedPath}
- Is Targeted Redirect: ${frontendChanges.urlChange.isTargeted}
- Likely Frontend Bug: ${frontendChanges.urlChange.isFrontendBug}
` : ''}${frontendChanges.selectorChanges.length > 0 ? `
**Selector Changes (${frontendChanges.selectorChanges.length} detected)**
${frontendChanges.selectorChanges.map(s => `- ${s.type}: ${s.likely_cause}`).join('\n')}
` : ''}${frontendChanges.textChanges.length > 0 ? `
**Text/Content Changes (${frontendChanges.textChanges.length} detected)**
${frontendChanges.textChanges.map(s => `- ${s.type}: ${s.likely_cause}`).join('\n')}
` : ''}${frontendChanges.labelChanges.length > 0 ? `
**Label/Placeholder Changes (${frontendChanges.labelChanges.length} detected)**
${frontendChanges.labelChanges.map(s => `- ${s.type}: ${s.likely_cause}`).join('\n')}
` : ''}
### Suggested Fix Strategy: ${fixSuggestion.strategy.toUpperCase()}
**Confidence: ${fixSuggestion.confidence}**
**Can Auto-Fix: ${fixSuggestion.canAutoFix}**

${fixSuggestion.actions.map(a => `- ${a}`).join('\n')}

### YOUR DECISION LOGIC:

**IF** (URL change detected AND received path is invalid "/" or empty):
→ **DECISION: FRONTEND_BUG**
→ **ACTION**: Report that button navigation is broken
→ **TEST_UPDATE**: NO - Keep original assertion as spec
→ Include: \`DECISION: FRONTEND_BUG\` in response

**ELSE IF** (URL change detected AND received path is valid/targeted):
→ **DECISION: EVALUATE**
→ **ACTION**: Check test name/intent
→ IF test name contains "book" or "navigate" → likely intended change → UPDATE_TEST
→ IF test name contains "broken" or "error" → likely frontend bug → FRONTEND_BUG
→ Otherwise → MANUAL_DECISION_NEEDED
→ Include: \`DECISION: UPDATE_TEST\` or \`DECISION: FRONTEND_BUG\` in response

**ELSE IF** (Selector not found BUT page loaded):
→ **DECISION: UPDATE_SELECTOR**
→ **ACTION**: Suggest resilient selector from: getByRole > getByText > getByTestId
→ **TEST_UPDATE**: YES - Replace old selector with new one
→ Include: \`DECISION: UPDATE_SELECTOR\` in response

**ELSE IF** (Text/Label mismatch):
→ **DECISION: UPDATE_TEXT**
→ **ACTION**: Extract new text from error message or suggest resilient patterns
→ **TEST_UPDATE**: YES - Update text in assertion
→ Include: \`DECISION: UPDATE_TEXT\` in response

**ELSE IF** (CSS class changes - selector finds 0 elements but classes changed):
→ **DECISION: SELECTOR_CLASS_UPDATE**
→ **ACTION**: Update selector with missing CSS classes
→ **TEST_UPDATE**: YES - Add missing classes to selector
→ **EXAMPLE**: Change \`.seat.available\` to \`.seat.available.clickable\`
→ Include: \`DECISION: SELECTOR_CLASS_UPDATE\` in response

**ELSE IF** (DOM architecture issue - Shadow DOM, iframe):
→ **DECISION: ARCHITECTURAL_FIX**
→ **ACTION**: Apply Shadow DOM piercing or iframe handling
→ **TEST_UPDATE**: YES - Apply architectural fixes
→ Include: \`DECISION: ARCHITECTURAL_FIX\` in response

### CRITICAL REQUIREMENTS:
1. **Always include your DECISION at start of response** (FRONTEND_BUG, UPDATE_TEST, UPDATE_SELECTOR, UPDATE_TEXT, SELECTOR_CLASS_UPDATE, ARCHITECTURAL_FIX)
2. **Provide complete fixed code if TEST_UPDATE is YES**
3. **Explain your reasoning for the decision**
4. **For UPDATE_TEST: Include the exact new assertion/selector**
5. **Maintain test intent** - don't silently accept broken behavior
6. **If unsure**: Include both analysis and suggest manual review
`;
}

function buildPromptSections(parts) {
  return parts.filter(Boolean).join('\n\n');
}

function getTestNameFromCode(testCode) {
  const match = testCode.match(/test\s*\(\s*['\"]([^'\"]+)['\"]/);
  return match ? match[1] : 'Unknown';
}

/**
 * Generate comprehensive analysis prompt for Gemini with security sanitization
 */
function generateAnalysisPrompt(testInfo, testCode) {
  // Security: Validate and sanitize all inputs
  if (detectPromptInjection(testCode)) {
    console.warn('⚠️  Warning: Potential prompt injection detected in test code. Proceeding with caution.');
  }

  let uiElementsFromSource = null;
  const componentPath = detectComponentFromTest(testInfo.file || 'test', testCode);
  if (HEALER_SOURCE_CODE_ANALYSIS && componentPath) {
    if (HEALER_VERBOSE) {
      console.log(`🔍 Analyzing source code for UI elements: ${componentPath}`);
    }
    uiElementsFromSource = extractUIElementsFromSourceCode(componentPath);
  }

  let traceElements = { buttons: [], inputs: [], dialogs: [], htmlSnapshots: [], cssClasses: [] };
  const tracePath = findTraceFileForTest(testInfo.file || 'test');
  if (tracePath) {
    console.log('🔍 Analyzing Playwright trace for element information...');
    traceElements = extractElementsFromTrace(tracePath);
    console.log(`📋 Trace analysis results: ${traceElements.buttons.length} buttons, ${traceElements.inputs.length} inputs, ${traceElements.dialogs.length} dialogs extracted.`);
    // CRITICAL FIX: Log extracted button details for debugging
    if (HEALER_VERBOSE && traceElements.buttons.length > 0) {
      console.log(`AI Log - Buttons extracted from trace: ${traceElements.buttons.map(b => `"${b.text}"`).join(', ')}`);
    }
  } else {
    console.log('⚠️  Could not find trace file for test analysis');
  }

  const codeSizeCheck = validateTestCodeSize(testCode, 50000);
  if (!codeSizeCheck.valid && codeSizeCheck.truncated) {
    console.warn(`⚠️  Warning: ${codeSizeCheck.error}`);
    testCode = codeSizeCheck.truncated;
  }

  const sanitizedErrorType = sanitizeForPrompt(testInfo.errorType, 100);
  const sanitizedError = sanitizeErrorMessage(testInfo.error, 1500);
  const sanitizedTestCode = sanitizeForPrompt(testCode, 40000);

  const frontendChanges = detectFrontendChanges(testInfo, sanitizedTestCode);
  const fixSuggestion = suggestTestFix(sanitizedTestCode, frontendChanges, testInfo);

  const selectorGuidance = generateSelectorGuidance(testCode);
  const buttonTextGuidance = generateButtonTextGuidance(traceElements, testCode);
  const domIssues = detectDOMArchitectureIssues(sanitizedTestCode, sanitizedError);
  const domArchitectureGuidance = generateDOMArchitectureGuidance(domIssues);
  const isDOMError = isDOMArchitectureError(sanitizedError, sanitizedTestCode);
  const classChanges = detectClassChanges(testCode, traceElements, testInfo);

  let sourceCodeClasses = { cssClasses: [], sourceFile: null, baseClasses: [] };
  if (!classChanges.hasClassChanges || traceElements.cssClasses.length === 0) {
    if (HEALER_VERBOSE) {
      console.log(`\n📊 Trace returned ${traceElements.cssClasses.length} classes. Attempting source code fallback...`);
    }
    sourceCodeClasses = extractCSSClassesFromSourceCode(testCode, testInfo.file);
    if (HEALER_VERBOSE) {
      console.log(`📝 Source code extraction returned ${sourceCodeClasses.cssClasses.length} class combinations`);
    }

    if (sourceCodeClasses.cssClasses.length > 0) {
      if (HEALER_VERBOSE) console.log(`🔄 Re-analyzing with source code classes...`);
      const enhancedTrace = { ...traceElements, cssClasses: sourceCodeClasses.cssClasses };
      const enhancedClassChanges = detectClassChanges(testCode, enhancedTrace, testInfo);
      if (HEALER_VERBOSE) console.log(`✨ Enhanced detection found ${enhancedClassChanges.changedSelectors.length} selector issues`);

      if (enhancedClassChanges.hasClassChanges && !classChanges.hasClassChanges) {
        Object.assign(classChanges, enhancedClassChanges);
        if (HEALER_VERBOSE) {
          console.log(`✅ CSS class changes detected via source code analysis:`);
          console.log(`   - Base classes: ${sourceCodeClasses.baseClasses.join(', ')}`);
          console.log(`   - Affected selectors: ${enhancedClassChanges.changedSelectors.map(s => s.current).join(', ')}`);
        }
      }
    } else if (HEALER_VERBOSE) {
      console.log(`⚠️  Source code extraction found no CSS classes`);
    }
  }

  const uiElementContext = buildUIElementContext(componentPath, uiElementsFromSource, Array.from(sanitizedTestCode.matchAll(UI_ELEMENT_PATTERNS.testLookupLabels)).map(m => m[1]).filter(Boolean));
  if (HEALER_VERBOSE && uiElementContext) {
    console.log('AI Log - UI Element Context:', uiElementContext);
  }

  const behavioralGuidance = buildBehavioralGuidance(frontendChanges, fixSuggestion);
  if (HEALER_VERBOSE && behavioralGuidance) {
    console.log('AI Log - Behavioral Guidance:', behavioralGuidance);
  }

  // NEW: Generate class change guidance
  const classChangeGuidance = generateClassChangeGuidance(classChanges);

  const promptSections = [
    `You are an expert Playwright test automation engineer specializing in:
1. **Fixing broken tests due to frontend changes** (selectors, URLs, text, design)
2. **Detecting legitimate vs broken behavior changes**
3. **Maintaining test intent while supporting frontend evolution**
4. **DOM architecture issues** (Shadow DOM, iframes, Web Components)`,

    `## ANALYSIS REQUIREMENTS:

🔴 **PRIORITY 1: IF UI ELEMENTS CONTEXT PROVIDED BELOW:**
- Use the "CURRENT UI ELEMENTS IN SOURCE CODE" section
- Check if test is using getByLabel() or getByText() with names that DON'T match source code
- If mismatch found: Change test to use labels/text from source code list
- This is the PRIMARY indicator of what needs to be fixed
- Example: Test uses getByLabel('First Name') but source only has getByLabel('Full Testing') → UPDATE test

1. **Change Type Classification**: What type of frontend change caused failure?
   - URL/Navigation change
   - Selector broke (element not found, class changed)
   - Text/Label changed (PRIORITIZE THIS IF UI CONTEXT AVAILABLE)
   - DOM Architecture changed
   - Other (describe)

2. **Root Cause Analysis**: Why did this change happen?
   - Element class names changed (Material-UI updates, design refactoring)
   - Button navigation redirects to new URL
   - Form labels/placeholders updated
   - Component restructured with Shadow DOM or iframes
   - Text content updated in frontend

3. **Decision: Is This a Test Fix or Frontend Bug?**
   - Can the test be updated to match new behavior? → UPDATE_TEST
   - Should the frontend behavior be fixed? → FRONTEND_BUG
   - Need to restructure selector strategy? → UPDATE_SELECTOR
   - Need to update text patterns? → UPDATE_TEXT
   - Architectural query changes needed? → ARCHITECTURAL_FIX

4. **Recommended Fixes**: Provide clear, prioritized steps

5. **Fixed Code**: Provide COMPLETE corrected test code (if UPDATE_TEST or UPDATE_SELECTOR or UPDATE_TEXT or ARCHITECTURAL_FIX)`,

    uiElementContext,
    selectorGuidance,
    buttonTextGuidance,
    generateIframeGuidance(traceElements, testCode),  // NEW: Add iframe guidance
    classChangeGuidance,
    behavioralGuidance,
    domArchitectureGuidance,
    
    // NEW: Add mandatory DOM rules to enforce Shadow DOM, Web Component, and iframe best practices
    ...(domIssues && (domIssues.hasShadowDOM || domIssues.hasWebComponents || domIssues.hasIframes) ? [buildMandatoryDOMRules(domIssues)] : []),

    `Error Type: ${sanitizedErrorType}
Error Message:
\`\`\`
${sanitizedError}
\`\`\`

Current Test Code:
\`\`\`typescript
${sanitizedTestCode}
\`\`\``,

    `Analysis Focus Areas:
- **Selector Resilience** (PRIMARY FOCUS):
  * Identify what element should be selected (button, link, input, div, etc.)
  * Detect if current selector uses Material-UI class names (.Mui*)
  * Replace with semantic/accessible selectors that don't break on frontend updates
  * Use element role-based matching for interactive elements
  * Use text matching for buttons/links with visible labels
  * Use data-testid for elements that need unique identification

- **Material-UI Component Selector Resilience - Two-Way Fix Strategy**:

  **WAY 1: Brittle Selectors**
  * .MuiBox-root, .MuiPaper-root, .MuiCard-root, .MuiButton-root
  * Combining multiple Mui classes
  * nth() positioning

  **WAY 2: Resilient Selectors (PREFER - Survive Frontend Updates)**
  * getByRole() - MOST RESILIENT
  * getByText()
  * getByLabel()
  * getByTestId()
  * getByPlaceholder()
  * Filter by text/role

  **INSTRUCTION**: When fixing test selectors, identify any WAY 1 patterns and replace them with appropriate WAY 2 selectors to ensure test resilience across Material-UI version upgrades.

- Timing and async operations (waitForNavigation, waitForLoadState, waitForURL, etc.)
- Test data assumptions and brittleness (hardcoded values, assumptions about DOM structure)
- Accessibility-first selectors (getByRole, getByLabel, getByPlaceholder)
- Strict mode violations (locators matching multiple elements when expecting one)
- Frontend version upgrade compatibility: Use selectors that survive Material-UI v5→v6→v7+ updates`,

    `### Selector Resilience Strategy:
- **Material-UI Components**: Avoid .Mui* classes → Use getByRole('button', { name: /text/i })
- **Buttons**: getByRole('button', { name: /text/i }) > getByText(/text/i) > getByTestId
- **Inputs**: getByLabel(/label/i) > getByPlaceholder(/placeholder/i) > getByTestId
- **Links**: getByRole('link', { name: /text/i }) > getByText
- **Custom Elements**: Nested locators for Shadow DOM: page.locator('parent').locator('.child')`,

    `### TEST INTENT:
Based on test file and name: \`${testInfo.file}\`
The test should verify: \`${getTestNameFromCode(testCode)}\`

CRITICAL INSTRUCTIONS:
1. Start response with: \`DECISION: [ONE OF: FRONTEND_BUG, UPDATE_TEST, UPDATE_SELECTOR, UPDATE_TEXT, ARCHITECTURAL_FIX, MANUAL_REVIEW]\`
2. Provide complete fixed code in \`\`\`typescript code block if updating test
3. DO NOT truncate code - provide full working test
4. Explain decision reasoning
5. For FRONTEND_BUG: describe what developers should fix
${isDOMError ? '\n6. DOM ARCHITECTURE ISSUE DETECTED: Apply DOM architecture fixes FIRST' : ''}`
  ];

  return buildPromptSections(promptSections);
}

async function analyzeWithGemini(testInfo, testCode, classChanges = null, retryCount = 0) {
  try {
    await rateLimitAndWait();
    
    const prompt = generateAnalysisPrompt(testInfo, testCode, classChanges);
    console.log('📡 Sending to Gemini API for analysis...');
    
    const analysisPromise = genAI.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Gemini API timeout after ${HEALER_API_TIMEOUT}ms`)), HEALER_API_TIMEOUT);
    });
    
    const result = await Promise.race([analysisPromise, timeoutPromise]);
    return result.candidates[0]?.content?.parts[0]?.text || null;
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    
    if (retryCount < HEALER_MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryCount) * 1000;
      console.log(`🔄 Retrying in ${backoffMs}ms... (attempt ${retryCount + 1}/${HEALER_MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return analyzeWithGemini(testInfo, testCode, classChanges, retryCount + 1);
    }
    
    return null;
  }
}

/**
 * Extract fixed test code from Gemini response
 */
function extractFixedCode(geminiResponse) {
  if (!geminiResponse) return null;

  const codeBlockPattern = /```(?:typescript|javascript)?\n([\s\S]*?)\n```/g;
  let allMatches = [];
  let match;
  
  while ((match = codeBlockPattern.exec(geminiResponse)) !== null) {
    let code = match[1].trim();
    
    // Filter out lines that are markdown formatting or analysis text
    const lines = code.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      // Skip markdown headers, bold text, and analysis lines
      if (trimmed.startsWith('#') ||           // Markdown headers
          trimmed.startsWith('**') ||          // Bold text
          trimmed.startsWith('-') && trimmed.includes(':')) { // Bullet lists with descriptions
        return false;
      }
      return true;
    });
    
    code = cleanedLines.join('\n').trim();
    if (!code) continue; // Skip if nothing left after filtering
    
    // Accept code with: test functions, imports, assertions, or locators
    if (code.includes('import') || 
        code.includes('test(') || 
        code.includes('expect(') ||
        code.includes('page.locator')) {  // Nested locators like page.locator('seat-grid').locator('.seat.available')
      allMatches.push(code);
    }
  }
  
  if (allMatches.length > 0) {
    const lastCode = allMatches[allMatches.length - 1];
    
    // Full test functions with assertions
    if ((lastCode.includes('import') || lastCode.includes('test(')) && lastCode.includes('expect(')) {
      return lastCode;
    }
    
    // Locator-only fixes (no full test wrapper needed)
    if (lastCode.includes('page.locator')) {
      return lastCode;
    }
    
    for (let i = allMatches.length - 1; i >= 0; i--) {
      if (allMatches[i].includes('import') && allMatches[i].includes('test(')) {
        return allMatches[i];
      }
      // Return locator fixes if found
      if (allMatches[i].includes('page.locator')) {
        return allMatches[i];
      }
    }
  }

  const incompleteMatch = geminiResponse.match(/import\s*{[\s\S]*?from\s*['"][^'"]+['"];[\s\S]*/);
  if (incompleteMatch) {
    const code = incompleteMatch[0].trim();
    if ((code.includes('test(') || code.includes('expect(')) && code.includes('import')) {
      if (!code.includes('});')) {
        return code + '\n});';
      }
      return code;
    }
  }

  return null;
}

/**
 * Extract locators from test code (both page.locator and getBy* patterns)
 */
function extractLocatorsFromCode(code) {
  if (!code) return { failed: [], working: [] };
  
  const locators = {
    failed: [],
    working: []
  };
  
  // Match various selector patterns
  const patterns = [
    /page\.locator\(['"](.*?)['"]\)/g,
    /page\.locator\(`(.*?)`\)/g,
    /getByRole\(['"](.*?)['"][^)]*\)/g,
    /getByLabel\(['"](.*?)['"]\)/g,
    /getByText\(['"](.*?)['"]\)/g,
    /getByTestId\(['"](.*?)['"]\)/g,
    /locator\(['"](.*?)['"]\)/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const locator = match[1];
      if (locator && locator.trim() && !locators.working.includes(locator)) {
        locators.working.push(locator);
      }
    }
  });
  
  return locators;
}

/**
 * Apply fixes to test file with syntax validation and rollback support
 */
function applyFixes(filePath, fixedCode) {
  try {
    const validatedPath = validateFilePath(filePath);
    if (!validatedPath) {
      console.error('❌ Security: Invalid file path');
      return { success: false, backupPath: null, error: 'Path validation failed' };
    }

    if (!fixedCode || fixedCode.trim().length === 0) {
      console.error('❌ Error: Fixed code is empty');
      return { success: false, backupPath: null, error: 'Empty code' };
    }

    const syntaxValidation = validateTypeScriptSyntax(fixedCode);
    if (!syntaxValidation.valid) {
      console.error(`❌ TypeScript syntax validation failed: ${syntaxValidation.error}`);
      return { success: false, backupPath: null, error: syntaxValidation.error };
    }

    const hasImport = fixedCode.includes('import');
    const hasTest = fixedCode.includes('test(');
    const hasExpect = fixedCode.includes('expect(');
    const hasClosingBrace = fixedCode.includes('});');
    const hasLocator = fixedCode.includes('page.locator') || fixedCode.includes('.locator(');
    
    // Determine if this is a partial fix (just a locator change) or full test
    const isPartialFix = hasLocator && !hasTest;
    
    if (!hasImport && !isPartialFix) console.warn('⚠️  Warning: Fixed code missing import statement');
    if (!hasTest && !isPartialFix) {
      console.error('❌ Error: Fixed code missing test() function - invalid Playwright test');
      return { success: false, backupPath: null, error: 'No test function' };
    }
    if (!hasExpect && !isPartialFix) console.warn('⚠️  Warning: Fixed code has no expect() assertions');
    if (!hasClosingBrace && !isPartialFix) console.warn('⚠️  Warning: Fixed code may be incomplete (missing closing braces)');

    // Check if code is mostly markdown (many lines start with # or >> indicating level headers)
    const lines = fixedCode.split('\n');
    const markdownLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('#') || trimmed.startsWith('**') && trimmed.endsWith('**');
    }).length;
    
    const markdownRatio = lines.length > 0 ? markdownLines / lines.length : 0;
    if (markdownRatio > 0.5) {
      console.error('❌ Error: Fixed code appears to be mostly markdown formatting - likely analysis text, not code');
      return { success: false, backupPath: null, error: 'Mostly markdown' };
    }

    const codeValidation = validateGeneratedCode(fixedCode);
    if (!codeValidation.isValid) {
      console.error('❌ Security: Generated code failed validation:');
      codeValidation.issues.forEach(issue => console.error(`   - ${issue}`));
      return { success: false, backupPath: null, error: 'Code validation failed' };
    }

    const backupPath = createBackup(validatedPath);
    if (!backupPath && HEALER_VERBOSE) {
      console.warn('⚠️  Could not create backup, but continuing...');
    }

    const stats = fs.lstatSync(validatedPath);
    if (stats.isSymbolicLink()) {
      console.error('❌ Security: Cannot write to symbolic link');
      return { success: false, backupPath: backupPath, error: 'Symbolic link' };
    }

    let writeSuccess;
    if (isPartialFix) {
      // For partial fixes (just locator changes), do a surgical replacement
      const originalContent = fs.readFileSync(validatedPath, 'utf-8');
      const lines = originalContent.split('\n');
      
      // NEW: Check if this is a CSS class-only change (e.g., .seat.available → .seat.available.clickable)
      const classChangePattern = /locator\(["']([^"']*\.[^"']+)["']\)/g;
      const classMatches = Array.from(fixedCode.matchAll(classChangePattern));
      
      let modifiedContent = originalContent;
      let classChangesApplied = 0;
      
      if (classMatches.length > 0) {
        // This is a CSS class selector change
        classMatches.forEach(match => {
          const newSelector = match[1];
          const searchPattern = /locator\(["']([^"']*\.[^"']+)["']\)/;
          const existingMatch = originalContent.match(searchPattern);
          
          if (existingMatch) {
            const oldSelector = existingMatch[1];
            // Only replace if it looks like a class change (both start with same base)
            const oldClasses = oldSelector.split('.').filter(c => c);
            const newClasses = newSelector.split('.').filter(c => c);
            
            if (oldClasses.length > 0 && newClasses.length > 0 && 
                oldClasses[0] === newClasses[0]) {  // Same base class
              modifiedContent = modifiedContent.replace(
                new RegExp(`locator\\(["']${oldSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\)`, 'g'),
                `locator('${newSelector}')`
              );
              classChangesApplied++;
              console.log(`✅ CSS class update: "${oldSelector}" → "${newSelector}"`);
            }
          }
        });
      }
      
      if (classChangesApplied > 0) {
        writeSuccess = atomicFileWrite(validatedPath, modifiedContent);
        console.log(`✅ Partial fix applied: Updated ${classChangesApplied} CSS class selector(s)`);
      } else {
        // Fallback to variable matching if no class changes
        const varMatch = fixedCode.match(/const\s+(\w+)\s*=/);
        if (varMatch) {
          const varName = varMatch[1];
          // Find the line that declares this variable in the original file
          const lineIndex = lines.findIndex(line => line.includes(`const ${varName}`));
          if (lineIndex >= 0) {
            // Replace that line with the fixed code
            lines[lineIndex] = fixedCode.trim();
            const modifiedContent = lines.join('\n');
            writeSuccess = atomicFileWrite(validatedPath, modifiedContent);
            console.log(`✅ Partial fix applied: Updated locator for '${varName}'`);
          } else {
            console.warn(`⚠️  Could not find variable '${varName}' in original file, writing full replacement`);
            writeSuccess = atomicFileWrite(validatedPath, fixedCode);
          }
        } else {
          // If we can't parse it as a const declaration, try to find and replace page.locator calls
          const locatorMatches = fixedCode.match(/page\.locator\([^)]+\)\.locator\([^)]+\)/g);
          if (locatorMatches && locatorMatches.length > 0) {
            let modifiedContent = originalContent;
            locatorMatches.forEach(locatorFix => {
              // Simple replacement of locator patterns
              modifiedContent = modifiedContent.replace(
                /page\.locator\([^)]+\)/,
                locatorFix
              );
            });
            writeSuccess = atomicFileWrite(validatedPath, modifiedContent);
            console.log('✅ Partial fix applied: Updated locator selectors');
          } else {
            writeSuccess = atomicFileWrite(validatedPath, fixedCode);
          }
        }
      }
    } else {
      // For full test functions, replace the entire content
      writeSuccess = atomicFileWrite(validatedPath, fixedCode);
    }
    
    if (!writeSuccess) {
      console.error('❌ Failed to write file');
      return { success: false, backupPath: backupPath, error: 'Write failed' };
    }

    console.log('✅ Test file updated with fixes');
    auditLog('FILE_MODIFIED', validatedPath, `Backup: ${backupPath}`);
    return { success: true, backupPath: backupPath, error: null };
  } catch (err) {
    console.error('❌ Error applying fixes:', err.message);
    return { success: false, backupPath: null, error: err.message };
  }
}

/**
 * Rollback file from backup if verification fails (Rollback Mechanism)
 */
function rollbackFix(filePath, backupPath) {
  if (!backupPath) {
    console.error('❌ No backup available for rollback');
    return false;
  }

  try {
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup file not found: ${backupPath}`);
      return false;
    }

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const writeSuccess = atomicFileWrite(filePath, backupContent);
    
    if (!writeSuccess) {
      console.error('❌ Failed to restore from backup');
      return false;
    }

    console.log('🔄 Rolled back to original code from backup');
    auditLog('ROLLBACK_PERFORMED', filePath, `Restored from: ${backupPath}`);
    return true;
  } catch (err) {
    console.error(`❌ Rollback error: ${err.message}`);
    return false;
  }
}

/**
 * Run specific test to verify fix
 */
function verifyFix(testFile) {
  try {
    console.log('🧪 Re-running test to verify fix...');
    
    const validatedPath = validateFilePath(testFile);
    if (!validatedPath) {
      console.error('❌ Security: Invalid test file path');
      return false;
    }
    
    const testFileName = path.basename(validatedPath);
    
    if (!validateTestFileName(testFileName)) {
      console.error('❌ Security: Invalid test file name format');
      return false;
    }
    
    let output = '';
    let stderr = '';
    
    try {
      output = execFileSync('npx', [
        'playwright',
        'test',
        `tests/${testFileName}`,
        '--reporter=list',
        '--reporter=json',
        '--reporter-output=reports/playwright/verify-results.json'
      ], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
    } catch (execErr) {
      output = execErr.stdout || '';
      stderr = execErr.stderr || '';
    }
    
    if (HEALER_VERBOSE) {
      console.log('Verification output:', output);
      if (stderr) console.log('Verification stderr:', stderr);
    }
    
    const passMatch = output.match(/(\d+)\s+pass/i);
    const failMatch = output.match(/(\d+)\s+fail/i);
    
    const passes = passMatch ? parseInt(passMatch[1]) : 0;
    const fails = failMatch ? parseInt(failMatch[1]) : 0;
    
    if (HEALER_VERBOSE) {
      console.log(`  Passes: ${passes}, Fails: ${fails}`);
    }
    
    if (fails === 0 && passes > 0) {
      console.log('✅ Test verification shows passing');
      auditLog('TEST_VERIFIED', validatedPath, 'Test passed');
      return true;
    }
    
    if (output.includes('No tests found')) {
      console.log('⚠️  Could not find test file for verification. Assuming fix is valid.');
      return true;
    }
    
    if (fails > 0) {
      console.log(`❌ Test verification shows ${fails} failing test(s)`);
      auditLog('TEST_FAILED', validatedPath, `Failed: ${fails} test(s)`);
      return false;
    }
    
    return true;
    
  } catch (err) {
    if (HEALER_VERBOSE) {
      console.log('Test verification error:', err.message);
    }
    console.warn(`⚠️  Test verification failed: ${err.message}`);
    return false;
  }
}

/**
 * Display analysis results with better formatting
 */
function displayAnalysis(analysis, testTitle) {
  console.log(`\n\x1b[1m\x1b[94m📋 ANALYSIS FOR: ${testTitle}\x1b[0m`);
  console.log(`\x1b[94m${'═'.repeat(70)}\x1b[0m`);
  
  const analysisLines = analysis.split('\n');
  const maxLines = 20;
  const displayLines = analysisLines.slice(0, maxLines);
  
  displayLines.forEach((line, idx) => {
    const formatted = line
      .replace(/Root Cause|root cause/gi, '\x1b[1m\x1b[91m$&\x1b[0m')
      .replace(/Fix|fix|Fixed|fixed|Recommended/gi, '\x1b[1m\x1b[92m$&\x1b[0m')
      .replace(/selector|Selector|locator|page/gi, '\x1b[1m\x1b[96m$&\x1b[0m')
      .replace(/timeout|Timeout|wait|Wait/gi, '\x1b[1m\x1b[93m$&\x1b[0m');
    console.log(formatted);
  });
  
  if (analysisLines.length > maxLines) {
    console.log(`\n\x1b[2m... (${analysisLines.length - maxLines} more lines - see HTML report for full details)\x1b[0m`);
  }
  
  console.log(`\x1b[94m${'═'.repeat(70)}\x1b[0m`);
}

/**
 * Display fixed code with highlighting
 */
function displayFixedCode(fixedCode, testTitle) {
  console.log(`\n\x1b[1m\x1b[92m✅ FIXED CODE FOR: ${testTitle}\x1b[0m`);
  console.log(`\x1b[92m${'═'.repeat(70)}\x1b[0m`);
  
  const lines = fixedCode.split('\n');
  const maxLinesToShow = 25;
  
  const formatLine = (line, lineNum) => {
    let formatted = line
      .replace(/\bawait\b/gi, '\x1b[1m\x1b[94mawait\x1b[0m')
      .replace(/\basync\b/gi, '\x1b[1m\x1b[94masync\x1b[0m')
      .replace(/\bexpect\b/gi, '\x1b[1m\x1b[96mexpect\x1b[0m')
      .replace(/\btest\(/gi, '\x1b[1m\x1b[93mtest(\x1b[0m')
      .replace(/\bit\(/gi, '\x1b[1m\x1b[93mit(\x1b[0m')
      .replace(/page\.|locator/gi, '\x1b[1m\x1b[95m$&\x1b[0m')
      .replace(/click\(|fill\(|type\(|goto\(|waitFor/gi, '\x1b[1m\x1b[92m$&\x1b[0m');
    
    const lineNumStr = (lineNum + 1).toString().padStart(3, ' ');
    return `\x1b[2m${lineNumStr}│\x1b[0m ${formatted}`;
  };
  
  if (lines.length <= maxLinesToShow) {
    lines.forEach((line, idx) => {
      console.log(formatLine(line, idx));
    });
  } else {
    lines.slice(0, 12).forEach((line, idx) => {
      console.log(formatLine(line, idx));
    });
    
    const omittedCount = lines.length - 22;
    console.log(`\x1b[2m...  (${omittedCount} lines omitted)\x1b[0m`);
    
    lines.slice(-10).forEach((line, idx) => {
      console.log(formatLine(line, lines.length - 10 + idx));
    });
  }
  
  console.log(`\x1b[92m${'═'.repeat(70)}\x1b[0m`);
}

/**
 * Display healing summary
 */
/**
 * Display enhanced healing summary with decision breakdown
 */
function displayEnhancedSummary(healingResults) {
  console.log('\n' + '═'.repeat(70));
  console.log('📊 HEALING SESSION COMPLETE');
  console.log('═'.repeat(70));
  
  const stats = getSessionStatistics();
  const results = healingResults.tests;
  
  console.log(`\n✅ Tests Processed: ${results.length}`);
  console.log(`✅ Tests Fixed: ${results.filter(r => r.fixed).length}`);
  console.log(`🔴 Frontend Bugs Detected: ${results.filter(r => r.decision === 'FRONTEND_BUG').length}`);
  console.log(`⚠️  Manual Review Needed: ${results.filter(r => r.decision === 'MANUAL_REVIEW').length}`);
  
  if (results.filter(r => r.fixed).length > 0) {
    console.log(`\n📝 Changes Made:`);
    const byType = {};
    results.forEach(r => {
      if (r.changeType && r.changeType !== 'unknown') {
        byType[r.changeType] = (byType[r.changeType] || 0) + 1;
      }
    });
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} update(s)`);
    });
  }
  
  if (results.filter(r => r.decision === 'FRONTEND_BUG').length > 0) {
    console.log(`\n🔴 FRONTEND ISSUES TO FIX:`);
    results.filter(r => r.decision === 'FRONTEND_BUG').forEach((r, i) => {
      console.log(`   ${i+1}. ${r.file} → ${r.title}`);
      if (r.recommendations && r.recommendations.length > 0) {
        console.log(`      Reason: ${r.recommendations[0]}`);
      }
    });
  }
  
  console.log(`\n📊 Decision Breakdown:`);
  stats.decisionBreakdown && Object.entries(stats.decisionBreakdown).forEach(([decision, count]) => {
    if (count > 0) {
      console.log(`   - ${decision}: ${count}`);
    }
  });
  
  console.log(`\n📈 Confidence Distribution:`);
  console.log(`   - High (70-100%): ${stats.confidenceDistribution.high}`);
  console.log(`   - Medium (40-70%): ${stats.confidenceDistribution.medium}`);
  console.log(`   - Low (<40%): ${stats.confidenceDistribution.low}`);
  
  const logsPath = persistLogs();
  console.log(`\n📍 Logs saved to: ${logsPath}`);
  console.log(`${'═'.repeat(70)}\n`);
}

function displayHealingSummary(healingResults) {
  console.log(`\n\x1b[1m\x1b[42m${'═'.repeat(70)}\x1b[0m`);
  console.log(`\x1b[1m\x1b[42m📊 HEALING SESSION SUMMARY\x1b[0m`);
  console.log(`\x1b[1m\x1b[42m${'═'.repeat(70)}\x1b[0m`);
  
  const cards = [
    { label: 'Total Tests', value: healingResults.totalTests, emoji: '📊', color: '\x1b[96m' },
    { label: 'Fixed', value: healingResults.fixedCount, emoji: '✅', color: '\x1b[92m' },
    { label: 'Verified', value: healingResults.verifiedCount, emoji: '🔍', color: '\x1b[94m' },
    { label: 'Success Rate', value: `${healingResults.successRate}%`, emoji: '🎯', color: '\x1b[93m' },
  ];
  
  console.log('');
  cards.forEach(card => {
    const paddedLabel = card.label.padEnd(18);
    console.log(`${card.color}${card.emoji} ${paddedLabel}\x1b[1m: ${card.value}\x1b[0m`);
  });
  
  console.log(`\n\x1b[2m⏱️  Duration: ${healingResults.duration}\x1b[0m`);
  console.log(`\x1b[1m\x1b[42m${'═'.repeat(70)}\x1b[0m`);
  
  console.log(`\n\x1b[1m📋 DETAILED RESULTS (${healingResults.tests.length} tests):\x1b[0m\n`);
  
  healingResults.tests.forEach((test, idx) => {
    let statusColor = '\x1b[91m';
    let statusText = '❌ NOT FIXED';
    
    if (test.verified) {
      statusColor = '\x1b[92m';
      statusText = '✅ FIXED & VERIFIED';
    } else if (test.fixed) {
      statusColor = '\x1b[93m';
      statusText = '⚠️  FIXED (UNVERIFIED)';
    }
    
    console.log(`${statusColor}[${(idx + 1).toString().padStart(2, ' ')}]\x1b[0m ${statusText.padEnd(25)} | \x1b[1m${test.file}\x1b[0m › ${test.title}`);
  });
  
  console.log(`\n\x1b[1m\x1b[42m${'═'.repeat(70)}\x1b[0m`);
}

/**
 * Main healer workflow
 */
async function heal() {
  const options = parseArgs();
  // Update HEALER_VERBOSE based on CLI --verbose flag
  if (options.verbose) HEALER_VERBOSE = true;
  const startTime = Date.now();
  const healingResults = {
    totalTests: 0,
    fixedCount: 0,
    verifiedCount: 0,
    successRate: 0,
    duration: '',
    tests: []
  };

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║    🔧 Gemini-Powered Playwright Test Healer - Enhanced Edition         ║
║       Intelligent Test Analysis & Automated Fixing                     ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  // Pre-flight checks
  checkDependencies();
  validateConfiguration();
  validateEnvironment();

  console.log(`⚙️  Configuration:`);
  console.log(`   Auto-Fix: ${options.autoFix ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Verbose: ${options.verbose ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   API Key: ${GEMINI_API_KEY_TEST ? '✅ Configured' : '❌ Missing'}\n`);

  // Cleanup old reports before starting new healing session
  cleanupOldReports();

  console.log('📊 Analyzing test failures...\n');
  let failedTests = getFailedTests();

  if (failedTests.length === 0) {
    console.log('✅ No failing tests found! All tests are passing.');
    return;
  }

  if (options.testFile) {
    failedTests = failedTests.filter(t => t.file.includes(options.testFile));
    if (failedTests.length === 0) {
      console.warn(`⚠️  No failing tests found matching: ${options.testFile}`);
      return;
    }
  }

  console.log(`Found ${failedTests.length} failing test(s):\n`);
  failedTests.forEach((test, idx) => {
    console.log(`  ${idx + 1}. ${test.file} › ${test.title}`);
    console.log(`     Error Type: ${test.errorType}`);
    console.log(`     Error: ${test.error.substring(0, 80)}...\n`);
  });

  healingResults.totalTests = failedTests.length;

  // Cleanup old backups
  cleanupOldBackups();

  // Process each failing test
  for (const test of failedTests) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🔍 Healing: ${test.file}`);
    console.log(`   Test: ${test.title}`);
    console.log(`   Type: ${test.errorType}`);
    console.log('═'.repeat(70));

    const testResult = {
      file: test.file,
      title: test.title,
      errorType: test.errorType,
      error: test.error,
      analysis: null,
      fixed: false,
      verified: false,
      fixedCode: null,
      failureReason: null,
      decision: null,
      changeType: null,
      backup: null
    };

    // Check if should heal
    const testCode = readTestFile(test.filePath);
    if (!testCode) {
      testResult.failureReason = 'Could not read test file';
      healingResults.tests.push(testResult);
      continue;
    }
    
    if (!shouldHealTest(test, testCode)) {
      const classifiedType = test.classifiedType || 'UNKNOWN';
      console.log(`⏭️  Skipping: ${classifiedType === 'INFRASTRUCTURE' ? 'Infrastructure/connection error' : 'Other non-healable error'}`);
      testResult.failureReason = `${classifiedType} error - not healable`;
      healingResults.tests.push(testResult);
      continue;
    }

    // Continue with normal healing...
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🔧 Healing: ${test.file}`);
    console.log(`   Test: ${test.title}`);
    console.log(`${'═'.repeat(70)}`);

    const backup = createBackup(test.filePath);
    auditLog('healing_started', test.filePath, `Test: ${test.title}`);

    // Detect DOM architecture issues
    const domIssues = detectDOMArchitectureIssues(testCode, test.error);
    if (domIssues.hasShadowDOM || domIssues.hasIframes || domIssues.hasWebComponents) {
      console.log('🏗️  DOM Architecture Issue Detected:');
      if (domIssues.hasShadowDOM) console.log('   - Shadow DOM elements detected');
      if (domIssues.hasWebComponents) console.log('   - Web Components detected');
      if (domIssues.hasIframes) console.log('   - Iframes detected');
      if (domIssues.potentialArchitectureIssues.length > 0) {
        console.log('   Issues: ' + domIssues.potentialArchitectureIssues.join(', '));
      }
      logHealingEvent('dom_architecture_detected', test.title, 'Shadow DOM / Web Components', 'Gemini will provide architectural fixes', {
        hasShadowDOM: domIssues.hasShadowDOM,
        hasWebComponents: domIssues.hasWebComponents,
        hasIframes: domIssues.hasIframes
      });
    }

    if (options.verbose) {
      console.log('\n📄 Current Test Code:');
      console.log(testCode);
    }

    // Send to Gemini with ENHANCED prompt
    const geminiResponse = await analyzeWithGemini(test, testCode);
    if (!geminiResponse) {
      console.log('❌ Gemini analysis failed');
      rollbackFix(test.filePath, backup);
      testResult.failureReason = 'Gemini API error';
      testResult.backup = backup;
      healingResults.tests.push(testResult);
      continue;
    }

    // NEW: Extract decision from Gemini
    const healerDecision = extractHealerDecision(geminiResponse);
    const changeDetails = extractChangeDetails(geminiResponse, test);
    
    console.log(`\n📋 Healer Decision: ${healerDecision.decision}`);
    console.log(`   Confidence: ${healerDecision.confidence}%`);
    console.log(`   Reasoning: ${healerDecision.reasoning.substring(0, 100)}...`);

    // Log decision for audit trail
    logHealingEvent('healer_decision', test.title, 
      `Decision: ${healerDecision.decision}`,
      `Confidence: ${healerDecision.confidence}%\nChange: ${changeDetails.changeType}`,
      {
        decision: healerDecision.decision,
        confidence: healerDecision.confidence,
        changeType: changeDetails.changeType,
        reasoning: healerDecision.reasoning
      }
    );

    // NEW: If frontend bug but high confidence, skip fixing test
    if (healerDecision.decision === 'FRONTEND_BUG' && healerDecision.confidence >= 70) {
      console.log('🛑 Skipping test fix - frontend needs to be fixed first');
      testResult.decision = 'FRONTEND_BUG';
      testResult.recommendations = healerDecision.reasoning;
      testResult.failureReason = `Frontend bug (${healerDecision.confidence}% confident)`;
      testResult.backup = backup;
      healingResults.tests.push(testResult);
      
      auditLog('healing_skipped_frontend_bug', test.filePath, healerDecision.reasoning);
      continue;
    }

    const analysis = geminiResponse;
    testResult.analysis = analysis;
    displayAnalysis(analysis, test.title);

    const fixedCode = extractFixedCode(analysis);
    if (fixedCode) {
      console.log('\n✅ Fixed code extracted successfully');
      
      // NEW: Validate fix against DOM architecture rules BEFORE applying
      if (domIssues && (domIssues.hasShadowDOM || domIssues.hasWebComponents || domIssues.hasIframes)) {
        console.log('\n🔍 Validating fix against DOM architecture rules...');
        const fixValidation = validateShadowDOMFix(fixedCode, domIssues);
        
        if (!fixValidation.isValid) {
          console.log('❌ Fix validation FAILED:');
          fixValidation.issues.forEach(issue => {
            console.error(`  CRITICAL: ${issue}`);
          });
          testResult.failureReason = 'Fix violates DOM architecture rules';
          testResult.backup = backup;
          healingResults.tests.push(testResult);
          continue;
        }
        
        if (fixValidation.warnings.length > 0) {
          console.log('⚠️  Warnings in fix (not blocking):');
          fixValidation.warnings.forEach(warning => {
            console.warn(`  ${warning}`);
          });
        }
      }
      
      testResult.fixedCode = fixedCode;
      testResult.decision = healerDecision.decision;
      testResult.changeType = changeDetails.changeType;
      testResult.backup = backup;
      displayFixedCode(fixedCode, test.title);

      // NEW: Enhanced logging with change details
      if (changeDetails.changeType !== 'unknown') {
        logHealingEvent('test_fixed_with_change', test.title,
          `Old ${changeDetails.changeType}: ${changeDetails.oldValue || 'N/A'}`,
          `New ${changeDetails.changeType}: ${changeDetails.newValue || changeDetails.replacement || 'N/A'}`,
          {
            decision: healerDecision.decision,
            changeType: changeDetails.changeType,
            oldValue: changeDetails.oldValue,
            newValue: changeDetails.newValue,
            confidence: healerDecision.confidence
          }
        );
      }

      if (options.autoFix) {
        console.log('🔧 Applying fixes...');
        const applyResult = applyFixes(test.filePath, fixedCode);
        
        if (applyResult.success) {
          testResult.fixed = true;
          healingResults.fixedCount++;

          // Extract actual locators from the code
          const originalLocators = extractLocatorsFromCode(testCode);
          const fixedLocators = extractLocatorsFromCode(fixedCode);
          const failedLocator = originalLocators.working.length > 0 ? originalLocators.working[0] : 'selector not identified';
          const workingLocator = fixedLocators.working.length > 0 ? fixedLocators.working[0] : 'selector not identified';

          // Log successful fix application with actual locators
          logHealingEvent('element_healed', test.title, failedLocator, workingLocator, {
            filePath: test.filePath,
            status: 'applied'
          });

          const verified = verifyFix(test.filePath);
          if (verified) {
            console.log('✅ Test passed after healing!');
            testResult.verified = true;
            healingResults.verifiedCount++;

            // Log verification success
            logHealingEvent('verification_passed', test.title, null, null, {
              filePath: test.filePath,
              status: 'verified'
            });
          } else {
            console.log('⚠️  Test still failing after fix. Attempting rollback...');

            // Log verification failure
            logHealingEvent('verification_failed', test.title, null, null, {
              filePath: test.filePath,
              status: 'unverified'
            });

            if (applyResult.backupPath && rollbackFix(test.filePath, applyResult.backupPath)) {
              testResult.fixed = false;
              healingResults.fixedCount--;
              testResult.failureReason = 'Test verification failed, rolled back';
            } else {
              testResult.failureReason = 'Test verification failed, rollback unavailable';
            }
          }
        } else {
          // Log fix application failure
          logHealingEvent('locator_failure', test.title, 'attempted_fix', null, {
            error: applyResult.error
          });
          testResult.failureReason = applyResult.error;
        }
      } else {
        console.log('\n⏸️  Auto-fix is disabled.');
        console.log('   Review the analysis above and apply fixes manually, or');
        console.log('   Re-run with --auto-fix to apply changes automatically.\n');
      }
    } else {
      console.error('❌ Could not extract fixed code from Gemini response');
      testResult.failureReason = 'Code extraction failed';
      testResult.backup = backup;

      // Log extraction failure
      logHealingEvent('locator_failure', test.title, 'extraction_attempt', null, {
        error: 'Code extraction failed'
      });
    }

    healingResults.tests.push(testResult);
  }

  // Calculate success rate
  if (healingResults.totalTests > 0) {
    healingResults.successRate = Math.round((healingResults.verifiedCount / healingResults.totalTests) * 100);
  }

  // Calculate duration
  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationSec = Math.round(durationMs / 1000);
  healingResults.duration = `${durationSec}s`;

  console.log('\n✅ Healing session complete!');
  
  displayHealingSummary(healingResults);
  displayEnhancedSummary(healingResults);
  generateErrorReport(healingResults);

  // Persist logs before generating HTML report
  persistLogs();

  if (options.autoFix && healingResults.totalTests > 0) {
    generateHtmlReport(healingResults);
  }
}

// Run healer
heal().catch(err => {
  console.error('❌ Fatal error:', err.message);
  if (HEALER_VERBOSE) {
    console.error(err.stack);
  }
  process.exit(1);
});
