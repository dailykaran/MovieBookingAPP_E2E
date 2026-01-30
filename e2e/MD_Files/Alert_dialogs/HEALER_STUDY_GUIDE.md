# Gemini-Powered Test Healer - Study Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [File Breakdown](#file-breakdown)
4. [Core Concepts](#core-concepts)
5. [Security Measures](#security-measures)
6. [Data Flow](#data-flow)
7. [Configuration](#configuration)
8. [Extension Guide](#extension-guide)

---

## System Overview

**Purpose**: Automatically fix failing Playwright tests using Google Gemini AI by analyzing test failures, identifying broken selectors, and suggesting/applying resilient fixes.

**Key Features**:
- 🤖 AI-powered test analysis using Gemini API
- 🔄 Automatic retry with exponential backoff
- 💾 Backup & rollback mechanism
- 🔐 Security-first design (sanitization, validation, audit logging)
- 📊 HTML report generation with detailed healing logs
- ⚡ Rate limiting and timeout handling
- 🧪 Test verification after fixing

**Tech Stack**:
- Node.js (ES6 modules)
- Google Generative AI API (Gemini)
- Playwright (test automation)
- TypeScript support (test files)

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────┐
│  1. Run Tests (npm test)                │
│     ↓ Generates: test-results/results.json
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  2. Run Healer (node gemini-healer.js)  │
│     ↓ Parses test failures
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  3. Pre-flight Checks                   │
│     - Dependencies installed?           │
│     - Configuration valid?              │
│     - Environment ready?                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  4. For Each Failing Test               │
│     - Read test code                    │
│     - Analyze with Gemini               │
│     - Extract fixed code                │
│     - Create backup                     │
│     - Apply fix                         │
│     - Verify test passes                │
│     - Rollback if needed                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  5. Generate Reports                    │
│     - HTML report                       │
│     - Healing logs (JSON)               │
│     - Error report (if failures)        │
│     - Audit trail                       │
└─────────────────────────────────────────┘
```

### Module Interaction

```
gemini-healer.js (Main)
    ├─ Imports: healer-report-generator.js
    │
    ├─ Configuration Loading
    │   └─ Environment variables → Constants
    │
    ├─ Pre-flight Validation
    │   ├─ checkDependencies()
    │   ├─ validateConfiguration()
    │   └─ validateEnvironment()
    │
    ├─ Test Analysis & Fixing (Main Loop)
    │   ├─ getFailedTests() ──→ Reads results.json
    │   ├─ shouldHealTest() ──→ Filter infrastructure errors
    │   ├─ readTestFile() ──→ Get test code
    │   ├─ analyzeWithGemini() ──→ API call
    │   ├─ extractFixedCode() ──→ Parse response
    │   └─ applyFixes() ──→ Write file + backup
    │
    ├─ Verification & Rollback
    │   ├─ verifyFix() ──→ Re-run test
    │   └─ rollbackFix() ──→ Restore backup
    │
    ├─ Reporting
    │   ├─ generateErrorReport()
    │   ├─ persistLogs() ──→ healing-logs.json
    │   └─ generateHtmlReport() ──→ (from report-generator)
    │
    └─ Logging System
        ├─ logHealingEvent()
        ├─ getSessionStatistics()
        └─ persistLogs()

healer-report-generator.js (Reporting)
    ├─ loadHealingLogs()
    ├─ extractLocatorChanges()
    ├─ extractErrorPatterns()
    ├─ formatCodeWithLineNumbers()
    └─ generateHtmlReport()
```

---

## File Breakdown

### gemini-healer.js (1,873 lines)

#### **Section 1: Initialization (Lines 1-185)**

```javascript
// Imports
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';

// Environment loading
dotenv.config({ path: path.join(__dirname, '.env') });

// Configuration constants
const GEMINI_API_KEY_TEST = process.env.GEMINI_API_KEY_TEST;
const HEALER_MAX_RETRIES = 3;
const HEALER_API_TIMEOUT = 60000; // ms
// ... more config
```

**Purpose**: Set up the environment, load API keys, validate credentials

**Key Constants**:
- `GEMINI_API_KEY_TEST`: Google AI API key
- `HEALER_AUTO_FIX`: Auto-apply fixes (boolean)
- `HEALER_VERBOSE`: Detailed logging
- `HEALER_MAX_RETRIES`: Retry attempts
- `DANGEROUS_PATTERNS`: Regex patterns for blocked code
- `SKIP_HEALING_KEYWORDS`: Infrastructure errors to skip

---

#### **Section 2: Logging System (Lines 58-155)**

```javascript
let healingLogs = {
  sessionId: generateSessionId(),
  startTime: new Date().toISOString(),
  events: [],
  statistics: {
    totalEvents: 0,
    failedLocators: 0,
    workedLocators: 0,
    elementsHealed: 0
  }
};

function logHealingEvent(eventType, elementName, failedLocator, workingLocator, details) {
  // Track: locator_failure, locator_found, element_healed, verification_passed, etc.
  healingLogs.events.push(logEntry);
  healingLogs.statistics.totalEvents++;
}

function persistLogs() {
  // Write healingLogs to test-results/healing-logs.json
  fs.writeFileSync(logsPath, JSON.stringify(logsData, null, 2), 'utf8');
}
```

**Tracks**:
- Event types (locator failures, successes, verifications)
- Locator changes (old selector → new selector)
- Session statistics
- Audit trail

**Output**: `test-results/healing-logs.json`

---

#### **Section 3: Pre-flight Validation (Lines 189-330)**

```javascript
function checkDependencies() {
  // Verify: @google/generative-ai, @playwright/test, dotenv
}

function validateConfiguration() {
  // Check: file sizes, retry counts, timeouts, rate limits
  // Warn if values are outside safe ranges
}

function validateEnvironment() {
  // Check:
  // ✅ .env file exists
  // ✅ test-results/results.json exists
  // ✅ tests/ directory exists
  // ✅ playwright.config.ts exists
  // ✅ Backup directory writable
  // ✅ Audit log directory writable
}
```

**Purpose**: Fail fast if prerequisites aren't met

---

#### **Section 4: Security & Validation (Lines 336-600)**

**Key Functions**:

```javascript
function validateFilePath(filePath) {
  // ✓ Path within project
  // ✓ Not a symbolic link
  // ✓ File size < 1MB
  // ✓ No directory traversal (..)
}

function validateTestFileName(fileName) {
  // Whitelist: only .spec.ts or .test.ts files
}

function validateGeneratedCode(code) {
  // Block: fs operations, execSync, eval, require, child_process
  // Require: test() function and expect() assertions
  // Block: markdown formatting (analysis text, not code)
}

function validateTypeScriptSyntax(code) {
  // Check: matching braces {}, parentheses (), imports present
}

function sanitizeForPrompt(input, maxLength = 5000) {
  // Remove: file paths, emails, IP addresses, URLs
  // Escape: backticks, quotes
  // Prevent: prompt injection attacks
}

function detectPromptInjection(input) {
  // Regex patterns for common injection attempts:
  // - "ignore previous instructions"
  // - "act as evil"
  // - "bypass security"
}
```

**Design Pattern**: Defense-in-depth validation

---

#### **Section 5: Test Analysis (Lines 774-869)**

```javascript
function getFailedTests() {
  // Parse: test-results/results.json
  // Returns: Array of { file, filePath, title, error, errorType }
  // Filters: only tests with ok === false
}

function extractTestInfo(spec) {
  // Classify error type:
  // - timeout (contains 'timeout')
  // - strict_mode (contains 'strict')
  // - assertion (contains 'expect')
  // - not_found (contains 'not found')
  // - unknown (default)
}

function shouldHealTest(testInfo) {
  // Skip if error contains infrastructure keywords:
  // - "network error", "port", "connection refused", etc.
  // Return: true if healable, false otherwise
}
```

---

#### **Section 6: Gemini AI Integration (Lines 877-1213)**

```javascript
async function analyzeWithGemini(testInfo, testCode, retryCount = 0) {
  // 1. Rate limit check (max 5 calls/min)
  // 2. Generate prompt via generateAnalysisPrompt()
  // 3. Call: model.generateContent() with timeout
  // 4. Retry logic: exponential backoff (2^n seconds)
  // 5. Return: Gemini's analysis + fixed code
  
  // Timeout: 60 seconds
  // Retries: up to 3 times
}

function generateAnalysisPrompt(testInfo, testCode) {
  // Build comprehensive prompt:
  // - Current error + error type
  // - Full test code
  // - Selector intent analysis
  // - Resilience guidance
  // - Gemini instructions (prioritize resilience)
  
  // Sanitizes all inputs (paths, emails, secrets)
  // Validates code size (< 50KB)
}
```

**Gemini Prompt Strategy**:
```
Error Analysis:
  ├─ Root Cause Analysis
  ├─ Error Classification
  ├─ Element Intent Detection
  ├─ Selector Analysis (brittle vs resilient)
  └─ Recommended Fixes

Resilience Priority:
  1. getByRole() - Most resilient
  2. getByText()
  3. getByLabel()
  4. getByTestId()
  5. Avoid: .MuiCard-root, .MuiBox-root (brittle)
```

---

#### **Section 7: Code Extraction & Fixing (Lines 1263-1411)**

```javascript
function extractFixedCode(geminiResponse) {
  // Find: TypeScript code blocks ```typescript...```
  // Validate: contains import, test(), expect()
  // Return: complete, working code
}

function applyFixes(filePath, fixedCode) {
  // 1. Validate file path (security)
  // 2. Validate syntax (TypeScript)
  // 3. Create backup (.healer-backups/)
  // 4. Atomic write (temp file → actual file)
  // 5. Audit log
  // Returns: { success, backupPath, error }
}

function rollbackFix(filePath, backupPath) {
  // Restore original file from backup
  // Log rollback event
  // Return: success boolean
}

function verifyFix(testFile) {
  // Re-run: npx playwright test <file>
  // Parse output for pass/fail counts
  // Return: true if test passes
}
```

**Atomic Write Pattern**:
```
1. Write to temp file
2. Verify content matches
3. Copy temp to target
4. Delete temp file
→ Safe across filesystems
```

---

#### **Section 8: Main Healing Loop (Lines 1647-1863)**

```javascript
async function heal() {
  // 1. Parse CLI arguments (--auto-fix, --verbose, --help)
  // 2. Run pre-flight checks
  // 3. Load failed tests from results.json
  // 4. For each failing test:
  //    a. Check if healable
  //    b. Read test code
  //    c. Send to Gemini
  //    d. Extract fixed code
  //    e. If --auto-fix:
  //       - Create backup
  //       - Apply fix
  //       - Verify test passes
  //       - Rollback if verification fails
  //    f. Log results
  // 5. Generate reports
  // 6. Persist logs
  // 7. Display summary
  
  // Output:
  // ├─ Console: Summary + results
  // ├─ test-results/healing-logs.json
  // ├─ test-results/healer-report-*.html
  // ├─ test-results/healer-error-report-*.json
  // └─ .healer-audit.log
}
```

---

### healer-report-generator.js (1,282 lines)

#### **Key Functions**

```javascript
function escapeHtmlNode(text) {
  // Escape HTML: &, <, >, ", '
  // Prevents XSS attacks
}

function formatCodeWithLineNumbers(code, type = 'error', maxLines = 8) {
  // Format code with:
  // - Line numbers
  // - Syntax highlighting classes
  // - Truncation indicator (if > maxLines)
  
  // Returns: HTML string
}

function loadHealingLogs() {
  // Read: test-results/healing-logs.json
  // Parse JSON
  // Return: healingLogs object or null
}

function extractLocatorChanges(healingLogs) {
  // Filter events where: eventType === 'element_healed'
  // Extract: { elementName, failedLocator, workingLocator }
  // Return: Array of locator changes
}

function extractErrorPatterns(tests) {
  // Group tests by errorType
  // Count frequency
  // Build pattern summary
  
  // Example output:
  // {
  //   "selector_not_found": 3,
  //   "timeout": 2,
  //   "assertion": 1
  // }
}

function generateHtmlReport(healingResults) {
  // Load healing logs
  // Extract locator changes & error patterns
  // Build HTML with:
  // ├─ Summary stats (total, fixed, verified)
  // ├─ Results table
  // ├─ Detailed results with code samples
  // ├─ Locator changes section
  // ├─ Error pattern analysis
  // └─ Interactive tabs + styling
  
  // Write: test-results/healer-report-*.html
}
```

#### **HTML Report Sections**

1. **Summary Card** - Statistics (total tests, fixed, verified, success rate)
2. **Results Table** - Test file, title, status, error type
3. **Detailed Results** - Full error message + fixed code for each test
4. **Locator Changes** - Before/after selector comparison
5. **Error Patterns** - Most common error types chart
6. **Audit Trail** - Events timeline

---

## Core Concepts

### 1. **Selector Resilience Strategy**

**Problem**: Material-UI class selectors break on version updates
```typescript
// ❌ Brittle (breaks on MUI v5→v6)
page.locator('.MuiCard-root').first().click()

// ✅ Resilient (survives version updates)
page.locator('text=Movie').click()
page.getByRole('heading', { name: /Movie/i })
```

**Gemini Priority**:
1. `getByRole()` - Based on accessibility role (most stable)
2. `getByText()` - Text content matching
3. `getByLabel()` - Form labels
4. `getByTestId()` - Custom test IDs
5. Last resort: Simple class selectors without Material-UI classes

### 2. **Error Classification**

```javascript
// errorType categories
{
  'timeout': 'Test exceeded 30s wait',
  'assertion': 'expect() failed',
  'selector_not_found': 'Locator not found',
  'strict_mode': 'Multiple elements matched',
  'not_found': 'Element disappeared',
  'unknown': 'Couldn\'t classify'
}
```

### 3. **Race Condition Handling**

Gemini analyzes tests to detect potential race conditions:
```typescript
// ❌ Race condition
const button = page.locator('text=Book');
await button.click(); // Button might have disappeared!

// ✅ Safe with retry
const button = page.locator('text=Book');
await button.waitFor({ state: 'visible', timeout: 5000 });
await button.click();
```

### 4. **Healing Event Types**

```javascript
{
  'locator_failure': 'Selector failed to work',
  'locator_found': 'Selector identified in analysis',
  'element_healed': 'Fix successfully applied',
  'verification_passed': 'Test passes after fix',
  'verification_failed': 'Test still fails, rolling back'
}
```

---

## Security Measures

### **Defense-in-Depth Strategy**

```
Layer 1: Input Validation
├─ Path validation (no traversal)
├─ File name whitelist (.spec.ts, .test.ts)
├─ File size limits (< 1MB)
└─ Symbolic link detection

Layer 2: Code Analysis
├─ Dangerous pattern detection (fs.*, eval, execSync)
├─ Suspicious import detection
├─ Assertion presence check
└─ Test function presence check

Layer 3: LLM Safety
├─ Prompt injection detection
├─ Sanitize file paths (remove local paths)
├─ Sanitize emails & IP addresses
├─ Sanitize API keys & secrets
└─ Truncate oversized inputs

Layer 4: Audit Trail
├─ Log all file operations
├─ Track who/when/what was modified
├─ Timestamp all events
└─ Backup retention policy

Layer 5: Atomic Operations
├─ Temp file write → verify → move
├─ All-or-nothing file updates
└─ Rollback on failure
```

### **Sanitization Examples**

```javascript
Input: "C:\Users\john\project\test.spec.ts"
Output: "[FILE_PATH]\test.spec.ts"

Input: "john@example.com"
Output: "[EMAIL]"

Input: "192.168.1.1"
Output: "[IP]"

Input: "AIzaSy1234567890..."  (40+ chars)
Output: "[SECRET]"
```

---

## Data Flow

### **Test Fixing Flow**

```
1. Read Test Results
   └─ test-results/results.json
      └─ Extract: file, title, error, errorType

2. Validate Test
   └─ Check: Is error healable?
   └─ Skip: Infrastructure errors
   └─ Proceed: Selector/assertion errors

3. Read Test File
   └─ test-results/results.json
   └─ Extract test code

4. Analyze with Gemini
   ├─ Rate limit (5 calls/min)
   ├─ Generate prompt
   ├─ Call API (timeout: 60s)
   ├─ Retry 3x on failure
   └─ Return: analysis + fixed code

5. Validate Fixed Code
   ├─ Syntax check
   ├─ Security check
   ├─ Pattern detection
   └─ Proceed if valid

6. Apply Fix
   ├─ Create backup
   ├─ Atomic write
   ├─ Audit log
   └─ Return: success + backupPath

7. Verify Test
   ├─ Run: npx playwright test
   ├─ Parse: pass/fail
   ├─ If PASS: Mark verified
   ├─ If FAIL: Rollback (restore backup)
   └─ Log result

8. Generate Reports
   ├─ Persist logs (JSON)
   ├─ Generate HTML report
   ├─ Cleanup old backups
   └─ Display summary
```

### **Backup Management**

```
.healer-backups/
├─ LandingPageMovieList.spec.ts.1705977234567.bak
├─ LandingPageMovieList.spec.ts.1705977289123.bak
├─ PaymentPage.spec.ts.1705977345678.bak
└─ [Auto-cleanup: >7 days old or >5 backups per file]

Retention Policy:
- Keep: Last 5 backups per file
- Delete: Backups older than 7 days
- Cleanup runs on every heal() session
```

---

## Configuration

### **Environment Variables**

```bash
# Required
GEMINI_API_KEY_TEST=AIzaSy...          # Google AI API key

# Optional (with defaults)
HEALER_AUTO_FIX=true                   # Auto-apply fixes
HEALER_VERBOSE=false                   # Detailed logging
HEALER_MAX_FILE_SIZE=1048576           # 1MB max
HEALER_MAX_RETRIES=3                   # API retries
HEALER_API_TIMEOUT=60000               # 60 seconds
HEALER_API_RATE_LIMIT=5                # 5 calls/min
BACKUP_RETENTION_DAYS=7                # Keep 7 days
MAX_BACKUPS_PER_FILE=5                 # Max 5 backups
```

### **CLI Arguments**

```bash
node gemini-healer.js [options] [test-file]

--auto-fix, -a              Automatically apply fixes
--verbose, -v               Show detailed logs
--help, -h                  Display help

Examples:
node gemini-healer.js                          # Heal all
node gemini-healer.js --auto-fix               # Auto-fix all
node gemini-healer.js --auto-fix -v            # Auto-fix + verbose
node gemini-healer.js LandingPageMovieList     # Heal specific file
```

### **.env File Example**

```bash
GEMINI_API_KEY_TEST=AIzaSy...
HEALER_AUTO_FIX=true
HEALER_VERBOSE=false
HEALER_MAX_RETRIES=3
HEALER_API_TIMEOUT=60000
HEALER_API_RATE_LIMIT=5
BACKUP_RETENTION_DAYS=7
MAX_BACKUPS_PER_FILE=5
```

---

## Extension Guide

### **How to Add New Error Classifications**

1. **In `extractTestInfo()` (Line 838)**:
```javascript
function extractTestInfo(spec) {
  let errorType = 'unknown';
  
  if (error.includes('custom-error')) {
    errorType = 'custom_error_type';  // Add here
  }
  
  return { error, errorType, errorContext };
}
```

2. **In Gemini prompt** (Line 1121):
```javascript
// Add error type to analysis prompt
const selectorGuidance = generateSelectorGuidance(testCode);
// Gemini will handle any error type automatically
```

### **How to Add Security Checks**

1. **In `validateGeneratedCode()` (Line 438)**:
```javascript
function validateGeneratedCode(code) {
  const issues = [];
  
  // Add new pattern
  if (code.includes('dangerousFunction()')) {
    issues.push('Dangerous function detected');
  }
  
  return { isValid: issues.length === 0, issues };
}
```

### **How to Add Custom Selectors**

1. **In `analyzeTestIntentAndSelectors()` (Line 1026)**:
```javascript
const intentPatterns = [
  { text: /movie|film/i, intent: 'movie_card', resilientSelectors: [...] },
  
  // Add new pattern
  { text: /custom-element/i, intent: 'custom', 
    resilientSelectors: ['getByTestId("custom")', 'getByRole("button")'] }
];
```

### **How to Add New Report Sections**

1. **In `generateHtmlReport()` (Line 139 in healer-report-generator.js)**:
```javascript
function generateHtmlReport(healingResults) {
  let html = '';
  
  // Add custom section
  html += `
    <section class="custom-section">
      <h2>Custom Analysis</h2>
      ${buildCustomHTML(healingResults)}
    </section>
  `;
  
  // Append to final HTML...
}
```

### **How to Add Logging Events**

```javascript
// Use logHealingEvent() in any workflow step
logHealingEvent(
  'custom_event_type',    // eventType
  'element name',         // elementName
  'old-selector',         // failedLocator
  'new-selector',         // workingLocator
  { custom: 'details' }   // details
);

// Log is automatically tracked and persisted
```

---

## Usage Examples

### **Example 1: Basic Usage**

```bash
# Run tests first
npm test

# Heal all failing tests (view only)
node gemini-healer.js

# Output:
# 📊 Found 2 failing test(s)
# [Analysis + recommendations for each test]
```

### **Example 2: Auto-Fix with Verification**

```bash
# Auto-fix and verify
node gemini-healer.js --auto-fix

# Output:
# ✅ Test 1: FIXED & VERIFIED
# ❌ Test 2: FIXED but FAILED verification (rolled back)
# 📊 Success rate: 50%
```

### **Example 3: Verbose Debugging**

```bash
# Detailed logging
node gemini-healer.js --auto-fix --verbose

# Output:
# 📝 [LOG] locator_failure: Movie Card | Failed: .MuiCard-root | Working: text=Movie
# 📝 [LOG] element_healed: Movie Card | ...
# 🧪 Re-running test...
# ✅ Test verification shows passing
```

### **Example 4: Fix Specific Test File**

```bash
node gemini-healer.js --auto-fix LandingPageMovieList

# Only heals failing tests in LandingPageMovieList.spec.ts
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "GEMINI_API_KEY_TEST not set" | Missing .env file | Create .env with API key |
| "No failing tests found" | All tests passing | Good! Or run `npm test` first |
| "Gemini API timeout" | Network slow | Increase HEALER_API_TIMEOUT |
| "Test still fails after fix" | Gemini suggestion didn't work | Manual review needed |
| "Rollback unavailable" | Backup corrupted | Restore from git |
| "Path validation error" | Invalid test file path | Check file exists + is in tests/ |

---

## Learning Checklist

- [ ] Understand the 3-layer validation system
- [ ] Trace a test fix from start to finish
- [ ] Understand Gemini prompt construction
- [ ] Review security sanitization functions
- [ ] Study the atomic file write pattern
- [ ] Understand error classification logic
- [ ] Review backup & rollback mechanism
- [ ] Study HTML report generation
- [ ] Understand rate limiting strategy
- [ ] Review audit logging approach

---

## References

**Key File Locations**:
- Main healer: `e2e/gemini-healer.js`
- Report generator: `e2e/healer-report-generator.js`
- Configuration: `e2e/.env`
- Test results: `e2e/test-results/results.json`
- Healing logs: `e2e/test-results/healing-logs.json`
- HTML report: `e2e/test-results/healer-report-*.html`
- Backups: `e2e/.healer-backups/`
- Audit log: `e2e/.healer-audit.log`

**API Documentation**:
- [Google Generative AI](https://ai.google.dev/)
- [Playwright API](https://playwright.dev/)
- [Node.js fs module](https://nodejs.org/api/fs.html)

---

**Last Updated**: January 27, 2026
