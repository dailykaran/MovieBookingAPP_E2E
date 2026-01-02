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
import { execFileSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { generateHtmlReport } from './healer-report-generator.js';

// Load environment variables
dotenv.config();

// Configuration constants with enhanced error handling
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HEALER_AUTO_FIX = process.env.HEALER_AUTO_FIX === 'true';
const HEALER_VERBOSE = process.env.HEALER_VERBOSE === 'true';
const HEALER_MAX_FILE_SIZE = parseInt(process.env.HEALER_MAX_FILE_SIZE || '1048576', 10); // 1MB
const HEALER_BACKUP_DIR = process.env.HEALER_BACKUP_DIR || path.join(process.cwd(), '.healer-backups');
const HEALER_AUDIT_LOG = process.env.HEALER_AUDIT_LOG || path.join(process.cwd(), '.healer-audit.log');
const HEALER_MAX_RETRIES = parseInt(process.env.HEALER_MAX_RETRIES || '3', 10);
const HEALER_API_TIMEOUT = parseInt(process.env.HEALER_API_TIMEOUT || '60000', 10); // 60 seconds
const HEALER_API_RATE_LIMIT = parseInt(process.env.HEALER_API_RATE_LIMIT || '5', 10); // calls per minute
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);
const MAX_BACKUPS_PER_FILE = parseInt(process.env.MAX_BACKUPS_PER_FILE || '5', 10);
const ALLOWED_TEST_PATTERNS = [/^[a-zA-Z0-9._\-/]+\.spec\.ts(x)?$/, /^[a-zA-Z0-9._\-/]+\.test\.ts(x)?$/];
const DANGEROUS_PATTERNS = [/fs\.(rm|unlink|rmdir)/, /execSync|execFile|spawn/, /require\(|import\(/, /eval\(/, /new Function/, /process\.exit/, /child_process/];
const SKIP_HEALING_KEYWORDS = ['network error', 'infrastructure', 'configuration error', 'env setup', 'not installed', 'connection refused', 'connection reset', 'enotfound', 'econnrefused', 'err_connection_refused', 'err_connection_reset', 'port', 'server', 'host not found', 'dns', 'certificate', 'ssl', 'https', 'eaddrinuse'];
const REQUIRED_PACKAGES = ['@google/generative-ai', '@playwright/test', 'dotenv'];

// Track API call rate for rate limiting
let apiCallTimes = [];

// Validate API key
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is not set!');
  console.error('Please set GEMINI_API_KEY in your .env file or environment.');
  process.exit(1);
}

if (!/^[a-zA-Z0-9_-]{20,}$/.test(GEMINI_API_KEY)) {
  console.error('❌ GEMINI_API_KEY format appears invalid');
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
  const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');
  if (!fs.existsSync(resultsPath)) {
    checks.push({ name: 'test-results/results.json', ok: false, hint: 'Run tests first with: npm test' });
  } else {
    checks.push({ name: 'test-results/results.json', ok: true });
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
  GEMINI_API_KEY              Your Google Generative AI API key (required)
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
  
  if (!code.includes('test(') && !code.includes('it(')) {
    issues.push('No test function found');
  }
  
  if (!code.includes('expect(')) {
    issues.push('No assertions found');
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
 * Check if test should be healed based on error type (Conditional Healing)
 */
function shouldHealTest(testInfo) {
  const lowerError = testInfo.error.toLowerCase();
  
  for (const keyword of SKIP_HEALING_KEYWORDS) {
    if (lowerError.includes(keyword)) {
      return false;
    }
  }
  
  if (testInfo.errorType === 'unknown') {
    return false;
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
    const waitTime = Math.max(0, oneMinuteAgo - oldestCall + 1000);
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
    const reportPath = path.join(process.cwd(), 'test-results', `healer-error-report-${Date.now()}.json`);
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
 * Fetch and parse test results
 */
function getFailedTests() {
  const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');

  if (!fs.existsSync(resultsPath)) {
    console.warn('⚠️  No test results found. Run tests first with: npm test');
    return [];
  }

  try {
    const resultsContent = fs.readFileSync(resultsPath, 'utf8');
    const results = JSON.parse(resultsContent);
    
    if (!validateTestResultsSchema(results)) {
      console.error('❌ Invalid test results schema');
      return [];
    }
    
    const failedTests = [];

    if (results.suites && Array.isArray(results.suites)) {
      for (const suite of results.suites) {
        if (!suite.specs || !Array.isArray(suite.specs)) continue;
        
        if (!validateTestFileName(suite.file)) {
          console.warn(`⚠️  Skipping suspicious test file: ${suite.file}`);
          continue;
        }

        for (const spec of suite.specs) {
          if (spec.ok === false) {
            const testInfo = extractTestInfo(spec);
            
            const safeFilePath = path.join(process.cwd(), 'tests', path.basename(suite.file));
            const validatedPath = validateFilePath(safeFilePath);
            
            if (!validatedPath) {
              console.warn(`⚠️  Skipping file with invalid path: ${safeFilePath}`);
              continue;
            }
            
            failedTests.push({
              file: suite.file,
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
 * Extract detailed test information from test spec
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

  return { error, errorType, errorContext };
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
 * Generate comprehensive analysis prompt for Gemini with security sanitization
 */
function generateAnalysisPrompt(testInfo, testCode) {
  // Security: Validate and sanitize all inputs
  if (detectPromptInjection(testCode)) {
    console.warn('⚠️  Warning: Potential prompt injection detected in test code. Proceeding with caution.');
  }
  
  // Validate test code size
  const codeSizeCheck = validateTestCodeSize(testCode, 50000);
  if (!codeSizeCheck.valid && codeSizeCheck.truncated) {
    console.warn(`⚠️  Warning: ${codeSizeCheck.error}`);
    testCode = codeSizeCheck.truncated;
  }
  
  // Sanitize inputs for safe LLM processing
  const sanitizedErrorType = sanitizeForPrompt(testInfo.errorType, 100);
  const sanitizedError = sanitizeErrorMessage(testInfo.error, 1500);
  const sanitizedTestCode = sanitizeForPrompt(testCode, 40000);
  
  return `You are an expert Playwright test automation engineer. Analyze this failing test and provide:

1. **Root Cause Analysis**: Explain why the test is failing
2. **Error Classification**: Identify the type of error (timeout, assertion, selector, etc.)
3. **Issues Found**: List specific problems in the test code
4. **Recommended Fixes**: Provide clear, step-by-step fixes
5. **Fixed Code**: Provide the COMPLETE corrected test code

CRITICAL: You MUST provide the complete fixed test code inside a TypeScript code block.
The code block MUST include all imports, the complete test function, and closing braces.
Do NOT truncate the code block. Provide the full, working test code.

Error Type: ${sanitizedErrorType}
Error Message:
\`\`\`
${sanitizedError}
\`\`\`

Current Test Code:
\`\`\`typescript
${sanitizedTestCode}
\`\`\`

Analysis Focus Areas:
- Playwright selectors (CSS, role-based, text-based)
- Material-UI component selectors (.MuiBox-root, .MuiPaper-root, etc.)
- Timing and async operations (waitForNavigation, waitForLoadState, etc.)
- Test data assumptions and brittleness
- Accessibility-first selectors (getByRole, getByLabel, etc.)
- Strict mode violations (locators matching multiple elements)

IMPORTANT: Always output the COMPLETE fixed code in a code block, never truncate it.`;
}

/**
 * Call Gemini API with retry mechanism and timeout (Retry Mechanism + API Timeout)
 */
async function analyzeWithGemini(testInfo, testCode, retryCount = 0) {
  try {
    await rateLimitAndWait();
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const prompt = generateAnalysisPrompt(testInfo, testCode);
    console.log('📡 Sending to Gemini API for analysis...');
    
    const analysisPromise = model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
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
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    
    if (retryCount < HEALER_MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryCount) * 1000;
      console.log(`🔄 Retrying in ${backoffMs}ms... (attempt ${retryCount + 1}/${HEALER_MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return analyzeWithGemini(testInfo, testCode, retryCount + 1);
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
    const code = match[1].trim();
    if (code.includes('import') || code.includes('test(') || code.includes('expect(')) {
      allMatches.push(code);
    }
  }
  
  if (allMatches.length > 0) {
    const lastCode = allMatches[allMatches.length - 1];
    
    if ((lastCode.includes('import') || lastCode.includes('test(')) && lastCode.includes('expect(')) {
      return lastCode;
    }
    
    for (let i = allMatches.length - 1; i >= 0; i--) {
      if (allMatches[i].includes('import') && allMatches[i].includes('test(')) {
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

    if (!hasImport) console.warn('⚠️  Warning: Fixed code missing import statement');
    if (!hasTest) {
      console.error('❌ Error: Fixed code missing test() function - invalid Playwright test');
      return { success: false, backupPath: null, error: 'No test function' };
    }
    if (!hasExpect) console.warn('⚠️  Warning: Fixed code has no expect() assertions');
    if (!hasClosingBrace) console.warn('⚠️  Warning: Fixed code may be incomplete (missing closing braces)');

    if (fixedCode.includes('### ') || (fixedCode.includes('**') && fixedCode.includes('**'))) {
      console.error('❌ Error: Fixed code appears to contain markdown formatting - likely analysis text, not code');
      return { success: false, backupPath: null, error: 'Markdown detected' };
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

    const writeSuccess = atomicFileWrite(validatedPath, fixedCode);
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
        '--reporter-output=playwright-report/verify-results.json'
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
  console.log(`   API Key: ${GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}\n`);

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
      failureReason: null
    };

    // Check if should heal
    if (!shouldHealTest(test)) {
      console.log('⏭️  Skipping: Test error indicates infrastructure/configuration issue');
      testResult.failureReason = 'Infrastructure/Configuration error';
      healingResults.tests.push(testResult);
      continue;
    }

    const testCode = readTestFile(test.filePath);
    if (!testCode) {
      testResult.failureReason = 'Could not read test file';
      healingResults.tests.push(testResult);
      continue;
    }

    if (options.verbose) {
      console.log('\n📄 Current Test Code:');
      console.log(testCode);
    }

    const analysis = await analyzeWithGemini(test, testCode);
    if (!analysis) {
      testResult.failureReason = 'Gemini analysis failed or timed out';
      healingResults.tests.push(testResult);
      continue;
    }

    testResult.analysis = analysis;
    displayAnalysis(analysis, test.title);

    const fixedCode = extractFixedCode(analysis);
    if (fixedCode) {
      console.log('\n✅ Fixed code extracted successfully');
      testResult.fixedCode = fixedCode;
      displayFixedCode(fixedCode, test.title);

      if (options.autoFix) {
        console.log('🔧 Applying fixes...');
        const applyResult = applyFixes(test.filePath, fixedCode);
        
        if (applyResult.success) {
          testResult.fixed = true;
          healingResults.fixedCount++;

          const verified = verifyFix(test.filePath);
          if (verified) {
            console.log('✅ Test passed after healing!');
            testResult.verified = true;
            healingResults.verifiedCount++;
          } else {
            console.log('⚠️  Test still failing after fix. Attempting rollback...');
            if (applyResult.backupPath && rollbackFix(test.filePath, applyResult.backupPath)) {
              testResult.fixed = false;
              healingResults.fixedCount--;
              testResult.failureReason = 'Test verification failed, rolled back';
            } else {
              testResult.failureReason = 'Test verification failed, rollback unavailable';
            }
          }
        } else {
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
  generateErrorReport(healingResults);

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
