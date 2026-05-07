# Advanced Self-Healing Test Mechanism - Comprehensive Study Guide

**Date**: May 3, 2026  
**Status**: Complete Analysis & Documentation  
**Scope**: Full-stack E2E test automation with AI-powered repair

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Detailed Workflow](#detailed-workflow)
5. [Security Architecture](#security-architecture)
6. [API Integration & Error Classification](#api-integration--error-classification)
7. [Advanced Error Handling](#advanced-error-handling)
8. [Configuration & Environment](#configuration--environment)
9. [Execution Flow & Control](#execution-flow--control)
10. [Debugging & Troubleshooting](#debugging--troubleshooting)
11. [Real-World Scenarios](#real-world-scenarios)

---

## Executive Summary

The **Self-Healing Test Mechanism** is an AI-powered automated test repair system that uses Google's Gemini API to analyze failing Playwright E2E tests and generate intelligent fixes. It represents a production-grade educational pattern combining:

- **Intelligent Error Classification**: Distinguishes between infrastructure vs. test/UI issues
- **Multi-layer Security**: Sanitizes all LLM inputs, validates generated code, prevents injection attacks
- **Automatic Backup & Rollback**: Creates snapshots before changes, reverts on failure
- **Comprehensive Audit Logging**: Tracks all operations for compliance
- **Professional Reporting**: Generates interactive HTML reports with detailed analysis
- **Behavioral Analytics**: Tracks decision patterns and confidence metrics

### Key Statistics
- **File Size**: 3,217 lines of Node.js code
- **Main File**: `gemini-healer.js`
- **Supporting Files**: 
  - `healer-report-generator.js` - HTML report generation
  - `verify-sanitization.js` - Security validation
  - `gemini-healer-selective.js` - Focused healing mode
- **Dependencies**: @google/generative-ai, @playwright/test, dotenv, adm-zip

### Success Metrics
- **Fixed Tests**: Tests successfully corrected and verified
- **Verified Tests**: Fixed tests that pass re-execution
- **Success Rate**: (Fixed + Verified) / Total × 100%
- **Confidence Levels**: High (70-100%), Medium (40-70%), Low (<40%)

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PLAYWRIGHT TEST EXECUTION                        │
│                                                                     │
│  $ npm test                                                         │
│  ↓                                                                  │
│  Generates: test-results/ → results.json (all test data)          │
│  Failures recorded with: title, error, errorType, location        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GEMINI HEALER ORCHESTRATOR                       │
│                        (gemini-healer.js)                          │
│                                                                     │
│  PHASE 1: DISCOVERY & VALIDATION                                  │
│  ├─ Parse CLI arguments & options                                 │
│  ├─ Load .env file & validate Gemini API key                      │
│  ├─ Check dependencies (npm packages)                             │
│  ├─ Pre-flight environment checks                                 │
│  └─ Parse test-results/results.json                               │
│                                                                     │
│  PHASE 2: ERROR ANALYSIS                                          │
│  ├─ For each failing test:                                        │
│  │  ├─ Extract error details (type, message, context)             │
│  │  ├─ Classify error type (INFRASTRUCTURE, SELECTOR, etc.)       │
│  │  ├─ Detect DOM architecture issues (Shadow DOM, iframes)       │
│  │  ├─ Read test source code                                      │
│  │  └─ Extract UI element patterns                                │
│  │                                                                 │
│  ├─ SECURITY CHECKS:                                              │
│  │  ├─ Sanitize error messages (remove PII)                       │
│  │  ├─ Validate input size (prevent token overflow)               │
│  │  ├─ Detect prompt injection attempts                           │
│  │  └─ Validate test file names (whitelist)                       │
│  │                                                                 │
│  │                                                                 │
│  ├─ Skip if:                                                      │
│  │  └─ Error classified as INFRASTRUCTURE → cannot fix            │
│  │                                                                 │
│  │                                                                 │
│  └─ Continue if: SELECTOR, ASSERTION, NAVIGATION, etc.            │
│                                                                     │
│  PHASE 3: AI ANALYSIS (Gemini API Call)                            │
│  ├─ Build analysis prompt with:                                   │
│  │  ├─ Test file content (sanitized)                              │
│  │  ├─ Error message (sanitized)                                  │
│  │  ├─ Error type (classified)                                    │
│  │  ├─ DOM architecture guidance                                  │
│  │  ├─ UI selector guidance                                       │
│  │  └─ Expected code structure                                    │
│  │                                                                 │
│  ├─ Send to Gemini API with:                                      │
│  │  ├─ Rate limiting (exponential backoff)                        │
│  │  ├─ Timeout handling (60s default)                             │
│  │  ├─ Retry mechanism (3 attempts)                               │
│  │  └─ Token counting                                             │
│  │                                                                 │
│  └─ Parse response for fixed code                                 │
│                                                                     │
│  PHASE 4: SECURITY VALIDATION                                     │
│  ├─ Validate generated code:                                      │
│  │  ├─ Syntax validation (TypeScript/JavaScript)                  │
│  │  ├─ Pattern matching (no dangerous imports)                    │
│  │  ├─ Size validation                                            │
│  │  └─ Code structure validation                                  │
│  │                                                                 │
│  ├─ Check for injection patterns:                                 │
│  │  ├─ Malicious imports (fs, child_process, os)                 │
│  │  ├─ Dangerous functions (eval, exec, spawn)                    │
│  │  └─ Process manipulation (process.exit)                        │
│  │                                                                 │
│  └─ Abort if code fails validation                                │
│                                                                     │
│  PHASE 5: BACKUP & APPLY                                          │
│  ├─ Create backup of original test file:                          │
│  │  ├─ Store in reports/audit/.healer-backups/                   │
│  │  ├─ Zip format for compression                                │
│  │  └─ Retention policy (7 days, 5 per file)                     │
│  │                                                                 │
│  ├─ Write fixed code to test file                                 │
│  ├─ Audit log the change                                          │
│  └─ Update fixing time to logs                                    │
│                                                                     │
│  PHASE 6: VERIFICATION (Re-run Test)                              │
│  ├─ Execute: npx playwright test <test-file>                      │
│  ├─ Capture exit code & output                                    │
│  ├─ Parse new results                                             │
│  │                                                                 │
│  └─ If test passes:                                               │
│     ├─ Mark as VERIFIED                                           │
│     └─ Record success in logs                                     │
│                                                                     │
│     If test fails:                                                │
│     ├─ Rollback to original file                                  │
│     ├─ Record failure reason                                      │
│     ├─ Mark for manual review                                     │
│     └─ Generate detailed error analysis                           │
│                                                                     │
│  PHASE 7: REPORTING & CLEANUP                                     │
│  ├─ Generate HTML report (healer-report-*.html)                   │
│  ├─ Persist healing logs (healing-logs.json)                      │
│  ├─ Generate error reports (if failures)                          │
│  ├─ Clean up old reports (keep last 5)                            │
│  └─ Display summary with statistics                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    HEALER REPORT GENERATOR                          │
│                  (healer-report-generator.js)                       │
│                                                                     │
│  Generates interactive HTML with:                                 │
│  ├─ Summary cards (total, fixed, verified, success rate)          │
│  ├─ Per-test expandable sections                                  │
│  ├─ Error details & AI analysis                                   │
│  ├─ Applied fixes with syntax highlighting                        │
│  ├─ Navigation & filtering                                        │
│  └─ Professional styling (Navy blue theme)                        │
│                                                                     │
│  Output: playwright-report/healer-report-<timestamp>.html          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. **Main File: `gemini-healer.js` (3,217 lines)**

The orchestrator that coordinates the entire healing workflow.

#### Structure

```javascript
// SECTION 1: Imports & Initialization (Lines 1-50)
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { generateHtmlReport } from './healer-report-generator.js';

// SECTION 2: Configuration Loading (Lines 51-150)
const GEMINI_API_KEY_TEST = process.env.GEMINI_API_KEY_TEST;
const HEALER_AUTO_FIX = process.env.HEALER_AUTO_FIX === 'true';
const HEALER_VERBOSE = process.env.HEALER_VERBOSE === 'true';
// ... 40+ configuration variables

// SECTION 3: Security Functions (Lines 151-900)
function validateFilePath(filePath) { /* ... */ }
function validateGeneratedCode(code) { /* ... */ }
function sanitizeForPrompt(input, maxLength) { /* ... */ }
function detectPromptInjection(input) { /* ... */ }
// ... more security functions

// SECTION 4: Logging System (Lines 901-1000)
function logHealingEvent(eventType, elementName, details) { /* ... */ }
function persistLogs() { /* ... */ }
function getSessionStatistics() { /* ... */ }

// SECTION 5: Error Handling & Classification (Lines 1001-1200)
function extractTestInfo(spec) { /* ... */ }
function classifyErrorType(errorMessage) { /* ... */ }
function isInfrastructureError(error) { /* ... */ }

// SECTION 6: DOM Architecture Detection (Lines 1201-1400)
function detectDOMArchitectureIssues(testCode, errorMessage) { /* ... */ }
function generateDOMArchitectureGuidance(domIssues) { /* ... */ }
function generateSelectorGuidance(testCode, errorMessage) { /* ... */ }

// SECTION 7: API Integration (Lines 1401-1600)
async function callGeminiAPI(prompt, retryCount) { /* ... */ }
function generateAnalysisPrompt(testCode, error, etc) { /* ... */ }
function extractFixedCode(response) { /* ... */ }

// SECTION 8: Test Execution & Verification (Lines 1601-1800)
function runTest(testFile) { /* ... */ }
function verifyFix(testFile) { /* ... */ }

// SECTION 9: Backup & Restore (Lines 1801-1900)
function createBackup(filePath) { /* ... */ }
function restoreFromBackup(filePath, backupPath) { /* ... */ }
function cleanupOldBackups(filePath) { /* ... */ }

// SECTION 10: Main Orchestration (Lines 1901-3217)
async function heal() { /* ... */ }

// EXECUTION ENTRY POINT
heal().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

### 2. **Report Generator: `healer-report-generator.js`**

Generates professional HTML reports with:
- Summary statistics
- Per-test analysis
- Error highlighting
- Fix visualization
- Interactive navigation

### 3. **Sanitization Validator: `verify-sanitization.js`**

Verifies that all 4 security functions are implemented:
1. ✅ `sanitizeForPrompt()` - Escapes & redacts user input
2. ✅ `sanitizeErrorMessage()` - Cleans error messages
3. ✅ `detectPromptInjection()` - Detects injection attempts
4. ✅ `validateTestCodeSize()` - Prevents token overflow

---

## Detailed Workflow

### Phase 1: Discovery & Validation

**Goal**: Prepare environment and parse test results

```javascript
async function heal() {
  // 1. Parse CLI arguments
  const options = parseArgs();
  // Returns: { autoFix, verbose, testFile, help }
  
  // 2. Load environment
  dotenv.config({ path: envPath });
  
  // 3. Validate API key exists and is properly formatted
  if (!GEMINI_API_KEY_TEST.startsWith('AIzaSy') || length < 30) {
    throw new Error('Invalid Gemini API key');
  }
  
  // 4. Run pre-flight checks
  checkDependencies();        // Verify npm packages installed
  validateConfiguration();    // Check all required env vars
  validateEnvironment();      // Verify ports, browser, etc.
  
  // 5. Parse test results
  const failedTests = getFailedTests();
  // Reads: test-results/results.json
  // Filters: Only failed specs, validates file names, sanitizes paths
}
```

**Exit conditions**:
- Missing GEMINI_API_KEY_TEST
- Missing npm dependencies
- No test results found

### Phase 2: Error Classification

**Goal**: Determine if test failure can be healed

```javascript
function classifyErrorType(errorMessage) {
  // INFRASTRUCTURE errors (cannot be healed)
  const INFRASTRUCTURE_ERRORS = [
    'connection refused', 'connection reset', 'enotfound',
    'econnrefused', 'host not found', 'dns', 'econnreset',
    'websocket closed', 'target closed', 'browser context closed',
    'timeout waiting for connection', 'socket hang up', etc.
  ];
  
  // Check infrastructure patterns
  for (const infError of INFRASTRUCTURE_ERRORS) {
    if (errorMessage.toLowerCase().includes(infError)) {
      return 'INFRASTRUCTURE';  // Skip healing
    }
  }
  
  // Classify healable errors
  if (errorMessage.includes('shadow dom') || errorMessage.includes('iframe')) {
    return 'DOM_ARCHITECTURE';
  }
  
  if (errorMessage.includes('strict mode') || errorMessage.includes('resolved to')) {
    return 'SELECTOR';
  }
  
  if (errorMessage.includes('expect') || errorMessage.includes('toHave')) {
    return 'ASSERTION';
  }
  
  if (errorMessage.includes('timeout')) {
    // Distinguish between connection timeout vs element timeout
    if (errorMessage.includes('connection') || errorMessage.includes('server')) {
      return 'INFRASTRUCTURE';
    }
    return 'TIMEOUT_ASSERTION';
  }
  
  return 'UNKNOWN';
}
```

**Classification Results**:
- **INFRASTRUCTURE** → Skip (cannot fix)
- **SELECTOR** → Healed by updating locators
- **ASSERTION** → Healed by updating expectations
- **NAVIGATION** → Healed by updating URL checks
- **TIMEOUT_ASSERTION** → Healed by fixing selectors/timing
- **DOM_ARCHITECTURE** → Healed with penetrating selectors
- **UNKNOWN** → Marked for manual review

### Phase 3: Security Sanitization

**Goal**: Prevent prompt injection and data leakage

```javascript
function sanitizeForPrompt(input, maxLength = 5000) {
  if (!input) return '';
  
  // 1. Remove sensitive data
  let sanitized = input
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    .replace(/Bearer\s+[A-Za-z0-9_-]+/g, '[TOKEN]')
    .replace(/password\s*[=:]\s*[^\s]+/gi, 'password=[REDACTED]')
    .replace(/api[_-]?key\s*[=:]\s*[^\s]+/gi, 'api_key=[REDACTED]');
  
  // 2. Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '\n...[truncated]';
  }
  
  // 3. Escape HTML special chars
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  return sanitized;
}

function detectPromptInjection(input) {
  const injectionPatterns = [
    /ignore all previous instructions/i,
    /system prompt|system message/i,
    /forget|disregard|override/i,
    /return to.*mode|return the|output the.*instruction/i,
    /execute.*code|run.*script/i,
    /<<SYS>>|[SYS]|{SYSTEM}/i
  ];
  
  return injectionPatterns.some(pattern => pattern.test(input));
}

function validateTestCodeSize(code, maxLength = 50000) {
  if (code.length > maxLength) {
    throw new Error(`Test code exceeds max size: ${code.length} > ${maxLength}`);
  }
  return true;
}
```

**Security Checks Performed**:
1. ✅ Remove PII (emails, SSNs, credit cards)
2. ✅ Remove credentials (tokens, API keys, passwords)
3. ✅ Detect prompt injection attempts
4. ✅ Validate input sizes to prevent token overflow
5. ✅ Escape HTML/special characters
6. ✅ Validate file paths (prevent traversal)
7. ✅ Validate test names (whitelist patterns)

### Phase 4: DOM Architecture Analysis

**Goal**: Detect and provide guidance for Shadow DOM and iframe issues

```javascript
function detectDOMArchitectureIssues(testCode, errorMessage) {
  const issues = {
    hasShadowDOM: false,
    hasIframes: false,
    hasWebComponents: false,
    potentialArchitectureIssues: [],
    recommendations: []
  };
  
  // Shadow DOM detection
  const shadowPatterns = [
    /seat-grid|custom-element|shadow/i,
    /getByRole\s*\(\s*['"`]button['"`]\).*seat/i,
    /page\.locator\(['"`]button[^'"`]*['"]\).*has-text/i
  ];
  
  shadowPatterns.forEach(pattern => {
    if (pattern.test(testCode)) {
      issues.hasShadowDOM = true;
    }
  });
  
  // Iframe detection
  if (/iframe|frameLocator|frame\(/i.test(testCode)) {
    issues.hasIframes = true;
  }
  
  // Web Components detection
  if (/page\.locator\(['"`]([a-z]+-[a-z]+)['"]\)/i.test(testCode)) {
    issues.hasWebComponents = true;
  }
  
  // Generate recommendations based on detections
  if (issues.hasShadowDOM) {
    issues.recommendations.push('Use nested locators: page.locator("parent").locator(".child.class")');
    issues.recommendations.push('Avoid getByRole() for Shadow DOM elements');
    issues.recommendations.push('Use CSS classes not :has-text() for reliability');
  }
  
  return issues;
}
```

**Special Case: Seat-Grid Shadow DOM**

```javascript
// PROBLEM: This fails because buttons are inside seat-grid Shadow DOM
❌ const seatButtons = page.locator("button:has-text('Seat')");

// SOLUTION 1: Use nested locators with classes
✅ const seatButtons = page.locator("seat-grid").locator(".seat.available");

// SOLUTION 2: Combine multiple classes
✅ const seatButtons = page.locator("seat-grid").locator(".seat.available.clickable");

// Why: Shadow DOM blocks external selectors, must use parent.locator(child)
```

### Phase 5: Gemini API Integration

**Goal**: Send analysis to AI and receive fixed code

```javascript
async function callGeminiAPI(prompt, retryCount = 0) {
  try {
    // Rate limiting with exponential backoff
    if (apiCallTimes.length >= HEALER_API_RATE_LIMIT) {
      const oldestCall = apiCallTimes.shift();
      const timeSinceLastBatch = Date.now() - oldestCall;
      const delayNeeded = 60000 - timeSinceLastBatch; // 1 minute window
      
      if (delayNeeded > 0) {
        console.log(`⏳ Rate limiting: waiting ${delayNeeded}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayNeeded));
      }
    }
    
    apiCallTimes.push(Date.now());
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), HEALER_API_TIMEOUT);
    
    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      signal: controller.signal
    });
    
    clearTimeout(timeoutHandle);
    
    const result = response.response.text();
    return result;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`API timeout after ${HEALER_API_TIMEOUT}ms`);
    }
    
    // Exponential backoff on retry
    if (retryCount < HEALER_MAX_RETRIES) {
      const delayMs = Math.pow(2, retryCount) * 1000;
      console.log(`⚠️  Retry ${retryCount + 1}/${HEALER_MAX_RETRIES} after ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callGeminiAPI(prompt, retryCount + 1);
    }
    
    throw error;
  }
}

// Generate comprehensive analysis prompt
function generateAnalysisPrompt(testCode, sanitizedError, errorType, domIssues) {
  let prompt = `You are a Playwright test repair expert.

## Failed Test
\`\`\`typescript
${sanitizedTestCode}
\`\`\`

## Error Information
- **Type**: ${errorType}
- **Message**: ${sanitizedError}

## DOM Architecture Analysis
${domArchitectureGuidance}

## Your Task
1. Identify the root cause
2. Fix only the BROKEN code
3. Output ONLY the corrected test code in a code block
4. Do NOT change working parts

## Code Patterns to Use
- ${selectorGuidance}
`;
  
  return prompt;
}
```

**API Call Flow**:
1. Check rate limit (5 calls/minute default)
2. Create timeout controller (60s default)
3. Send prompt to Gemini API
4. Parse response for code block
5. Extract fixed code
6. On error: retry with exponential backoff (max 3 times)
7. On timeout: fail gracefully with details

### Phase 6: Code Validation

**Goal**: Ensure generated code is safe and syntactically correct

```javascript
function validateGeneratedCode(code) {
  const issues = [];
  
  // Dangerous pattern detection
  const DANGEROUS_PATTERNS = [
    /fs\.(rm|unlink|rmdir)/,
    /execSync|execFile|spawn/,
    /require\(|import\(/,
    /eval\(/,
    /new Function/,
    /process\.exit/,
    /child_process/
  ];
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      issues.push(`Dangerous pattern detected: ${pattern}`);
    }
  }
  
  // Suspicious imports
  if (code.match(/import.*fs|import.*child_process|import.*os/)) {
    issues.push('Suspicious imports (fs, child_process, os)');
  }
  
  // Structural validation
  const isPartialFix = code.includes('page.locator') && !code.includes('test(');
  
  if (!isPartialFix) {
    // Full test - must have structure
    if (!code.includes('test(') && !code.includes('it(')) {
      issues.push('No test function found');
    }
    if (!code.includes('expect(')) {
      issues.push('No assertions found');
    }
  }
  
  // TypeScript syntax validation
  const syntaxValidationCmd = `npx tsc --noEmit --skipLibCheck --strict false`;
  try {
    execFileSync('npx', ['tsc', '--noEmit', '--skipLibCheck'], { 
      input: code,
      encoding: 'utf8'
    });
  } catch (err) {
    issues.push(`TypeScript syntax error: ${err.message}`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings: []
  };
}
```

**Validation Checks**:
1. ✅ No dangerous functions (fs operations, exec, process manipulation)
2. ✅ No suspicious imports
3. ✅ Correct code structure (test functions, assertions)
4. ✅ TypeScript syntax validation
5. ✅ Size limits (prevent injection)
6. ✅ Pattern matching (no malicious code)

### Phase 7: Backup & Apply

**Goal**: Create snapshot before changes, enable rollback if verification fails

```javascript
function createBackup(filePath) {
  try {
    const fileName = path.basename(filePath);
    const backupDir = HEALER_BACKUP_DIR;
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create timestamped backup
    const timestamp = Date.now();
    const backupPath = path.join(
      backupDir, 
      `${fileName}.${timestamp}.backup.zip`
    );
    
    // Zip original file for compression
    const zip = new AdmZip();
    const fileContent = fs.readFileSync(filePath);
    zip.addFile(fileName, fileContent);
    zip.writeZip(backupPath);
    
    // Audit log
    auditLog('BACKUP_CREATED', filePath, `Backup: ${backupPath}`);
    
    // Cleanup old backups (retention policy)
    cleanupOldBackups(filePath);
    
    return backupPath;
    
  } catch (err) {
    console.error(`❌ Backup failed: ${err.message}`);
    throw err;
  }
}

function cleanupOldBackups(filePath) {
  const backupDir = HEALER_BACKUP_DIR;
  const fileName = path.basename(filePath);
  
  // Get all backups for this file
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(fileName))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtimeMs
    }))
    .sort((a, b) => b.time - a.time);
  
  // Keep only MAX_BACKUPS_PER_FILE and delete older than BACKUP_RETENTION_DAYS
  const oldThreshold = Date.now() - (BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  
  backups.forEach((backup, idx) => {
    if (idx >= MAX_BACKUPS_PER_FILE || backup.time < oldThreshold) {
      fs.unlinkSync(backup.path);
      auditLog('BACKUP_DELETED', filePath, `Removed: ${backup.name}`);
    }
  });
}

// Apply the fix
fs.writeFileSync(filePath, fixedCode, 'utf8');
auditLog('FIX_APPLIED', filePath, `Applied fix from Gemini`);
```

**Backup Features**:
- Compression (ZIP format)
- Timestamped naming
- Retention policy (7 days, 5 per file)
- Audit logging
- Rollback capability

### Phase 8: Verification

**Goal**: Re-run test to confirm fix works

```javascript
function verifyFix(testFile) {
  try {
    console.log(`🔍 Verifying fix for: ${testFile}`);
    
    // Re-run the specific test
    const result = spawnSync('npx', ['playwright', 'test', testFile], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30000
    });
    
    // Parse results
    const exitCode = result.status;
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    
    // Exit code 0 = pass, non-zero = fail
    if (exitCode === 0) {
      console.log(`✅ Test PASSED after fix!`);
      return {
        verified: true,
        output: stdout,
        exitCode
      };
    } else {
      console.log(`❌ Test still FAILING`);
      return {
        verified: false,
        output: stdout || stderr,
        exitCode,
        reason: 'Test failed after fix applied'
      };
    }
    
  } catch (err) {
    console.error(`❌ Verification error: ${err.message}`);
    return {
      verified: false,
      error: err.message,
      reason: 'Could not run test'
    };
  }
}
```

**Verification Flow**:
1. Execute: `npx playwright test <test-file>`
2. Check exit code (0 = pass)
3. If pass → Mark as VERIFIED ✅
4. If fail → Trigger rollback 🔄

---

## Security Architecture

### Multi-Layer Defense Strategy

```
INPUT LAYER
     │
     ▼
┌─────────────────────────────────────────┐
│ VALIDATION & SANITIZATION              │
│ ├─ Validate file paths (prevent ../)   │
│ ├─ Validate test names (whitelist)     │
│ ├─ Validate file sizes                 │
│ ├─ Sanitize error messages (remove PII)│
│ ├─ Sanitize test code for prompt       │
│ └─ Detect prompt injection             │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ API LAYER                               │
│ ├─ Rate limiting (5 calls/min)          │
│ ├─ Timeout handling (60s)               │
│ ├─ Request validation                   │
│ └─ Response parsing                     │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ CODE VALIDATION LAYER                   │
│ ├─ Dangerous pattern detection          │
│ ├─ TypeScript syntax validation         │
│ ├─ Code structure validation            │
│ ├─ Suspicious import detection          │
│ └─ Size limit enforcement               │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ PERSISTENCE & AUDIT LAYER               │
│ ├─ Backup creation (ZIP)                │
│ ├─ Atomic file writes                   │
│ ├─ Audit logging (all operations)       │
│ ├─ Change tracking                      │
│ └─ Rollback capability                  │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ REPORTING & VERIFICATION                │
│ ├─ Test re-execution                    │
│ ├─ Success/failure tracking             │
│ ├─ HTML report generation               │
│ └─ Error analysis                       │
└─────────────────────────────────────────┘
```

### Security Functions

#### 1. Path Validation

```javascript
function validateFilePath(filePath) {
  try {
    const resolved = path.resolve(filePath);
    const projectRoot = path.resolve(process.cwd());
    const testDir = path.resolve(process.cwd(), 'tests');
    
    // Check path is within project
    if (!resolved.startsWith(testDir) && !resolved.startsWith(projectRoot)) {
      throw new Error('Path traversal detected');
    }
    
    // Reject symbolic links
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) {
      throw new Error('Symbolic links not allowed');
    }
    
    // Check file size
    if (stats.size > HEALER_MAX_FILE_SIZE) {
      throw new Error(`File exceeds max size: ${HEALER_MAX_FILE_SIZE} bytes`);
    }
    
    return resolved;
    
  } catch (err) {
    console.error(`❌ Path validation failed: ${err.message}`);
    return null;
  }
}
```

#### 2. Test File Name Validation

```javascript
const ALLOWED_TEST_PATTERNS = [
  /^[a-zA-Z0-9._\-/]+\.spec\.ts(x)?$/,
  /^[a-zA-Z0-9._\-/]+\.test\.ts(x)?$/
];

function validateTestFileName(fileName) {
  const basename = path.basename(fileName);
  return ALLOWED_TEST_PATTERNS.some(pattern => pattern.test(basename));
}
```

#### 3. Audit Logging

```javascript
function auditLog(action, filePath, details = '') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,                           // BACKUP_CREATED, FIX_APPLIED, etc.
    filePath: path.basename(filePath),
    userId: process.env.USER || 'unknown',
    details,
    pid: process.pid
  };
  
  fs.appendFileSync(HEALER_AUDIT_LOG, JSON.stringify(logEntry) + '\n', 'utf8');
}

// Audit log location: reports/audit/.healer-audit.log
```

---

## API Integration & Error Classification

### Error Classification Matrix

| Error Type | Root Cause | Healable | Strategy |
|---|---|---|---|
| **INFRASTRUCTURE** | Connection refused, DNS, browser closed | ❌ NO | Skip healing |
| **SELECTOR** | Element not found, strict mode, ambiguous | ✅ YES | Update locators |
| **ASSERTION** | Unexpected value/text/state | ✅ YES | Update expectations |
| **NAVIGATION** | Wrong URL, redirect issue | ✅ YES | Update URL checks |
| **TIMEOUT_ASSERTION** | Element takes too long | ✅ YES | Fix selector/timing |
| **DOM_ARCHITECTURE** | Shadow DOM, iframe, Web Component | ✅ YES | Use nested locators |
| **UNKNOWN** | Unclear from error message | ⚠️ MAYBE | Manual review |

### Error Detection Patterns

```javascript
const INFRASTRUCTURE_ERRORS = [
  'connection refused',      // Server not listening
  'connection reset',        // Server closed connection
  'enotfound',              // DNS resolution failed
  'econnrefused',           // TCP connection refused
  'host not found',         // DNS failed
  'dns',                    // DNS related
  'econnreset',             // TCP reset
  'websocket closed',       // WebSocket closed
  'target closed',          // Browser target closed
  'browser context was closed', // Test context ended
  'timeout waiting for connection', // Connection timeout
  'socket hang up',         // Socket error
  'socket error',           // Generic socket error
  'epipe',                  // Pipe error
  'err_name_not_resolved',  // DNS failure
  'err_connection_refused', // Connection refused
  'err_connection_reset',   // Connection reset
  'err_network_changed',    // Network changed
  'session not created'     // Browser session failed
];

// These CANNOT be fixed by test code changes
```

### Smart Gemini Prompt Construction

```javascript
function generateAnalysisPrompt(testCode, sanitizedError, errorType, domIssues, selectorIssues) {
  let prompt = `You are an expert Playwright test repair specialist.

## Task
Fix the failing Playwright test code to make it pass. Only modify what's broken.

## Test Code
\`\`\`typescript
${sanitizedTestCode}
\`\`\`

## Error Details
- **Type**: ${errorType}
- **Message**: ${sanitizedError}

## Context
${contextInfo}

## DOM Architecture Guidance
${domArchitectureGuidance}

## Selector Best Practices
${selectorGuidance}

## Requirements
1. Output ONLY the corrected code in a code block
2. Keep all passing assertions
3. Fix only the broken parts
4. Use proper Playwright patterns
5. Return complete test function

## Response Format
\`\`\`typescript
// CORRECTED CODE HERE
\`\`\``;

  return prompt;
}
```

---

## Advanced Error Handling

### Rate Limiting with Exponential Backoff

```javascript
const apiCallTimes = [];
const HEALER_API_RATE_LIMIT = 5; // 5 calls per minute
const HEALER_MAX_RETRIES = 3;

async function callGeminiAPI(prompt, retryCount = 0) {
  // Check rate limit (sliding window)
  if (apiCallTimes.length >= HEALER_API_RATE_LIMIT) {
    const oldestCall = apiCallTimes[0];
    const timeSinceLastBatch = Date.now() - oldestCall;
    const delayNeeded = 60000 - timeSinceLastBatch;
    
    if (delayNeeded > 0) {
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
      apiCallTimes.shift();
    }
  }
  
  apiCallTimes.push(Date.now());
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    return response.response.text();
    
  } catch (error) {
    if (retryCount < HEALER_MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 4s
      const delayMs = Math.pow(2, retryCount) * 1000;
      console.log(`⚠️  Retry ${retryCount + 1}/${HEALER_MAX_RETRIES} after ${delayMs}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callGeminiAPI(prompt, retryCount + 1);
    }
    
    throw error;
  }
}
```

### Timeout Handling

```javascript
async function callGeminiAPIWithTimeout(prompt) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), HEALER_API_TIMEOUT);
  
  try {
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      signal: controller.signal
    });
    clearTimeout(timeoutHandle);
    return response;
  } catch (error) {
    clearTimeout(timeoutHandle);
    if (error.name === 'AbortError') {
      throw new Error(`API timeout after ${HEALER_API_TIMEOUT}ms`);
    }
    throw error;
  }
}
```

### Rollback on Failure

```javascript
async function healAndVerify(testFile, fixedCode, backupPath) {
  try {
    // 1. Create backup
    const backup = createBackup(testFile);
    
    // 2. Apply fix
    fs.writeFileSync(testFile, fixedCode, 'utf8');
    auditLog('FIX_APPLIED', testFile);
    
    // 3. Verify
    const verification = verifyFix(testFile);
    
    if (verification.verified) {
      console.log(`✅ Fix verified successfully!`);
      auditLog('FIX_VERIFIED', testFile);
      return { success: true, verified: true };
    } else {
      // 4. Rollback if verification fails
      console.log(`❌ Fix failed verification. Rolling back...`);
      restoreFromBackup(testFile, backup);
      auditLog('FIX_ROLLED_BACK', testFile, `Reason: ${verification.reason}`);
      return { success: false, verified: false };
    }
    
  } catch (err) {
    // Emergency rollback
    console.error(`❌ Error during fix/verify: ${err.message}`);
    try {
      restoreFromBackup(testFile, backupPath);
      auditLog('EMERGENCY_ROLLBACK', testFile);
    } catch (rollbackErr) {
      console.error(`❌ CRITICAL: Rollback failed: ${rollbackErr.message}`);
    }
    throw err;
  }
}
```

---

## Configuration & Environment

### Environment Variables

```bash
# .env file in e2e/ directory

# REQUIRED
GEMINI_API_KEY_TEST=AIzaSy...             # Google Generative AI API key

# OPTIONAL - Healer Behavior
HEALER_AUTO_FIX=false                     # Auto-apply fixes without prompt
HEALER_VERBOSE=false                      # Show detailed debug info
HEALER_SOURCE_CODE_ANALYSIS=false         # Enable source code analysis

# OPTIONAL - API Configuration
HEALER_API_TIMEOUT=60000                  # API timeout in ms (default: 60s)
HEALER_API_RATE_LIMIT=5                   # API calls per minute (default: 5)
HEALER_MAX_RETRIES=3                      # Retry attempts (default: 3)

# OPTIONAL - File Size Limits
HEALER_MAX_FILE_SIZE=1048576              # Max test file size (1MB default)
HEALER_SOURCE_CODE_MAX_FILE_SIZE=500000   # Max source file size (500KB)
HEALER_SOURCE_CODE_MAX_EXTRACTION_SIZE=2097152  # Total extraction size (2MB)

# OPTIONAL - Backup & Retention
BACKUP_RETENTION_DAYS=7                   # Days to keep backups (default: 7)
MAX_BACKUPS_PER_FILE=5                    # Max backups per file (default: 5)

# OPTIONAL - Directory Paths
HEALER_BACKUP_DIR=reports/audit/.healer-backups
HEALER_AUDIT_LOG=reports/audit/.healer-audit.log
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click "Create new API key"
3. Select "Create API key in new project"
4. Copy the key (starts with `AIzaSy`)
5. Add to `.env` file as `GEMINI_API_KEY_TEST=<your-key>`

### Pre-flight Checks

```javascript
function validateEnvironment() {
  const checks = [
    {
      name: 'Gemini API Key',
      ok: GEMINI_API_KEY_TEST && GEMINI_API_KEY_TEST.startsWith('AIzaSy'),
      hint: 'Set GEMINI_API_KEY_TEST in .env file'
    },
    {
      name: 'Node.js Version',
      ok: parseInt(process.version.slice(1)) >= 18,
      hint: 'Node 18+ required for ES modules'
    },
    {
      name: 'npm Packages',
      ok: checkDependencies(),
      hint: 'Run: npm install'
    },
    {
      name: 'Test Results',
      ok: fs.existsSync(path.join(process.cwd(), 'reports/results/results.json')),
      hint: 'Run: npm test (to generate results)'
    }
  ];
  
  checks.forEach(check => {
    console.log(`${check.ok ? '✅' : '❌'} ${check.name}`);
    if (!check.ok) console.log(`   Hint: ${check.hint}`);
  });
}
```

---

## Execution Flow & Control

### Command Line Interface

```bash
# Analysis mode (no fixes applied)
npm run heal:gemini

# Auto-fix mode (apply fixes automatically)
npm run heal:gemini:auto

# Verbose mode (show detailed debugging)
npm run heal:gemini:verbose

# Direct execution
node gemini-healer.js [options] [test-file]

# Options
--auto-fix, -a    Apply fixes automatically
--verbose, -v     Show debug information
--help, -h        Show help message
```

### Main Execution Loop

```javascript
async function heal() {
  const startTime = Date.now();
  const healingResults = {
    totalTests: 0,
    fixedCount: 0,
    verifiedCount: 0,
    successRate: 0,
    duration: '',
    tests: []
  };
  
  try {
    // STEP 1: Initialization
    console.log('🔧 Gemini-Powered Playwright Test Healer');
    checkDependencies();
    validateConfiguration();
    validateEnvironment();
    
    // STEP 2: Get failed tests
    const failedTests = getFailedTests();
    if (failedTests.length === 0) {
      console.log('✅ All tests passing! Nothing to heal.');
      return;
    }
    
    console.log(`\n📊 Found ${failedTests.length} failing test(s)\n`);
    
    // STEP 3: Process each test
    for (const testInfo of failedTests) {
      console.log(`\n🔍 Processing: ${testInfo.file} › ${testInfo.title}`);
      
      // Step 3a: Classify error
      const classifiedType = classifyErrorType(testInfo.error);
      
      if (classifiedType === 'INFRASTRUCTURE') {
        console.log(`⏭️  Skipping INFRASTRUCTURE error (cannot heal)`);
        continue;
      }
      
      // Step 3b: Read test code
      const testCode = fs.readFileSync(testInfo.filePath, 'utf8');
      
      // Step 3c: Sanitize & analyze
      const sanitizedError = sanitizeErrorMessage(testInfo.error);
      const domIssues = detectDOMArchitectureIssues(testCode, testInfo.error);
      
      // Step 3d: Build prompt
      const prompt = generateAnalysisPrompt(
        testCode,
        sanitizedError,
        classifiedType,
        domIssues
      );
      
      // Step 3e: Call Gemini
      console.log(`📡 Calling Gemini API...`);
      const geminiResponse = await callGeminiAPI(prompt);
      
      // Step 3f: Extract & validate code
      const fixedCode = extractFixedCode(geminiResponse);
      const validation = validateGeneratedCode(fixedCode);
      
      if (!validation.isValid) {
        console.log(`❌ Generated code failed validation:`);
        validation.issues.forEach(issue => console.log(`   - ${issue}`));
        continue;
      }
      
      // Step 3g: Backup & apply
      const backup = createBackup(testInfo.filePath);
      fs.writeFileSync(testInfo.filePath, fixedCode, 'utf8');
      auditLog('FIX_APPLIED', testInfo.filePath);
      
      // Step 3h: Verify
      const verification = verifyFix(testInfo.filePath);
      
      if (verification.verified) {
        console.log(`✅ FIXED & VERIFIED!`);
        healingResults.fixedCount++;
        healingResults.verifiedCount++;
        logHealingEvent('element_healed', testInfo.title, fixedCode, null);
      } else {
        console.log(`⚠️  Fix applied but UNVERIFIED`);
        restoreFromBackup(testInfo.filePath, backup);
        healingResults.fixedCount++;
        logHealingEvent('fix_not_verified', testInfo.title, null, null);
      }
    }
    
    // STEP 4: Report
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const durationSec = Math.round(durationMs / 1000);
    
    healingResults.totalTests = failedTests.length;
    healingResults.successRate = Math.round(
      ((healingResults.fixedCount + healingResults.verifiedCount) / failedTests.length) * 100
    );
    healingResults.duration = `${durationSec}s`;
    
    // Generate HTML report
    await generateHtmlReport(healingResults);
    
    // Display summary
    displayHealingSummary(healingResults);
    
  } catch (err) {
    console.error(`\n❌ Fatal error: ${err.message}`);
    process.exit(1);
  }
}

// Execute
heal().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
});
```

---

## Debugging & Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `GEMINI_API_KEY_TEST not set` | Missing env var | Set in `.env` or environment |
| Invalid API key format | Wrong key format | Keys start with `AIzaSy`, 39+ chars |
| `npm packages missing` | Dependencies not installed | Run `npm install` |
| `No test results found` | Tests haven't run | Run `npm test` first |
| `API timeout` | Request took >60s | Check network, increase timeout |
| `Rate limit exceeded` | Too many API calls | Wait 60s or increase limit |
| `File validation failed` | Path traversal/dangerous path | Check file path is in tests/ |
| `Code validation failed` | Generated code has issues | Check Gemini output manually |
| `Verification failed` | Fix didn't work | Code might be correct but test issue |
| `Rollback failed` | Backup corrupted/missing | Check reports/audit/.healer-backups/ |

### Debug Mode

```bash
# Run with verbose logging
npm run heal:gemini:verbose

# Trace output
HEALER_VERBOSE=true node gemini-healer.js --verbose

# Check audit logs
cat reports/audit/.healer-audit.log

# View healing logs
cat reports/results/healing-logs.json

# Check backups
ls -la reports/audit/.healer-backups/

# View error reports
cat reports/healer/healer-error-report-*.json
```

### Manual Investigation

```javascript
// 1. Check test results
const results = JSON.parse(
  fs.readFileSync('test-results/results.json', 'utf8')
);
console.log(JSON.stringify(results, null, 2));

// 2. Check healing logs
const logs = JSON.parse(
  fs.readFileSync('reports/results/healing-logs.json', 'utf8')
);
console.log('Events:', logs.events);
console.log('Stats:', logs.statistics);

// 3. Check audit log
const auditLog = fs.readFileSync('reports/audit/.healer-audit.log', 'utf8');
console.log(auditLog);

// 4. Restore from backup
const zip = new AdmZip('reports/audit/.healer-backups/test.spec.ts.*.backup.zip');
zip.extractAllTo(process.cwd(), true);
```

---

## Real-World Scenarios

### Scenario 1: Selector Not Found (SHADOW DOM)

**Error**:
```
Error: Locator.click: Target page, context or browser has been closed
```

**Actual Issue**: Selector can't pierce Shadow DOM

**Solution**:
```javascript
// BEFORE (fails in Shadow DOM)
const seatButtons = page.locator("button:has-text('Seat 1')");

// AFTER (works with Shadow DOM)
const seatButtons = page.locator("seat-grid").locator(".seat.available:nth-child(1)");
```

**What Gemini Does**:
1. Detects "seat-grid" and "button" in code
2. Detects Shadow DOM architecture issue
3. Provides nested locator guidance
4. Generates: `page.locator("seat-grid").locator(".seat")`
5. Test re-runs and passes ✅

### Scenario 2: Strict Mode Violation

**Error**:
```
Locator.click: Resolves to 6 elements. Use locator.first(), locator.last() or locator.nth() to target the first, last or n-th element respectively.
```

**Issue**: Ambiguous selector matches multiple elements

**Solution**:
```javascript
// BEFORE
const bookButton = page.locator("button");

// AFTER
const bookButton = page.locator("button:has-text('Book')");
// OR
const bookButton = page.locator("button").first();
// OR with index
const bookButton = page.locator("button").nth(2);
```

### Scenario 3: Stale Element After Navigation

**Error**:
```
Error: Playwright detected that the page was navigated away while it was executing an action
```

**Issue**: Page reloaded during interaction

**Solution**:
```javascript
// BEFORE
await page.locator("button").click();
// No wait for navigation

// AFTER
await page.locator("button").click();
await page.waitForNavigation();
// OR use waitForFunction
await page.waitForFunction(() => window.location.pathname === '/payment');
```

### Scenario 4: Infrastructure Error (Skipped)

**Error**:
```
Browser context has been closed
```

**Classification**: INFRASTRUCTURE (cannot heal)

**Action**: Skip healing, report to stdout

**User Action**: Check if port 3000 is running, restart app

---

## Best Practices

### For Test Writers

1. **Use semantic selectors**
   ```javascript
   ✅ page.locator('button:has-text("Click me")')
   ❌ page.locator('.MuiButton-root')
   ```

2. **Handle Shadow DOM explicitly**
   ```javascript
   ✅ page.locator("custom-component").locator(".internal-button")
   ❌ page.locator(".internal-button")
   ```

3. **Use explicit waits**
   ```javascript
   ✅ await page.waitForSelector("button", { timeout: 5000 });
   ❌ await page.locator("button").click(); // Might timeout silently
   ```

4. **Add meaningful error messages**
   ```javascript
   ✅ expect(title, "Page title should be 'Home'").toBe('Home');
   ❌ expect(title).toBe('Home');
   ```

### For Debugging Failures

1. Run tests with headed mode
   ```bash
   npx playwright test --headed
   ```

2. Use debug mode
   ```bash
   npx playwright test --debug
   ```

3. Check test reports
   ```bash
   npx playwright show-report
   ```

4. Use healeranalyzer
   ```bash
   npm run heal:gemini:verbose
   ```

---

## Summary

The **Self-Healing Mechanism** is a sophisticated, multi-layered system that:

✅ **Automatically repairs failing tests** using AI analysis  
✅ **Classifies errors intelligently** to focus on fixable issues  
✅ **Protects security** with multi-layer sanitization  
✅ **Maintains audit trails** for compliance  
✅ **Provides professional reports** with detailed analysis  
✅ **Handles rollbacks** on verification failures  
✅ **Scales efficiently** with rate limiting & retry logic  

**Key Files**:
- `gemini-healer.js` - Main orchestrator (3,217 lines)
- `healer-report-generator.js` - Report generation
- `verify-sanitization.js` - Security validation

**Key Concepts**:
- Error classification (INFRASTRUCTURE vs. healable)
- Multi-layer security (input sanitization, code validation, audit logging)
- Intelligent Gemini prompting (context-aware guidance)
- Verification-driven fixes (test re-execution)
- Comprehensive reporting (HTML + JSON)

---

## References

- [Google Generative AI API](https://aistudio.google.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Node.js ES Modules](https://nodejs.org/en/docs/guides/ecmascript-modules/)
- [Security Best Practices](https://owasp.org/www-project-secure-coding-practices/)

---

**Created**: May 3, 2026  
**Status**: Complete & Ready for Learning  
**Version**: 1.0
