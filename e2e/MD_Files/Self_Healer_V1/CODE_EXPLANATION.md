# Gemini Healer - Code Explanation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [gemini-healer.js - Detailed Explanation](#gemini-healerjs---detailed-explanation)
5. [healer-report-generator.js - Detailed Explanation](#healer-report-generatorjs---detailed-explanation)
6. [Key Features](#key-features)
7. [Data Flow](#data-flow)
8. [Configuration & Environment Variables](#configuration--environment-variables)
9. [Security Features](#security-features)
10. [Usage Examples](#usage-examples)

---

## Overview

**Gemini Healer** is a sophisticated AI-powered Playwright test automation healing system that:
- Analyzes failing Playwright tests
- Uses Google's Gemini AI to generate intelligent fixes
- Applies and verifies fixes automatically
- Generates professional HTML reports

The system consists of two main modules:
- **gemini-healer.js**: Core healing engine with AI analysis and test fixing
- **healer-report-generator.js**: HTML report generation for test healing results

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Gemini Healer System                             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 1. Test Execution & Results Collection           │   │
│  │    (Playwright test runner)                      │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                     │
│  ┌──────────────────▼───────────────────────────────┐   │
│  │ 2. Failure Analysis & Extraction                 │   │
│  │    (gemini-healer.js - getFailedTests)          │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                     │
│  ┌──────────────────▼───────────────────────────────┐   │
│  │ 3. AI Analysis (Gemini API)                      │   │
│  │    (analyzeWithGemini)                           │   │
│  │    - Root cause analysis                         │   │
│  │    - Error classification                        │   │
│  │    - Fix generation                              │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                     │
│  ┌──────────────────▼───────────────────────────────┐   │
│  │ 4. Fix Application & Verification                │   │
│  │    (applyFixes, verifyFix)                       │   │
│  │    - Backup creation                             │   │
│  │    - Code validation                             │   │
│  │    - Test re-run                                 │   │
│  │    - Rollback if needed                          │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                     │
│  ┌──────────────────▼───────────────────────────────┐   │
│  │ 5. Report Generation                             │   │
│  │    (healer-report-generator.js)                  │   │
│  │    - HTML report creation                        │   │
│  │    - Interactive visualizations                  │   │
│  │    - Styling & animations                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure

### Primary Files:
```
e2e/
├── gemini-healer.js              # Main healing engine (1379 lines)
├── healer-report-generator.js     # Report generator (794 lines)
└── test-results/
    ├── healer-report-*.html       # Generated HTML reports
    └── results.json               # Test execution results
```

---

## gemini-healer.js - Detailed Explanation

### **File Purpose**
Core intelligent test healing engine that:
1. Detects failing tests
2. Analyzes them with Gemini AI
3. Applies fixes with verification
4. Manages backups and rollback
5. Logs all operations for audit trail

### **Key Sections & Functions**

#### 1. **Imports & Configuration** (Lines 1-50)
```javascript
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { generateHtmlReport } from './healer-report-generator.js';
```

**Configuration Constants:**
```javascript
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;          // API authentication
const HEALER_AUTO_FIX = process.env.HEALER_AUTO_FIX;        // Auto-apply fixes
const HEALER_VERBOSE = process.env.HEALER_VERBOSE;          // Debug logging
const HEALER_MAX_RETRIES = 3;                               // Retry attempts
const HEALER_API_TIMEOUT = 60000;                           // 60 second timeout
const HEALER_API_RATE_LIMIT = 5;                            // 5 calls/minute
const BACKUP_RETENTION_DAYS = 7;                            // Backup retention
const MAX_BACKUPS_PER_FILE = 5;                             // Backup limit
```

---

#### 2. **Validation Functions** (Lines 60-200)

##### **checkDependencies()**
- Verifies required npm packages are installed
- Checks: `@google/generative-ai`, `@playwright/test`, `dotenv`
- **Exit on failure**: Yes (halts execution if dependencies missing)

```javascript
function checkDependencies() {
  const missing = [];
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
  // ... error handling
}
```

##### **validateConfiguration()**
- Validates environment variable values
- Warns on invalid configurations
- **Issues checked:**
  - File size limits
  - Retry counts
  - API timeouts
  - Rate limits
  - Backup retention

##### **validateEnvironment()**
- Pre-flight checks before healing
- **Checks:**
  - `.env` file exists
  - `test-results/results.json` exists
  - `tests/` directory exists
  - `playwright.config.ts` exists
  - Backup directory is writable
  - Audit log directory is writable

---

#### 3. **CLI Argument Parser** (Lines 210-250)

```javascript
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    autoFix: args.includes('--auto-fix') || args.includes('-a'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    testFile: testFile,  // Optional specific test file
    help: args.includes('--help') || args.includes('-h')
  };
}
```

**Supported Commands:**
```bash
node gemini-healer.js                     # Heal all failing tests
node gemini-healer.js --auto-fix          # Auto-apply fixes
node gemini-healer.js --auto-fix -v       # Verbose logging
node gemini-healer.js localhost-3000      # Specific test file
```

---

#### 4. **Security Functions** (Lines 290-400)

##### **validateFilePath(filePath)**
- Prevents directory traversal attacks
- Validates file size limits
- Blocks symbolic links
- **Returns:** Resolved path or null if invalid

##### **validateTestFileName(fileName)**
- Whitelists allowed test file patterns
- Allowed patterns: `*.spec.ts`, `*.spec.tsx`, `*.test.ts`, `*.test.tsx`
- Prevents arbitrary file execution

##### **validateGeneratedCode(code)**
- Scans for dangerous patterns before file modification
- **Dangerous patterns checked:**
  - File system operations: `fs.rm`, `fs.unlink`, `execSync`
  - Process operations: `process.exit`, `child_process`
  - Dynamic code: `eval()`, `new Function()`, `require()`, `import()`
  - Suspicious imports: `fs`, `child_process`, `os`
- **Required patterns:**
  - Must contain `test()` or `it()` function
  - Must contain `expect()` assertion

##### **auditLog(action, filePath, details)**
- Logs all file operations
- Records: timestamp, user, action, file, PID
- **Audit file:** `.healer-audit.log` (JSON format)

---

#### 5. **Backup Management** (Lines 410-480)

##### **createBackup(filePath)**
- Creates timestamped backup before modification
- **Backup location:** `.healer-backups/` directory
- **Format:** `{filename}.{timestamp}.bak`
- **Returns:** Backup path or null

##### **cleanupOldBackups()**
- Removes backups older than retention period
- **Cleanup rules:**
  - Remove if older than `BACKUP_RETENTION_DAYS`
  - Remove if exceeds `MAX_BACKUPS_PER_FILE` per file
- **Logged:** Each deletion recorded in audit log

##### **atomicFileWrite(filePath, content)**
- Safely writes files across devices
- **Process:**
  1. Write to temporary file
  2. Verify content matches
  3. Copy to target location
  4. Delete temp file
- **Purpose:** Prevent partial writes and data corruption

---

#### 6. **Test Detection** (Lines 550-650)

##### **getFailedTests()**
- Reads `test-results/results.json`
- **Returns:** Array of failed tests with:
  - `file`: Test filename
  - `filePath`: Full file path
  - `title`: Test name
  - `error`: Error message
  - `errorType`: Classified error type
  - `errorContext`: Location of error

##### **extractTestInfo(spec)**
- Parses test failure details
- **Identifies error types:**
  - `timeout`: Timeout errors
  - `strict_mode`: Strict mode violations
  - `assertion`: Assertion failures
  - `not_found`: Element not found
  - `unknown`: Unclassified errors

---

#### 7. **File Operations** (Lines 660-700)

##### **readTestFile(filePath)**
- Safely reads test file content
- **Security checks:**
  - Path validation
  - Symbolic link blocking
  - File size validation
- **Logging:** Records file read in audit log

---

#### 8. **AI Analysis** (Lines 710-850)

##### **generateAnalysisPrompt(testInfo, testCode)**
- Creates detailed Gemini API prompt
- **Prompt includes:**
  1. Error type and message
  2. Current test code
  3. Focus areas:
     - CSS and role-based selectors
     - Material-UI component selectors
     - Async/timing operations
     - Accessibility selectors
     - Strict mode violations

##### **analyzeWithGemini(testInfo, testCode, retryCount)**
- Calls Gemini API with intelligent prompt
- **Features:**
  - Rate limiting via `rateLimitAndWait()`
  - API timeout handling (60s default)
  - Retry with exponential backoff
  - Maximum 3 retries by default
  
**Rate Limiting:**
```javascript
async function rateLimitAndWait() {
  // Track calls within 60-second window
  // If limit exceeded, wait before next call
  // Prevents API quota exhaustion
}
```

**Retry Logic:**
```javascript
// Exponential backoff: 1s, 2s, 4s
const backoffMs = Math.pow(2, retryCount) * 1000;
await new Promise(resolve => setTimeout(resolve, backoffMs));
```

---

#### 9. **Code Extraction & Validation** (Lines 860-950)

##### **extractFixedCode(geminiResponse)**
- Parses Gemini response for fixed test code
- **Extraction logic:**
  1. Look for ` ```typescript ` or ` ```javascript ` code blocks
  2. Verify blocks contain imports AND test() AND expect()
  3. Return last valid code block
  4. Fallback: Extract incomplete imports section
- **Returns:** Fixed code string or null

##### **validateTypeScriptSyntax(code)**
- Basic syntax validation without TypeScript compiler
- **Checks:**
  - Import statements exist
  - Test function exists
  - Matching braces: `{` and `}`
  - Matching parentheses: `(` and `)`
- **Returns:** `{ valid: boolean, error: string }`

##### **shouldHealTest(testInfo)**
- Conditional healing based on error type
- **Skip healing keywords:**
  - `network error`, `infrastructure`, `configuration error`
  - `connection refused`, `connection reset`
  - `enotfound`, `econnrefused`
  - `port`, `server`, `ssl`, `certificate`
- **Prevents:** Healing infrastructure issues (not code issues)

---

#### 10. **Fix Application** (Lines 960-1050)

##### **applyFixes(filePath, fixedCode)**
- Applies fixed code to test file
- **Process:**
  1. Validate file path
  2. Validate code not empty
  3. Run TypeScript syntax validation
  4. Run security code validation
  5. Check for required patterns (import, test, expect)
  6. Create backup
  7. Write file atomically
  8. Log modification
- **Returns:** `{ success: boolean, backupPath: string, error: string }`

---

#### 11. **Rollback Mechanism** (Lines 1060-1100)

##### **rollbackFix(filePath, backupPath)**
- Restores file from backup if verification fails
- **Process:**
  1. Verify backup exists
  2. Read backup content
  3. Restore to original file
  4. Log rollback action
- **Returns:** Success boolean

---

#### 12. **Verification** (Lines 1110-1180)

##### **verifyFix(testFile)**
- Re-runs specific test to verify fix works
- **Command executed:**
  ```bash
  npx playwright test tests/{testFile} \
    --reporter=list --reporter=json
  ```
- **Output parsing:**
  - Counts passes and fails
  - Returns true if passes > 0 and fails === 0
- **Handles:**
  - "No tests found" → Assumes valid
  - Execution errors → Returns false

---

#### 13. **Reporting Functions** (Lines 1190-1280)

##### **displayAnalysis(analysis, testTitle)**
- Pretty-prints Gemini analysis in terminal
- **Formatting:**
  - Highlights key sections (red, green, cyan, yellow)
  - Shows first 20 lines
  - Indicates remaining lines for HTML report

##### **displayFixedCode(fixedCode, testTitle)**
- Pretty-prints fixed code in terminal
- **Features:**
  - Syntax highlighting (keywords, functions, variables)
  - Line numbers (3-digit, right-aligned)
  - Truncates long code (shows first 12 + last 10 lines)
  - Indicates omitted lines

##### **displayHealingSummary(healingResults)**
- Shows comprehensive healing results
- **Display includes:**
  - Total tests analyzed
  - Fixed count
  - Verified count
  - Success percentage
  - Individual test results with status badges

##### **generateErrorReport(healingResults)**
- Creates JSON error report for failed tests
- **File:** `test-results/healer-error-report-{timestamp}.json`
- **Contents:**
  - Failed test details
  - Error summaries
  - Recommendations

---

#### 14. **Main Healing Workflow** (Lines 1290-1379)

##### **heal() - Main Function**
**Execution flow:**

```javascript
async function heal() {
  // 1. Parse CLI arguments
  const options = parseArgs();
  
  // 2. Pre-flight checks
  checkDependencies();
  validateConfiguration();
  validateEnvironment();
  
  // 3. Get failing tests
  let failedTests = getFailedTests();
  
  // 4. Cleanup old backups
  cleanupOldBackups();
  
  // 5. Process each failing test
  for (const test of failedTests) {
    // 5a. Check if should heal
    if (!shouldHealTest(test)) continue;
    
    // 5b. Read test file
    const testCode = readTestFile(test.filePath);
    
    // 5c. Analyze with Gemini
    const analysis = await analyzeWithGemini(test, testCode);
    
    // 5d. Extract fixed code
    const fixedCode = extractFixedCode(analysis);
    
    // 5e. Apply and verify fixes
    if (options.autoFix) {
      const applyResult = applyFixes(test.filePath, fixedCode);
      const verified = verifyFix(test.filePath);
      
      if (!verified && applyResult.backupPath) {
        rollbackFix(test.filePath, applyResult.backupPath);
      }
    }
  }
  
  // 6. Generate reports
  displayHealingSummary(healingResults);
  generateErrorReport(healingResults);
  generateHtmlReport(healingResults);
}
```

---

## healer-report-generator.js - Detailed Explanation

### **File Purpose**
Generates professional, interactive HTML reports showing:
- Test healing results
- Error details and AI analysis
- Applied fixes with syntax highlighting
- Summary statistics
- Verification status

### **Key Functions**

#### 1. **escapeHtmlNode(text)** (Lines 13-25)
- HTML-escapes special characters for security
- **Escapes:** `&`, `<`, `>`, `"`, `'`
- **Purpose:** Prevent XSS attacks
- **Usage:** All user-generated content in HTML

```javascript
function escapeHtmlNode(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

---

#### 2. **formatCodeWithLineNumbers()** (Lines 27-75)
- Formats code with line numbers and syntax highlighting
- **Parameters:**
  - `code`: Source code to format
  - `type`: 'error' or 'fix' (determines highlighting)
  - `maxLines`: Maximum lines to display

**For error code (`type='error'):**
- Highlights error keywords in red: `Error`, `TypeError`, `AssertionError`
- Highlights warnings in bold red: `timeout`, `failed`
- Highlights prepositions: `at`, `in`, `near`

**For fixed code (`type='fix'):**
- Keywords (navy): `test`, `it`, `describe`, `expect`, `async`, `await`
- Actions (green): `page.`, `locator`, `click`, `fill`, `type`, `goto`
- Syntax (indigo): `const`, `let`, `var`, `function`, `return`, `if`, `for`
- Strings (magenta): Single/double/backtick quoted strings

**Output format:**
```html
<div class="code-line">
  <span class="line-num">  1</span>
  <span class="code-text">import { test } from '@playwright/test';</span>
</div>
```

---

#### 3. **generateHtmlReport()** (Lines 77-794)

Main function that creates the HTML report.

##### **Report Structure:**

```
┌─ HTML Document
│  ├─ HEAD
│  │  ├─ Meta tags & charset
│  │  ├─ CSS Variables (colors, dimensions)
│  │  └─ Comprehensive CSS Styling (500+ lines)
│  │
│  └─ BODY
│     ├─ Container (max-width: 1200px)
│     │  ├─ Header
│     │  │  ├─ Icon (✨)
│     │  │  ├─ Title: "Self Healer report by Gemini"
│     │  │  └─ Subtitle: "Automated Test Analysis & Fixing Session"
│     │  │
│     │  ├─ Content Area (white background)
│     │  │  ├─ Summary Cards (4-column grid)
│     │  │  │  ├─ Tests Analyzed
│     │  │  │  ├─ Tests Fixed
│     │  │  │  ├─ Tests Verified
│     │  │  │  └─ Success Rate %
│     │  │  │
│     │  │  ├─ Test Results Section
│     │  │  │  └─ Suite Groups (for each test file)
│     │  │  │     └─ Test Results (expandable)
│     │  │  │        ├─ Status Badge & Test Title
│     │  │  │        └─ Expandable Content
│     │  │  │           ├─ Test Info (name, error type)
│     │  │  │           ├─ Error Details (expandable)
│     │  │  │           ├─ AI Analysis (expandable)
│     │  │  │           ├─ Applied Fix (expandable)
│     │  │  │           └─ Verification Box
│     │  │  │
│     │  │  └─ Session Summary
│     │  │     ├─ Duration
│     │  │     ├─ Total analyzed
│     │  │     ├─ Fixed count
│     │  │     ├─ Verified count
│     │  │     ├─ Success rate
│     │  │     └─ Generation timestamp
│     │  │
│     │  └─ Footer
│     │     ├─ Branding
│     │     └─ Generation date
│     │
│     └─ JavaScript
│        ├─ toggleTestResult() - Expand/collapse tests
│        ├─ toggleSubsection() - Expand/collapse subsections
│        └─ DOMContentLoaded - Event listener setup
```

---

##### **CSS Color Scheme:**

```javascript
:root {
  --navy: #1e3a8a;              // Primary: Dark blue
  --green: #10b981;             // Accent: Emerald
  --grey: #6b7280;              // Text: Medium grey
  --grey-light: #f3f4f6;        // Background: Light grey
  --white: #ffffff;             // Content background
  --bg-error: #fee2e2;          // Error background (light red)
  --bg-success: #d1fae5;        // Success background (light green)
}
```

---

##### **Key CSS Classes:**

**Header Styling:**
- `.header`: Navy blue gradient background (1e3a8a → 0f172a)
- `.header h1`: 2.5em, flex layout, 15px gap between icon and text

**Summary Cards:**
- `.summary`: 4-column responsive grid
- `.stat-card`: Light grey background, navy left border (5px)
- `.stat-card.success`: Green left border

**Test Results:**
- `.test-result`: White container with 1px border
- `.test-result.success`: Green left border (5px)
- `.test-result.failed`: Red left border (5px)
- `.test-header`: Light grey background, clickable, arrow icon
- `.test-result.expanded .test-content`: Display block with slideDown animation

**Subsections:**
- `.subsection`: White border, rounded corners
- `.subsection-header`: Light grey, clickable, arrow icon
- `.subsection-content`: Max-height 600px, scrollable, resizable
- `.subsection.expanded .subsection-content`: Display block with slideDown animation

**Code Display:**
- `.error-text`: Light red background (#fee2e2)
- `.fix-text`: Light green background (#d1fae5)
- `.code-line`: Flex layout with line number and code text
- `.line-num`: Right-aligned, grey color, non-selectable
- `.code-text`: Monospace font, white-space pre-wrap

---

##### **Interactive Features:**

**Expandable Test Results:**
```javascript
// Click test header to toggle
.test-result.expanded {
  // Shows detailed test content
  .test-content { display: block; }
  .expand-icon { transform: rotate(90deg); }
}
```

**Expandable Subsections:**
```javascript
// Click subsection header to toggle
.subsection.expanded {
  // Shows error/analysis/fix details
  .subsection-content { display: block; }
  .subsection-icon { transform: rotate(90deg); }
}
```

**Resizable Content:**
```css
.subsection-content {
  resize: both;      // Allows both horizontal and vertical resize
  overflow: auto;    // Shows scrollbars as needed
  max-height: 600px; // Maximum 600px, but can be resized by user
}
```

---

##### **Report Data Flow:**

```javascript
generateHtmlReport(healingResults) {
  // 1. Create test-results directory if missing
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // 2. Generate template literal with data
  const htmlContent = `...${healingResults.totalTests}...`;
  
  // 3. Process test data:
  //    a) Group tests by file/suite
  const suites = {};
  healingResults.tests.forEach(test => {
    const suite = test.file || 'Unknown Suite';
    if (!suites[suite]) suites[suite] = [];
    suites[suite].push(test);
  });
  
  //    b) For each suite, render tests
  //    c) For each test, include:
  //       - Status badge (✅/⚠️/❌)
  //       - Test title
  //       - Error details (formatted with line numbers)
  //       - AI analysis (split by newlines with bullets)
  //       - Fixed code (formatted with highlighting)
  //       - Verification box
  
  // 4. Write HTML to file
  const reportPath = `test-results/healer-report-${timestamp}.html`;
  fs.writeFileSync(reportPath, htmlContent, 'utf8');
}
```

---

##### **Status Badges:**

| Status | Badge | Color | CSS Class |
|--------|-------|-------|-----------|
| Fixed & Verified | ✅ FIXED & VERIFIED | Green | `.status-badge.success` |
| Fixed (Unverified) | ⚠️ FIXED (UNVERIFIED) | Amber | `.status-badge.warning` |
| Not Fixed | ❌ NOT FIXED | Red | `.status-badge.failed` |

---

##### **Verification Boxes:**

| Result | Message | Background | Icon |
|--------|---------|------------|------|
| Verified | ✅ Test Re-run Passed - Error has been resolved! | Green | ✅ |
| Fixed Unverified | ⚠️ Fix Applied - Manual verification recommended | Amber | ⚠️ |
| Not Fixed | ❌ Unable to fix this test - Review error details | Red | ❌ |

---

## Key Features

### 1. **AI-Powered Analysis**
- Uses Gemini 2.5-Flash model
- Analyzes error messages and test code
- Generates fixes with explanations
- Temperature: 0.7 (balanced creativity/consistency)

### 2. **Security**
- Path validation & traversal prevention
- Symbolic link blocking
- File size limits (1MB default)
- Code pattern scanning
- HTML escaping for XSS prevention
- Audit logging for all operations

### 3. **Reliability**
- Exponential backoff retries (1s, 2s, 4s)
- API timeout handling (60s)
- Rate limiting (5 calls/minute)
- Atomic file writes
- Automatic rollback on verification failure
- Backup management with retention

### 4. **User Experience**
- Verbose logging with emojis
- Pretty-printed terminal output
- Interactive HTML reports
- Expandable/collapsible sections
- Syntax highlighting
- Progress indicators

### 5. **Professional Reporting**
- Generated HTML with professional styling
- Navy/green color scheme
- Responsive design (mobile-friendly)
- Summary statistics
- Test grouping by file
- Session metrics
- Error analysis reports

---

## Data Flow

```
┌─────────────────────┐
│ Test Execution      │
│ (Playwright)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ test-results/results.json               │
│ {                                       │
│   "suites": [{                          │
│     "file": "localhost-3000.spec.ts",  │
│     "specs": [{                         │
│       "ok": false,                      │
│       "title": "Load page",             │
│       "tests": [{...}]                  │
│     }]                                  │
│   }]                                    │
│ }                                       │
└──────────┬──────────────────────────────┘
           │ Read & Parse
           ▼
┌─────────────────────────────────────────┐
│ Failed Tests Array                      │
│ [{                                      │
│   file: "localhost-3000.spec.ts",      │
│   filePath: "/path/to/test/file",      │
│   title: "Load page",                   │
│   error: "...",                         │
│   errorType: "timeout"                  │
│ }]                                      │
└──────────┬──────────────────────────────┘
           │ For each failed test
           ▼
┌─────────────────────────────────────────┐
│ Read Test File Content                  │
│ Validate path, size, permissions        │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Gemini API Call                         │
│ - Error message                         │
│ - Test code                             │
│ - Analysis prompt                       │
│ - Temperature: 0.7                      │
│ - Max tokens: 8192                      │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Gemini Response                         │
│ - Root cause analysis                   │
│ - Error classification                  │
│ - Recommended fixes                     │
│ - ```typescript ... ``` (fixed code)    │
└──────────┬──────────────────────────────┘
           │
           ├─ Extract Fixed Code
           │  - Parse code blocks
           │  - Validate completeness
           │
           ▼
┌─────────────────────────────────────────┐
│ Fixed Code                              │
│ (validated TypeScript/JavaScript)       │
└──────────┬──────────────────────────────┘
           │
           ├─ If --auto-fix flag
           │  │
           │  ├─ Create Backup
           │  ├─ Validate Code
           │  ├─ Write File (Atomic)
           │  │
           │  ▼
           │ Run Test to Verify
           │  ├─ npx playwright test
           │  │
           │  ├─ Pass? → Update status ✅
           │  └─ Fail? → Rollback from backup
           │
           └─ Generate Report Data
              {
                file: "...",
                title: "...",
                error: "...",
                analysis: "...",
                fixed: true/false,
                verified: true/false,
                fixedCode: "...",
                failureReason: "..."
              }

           ▼
┌─────────────────────────────────────────┐
│ Healing Results Summary                 │
│ {                                       │
│   totalTests: 5,                        │
│   fixedCount: 4,                        │
│   verifiedCount: 3,                     │
│   successRate: 60,                      │
│   duration: "45s",                      │
│   tests: [...]                          │
│ }                                       │
└──────────┬──────────────────────────────┘
           │
           ├─ Display Summary (CLI)
           ├─ Generate Error Report
           │
           ▼
┌─────────────────────────────────────────┐
│ healer-report-{timestamp}.html          │
│ (Professional interactive HTML)         │
│ - Header with branding                  │
│ - Summary cards                         │
│ - Test results by suite                 │
│ - Expandable details                    │
│ - Syntax highlighting                   │
│ - Verification status                   │
│ - Session metrics                       │
└─────────────────────────────────────────┘
```

---

## Configuration & Environment Variables

### Required Variables
```bash
GEMINI_API_KEY=your-api-key-here
```

### Optional Variables
```bash
# Healing behavior
HEALER_AUTO_FIX=true                    # Auto-apply fixes
HEALER_VERBOSE=true                     # Debug output

# File limits
HEALER_MAX_FILE_SIZE=1048576            # 1MB max test file size

# Retry & API
HEALER_MAX_RETRIES=3                    # Retry attempts
HEALER_API_TIMEOUT=60000                # 60 second timeout
HEALER_API_RATE_LIMIT=5                 # 5 calls per minute

# Backup management
HEALER_BACKUP_DIR=.healer-backups       # Backup directory
HEALER_AUDIT_LOG=.healer-audit.log      # Audit log file
BACKUP_RETENTION_DAYS=7                 # Keep backups 7 days
MAX_BACKUPS_PER_FILE=5                  # Max 5 per file

# Report generation
HEALER_REPORT_DIR=test-results          # Report output directory
```

---

## Security Features

### 1. **Input Validation**
- CLI argument sanitization
- File path validation (no `..` traversal)
- File size limits
- Symbolic link blocking
- Test file name whitelisting

### 2. **Code Security**
- Dangerous pattern scanning before execution
- Requires imports, test functions, assertions
- HTML escaping for XSS prevention
- No eval/Function constructor allowed
- Suspicious imports detected

### 3. **File Operations**
- Atomic writes (temp file pattern)
- Automatic backups before modification
- Rollback capability
- Symbolic link safety checks
- Permission validation

### 4. **Audit Trail**
- All operations logged to JSON audit log
- Timestamp, user, action, file recorded
- Backup paths tracked
- Deletion history maintained

### 5. **API Security**
- API key validation on startup
- Rate limiting to prevent quota abuse
- Timeout handling
- Retry with exponential backoff

---

## Usage Examples

### Basic Usage
```bash
# Analyze all failing tests
node gemini-healer.js

# With auto-fix enabled
node gemini-healer.js --auto-fix

# With verbose logging
node gemini-healer.js --auto-fix -v

# Heal specific test file
node gemini-healer.js localhost-3000.spec.ts --auto-fix

# Show help
node gemini-healer.js --help
```

### Environment Setup
```bash
# Create .env file
cp .env.example .env

# Add your Gemini API key
echo "GEMINI_API_KEY=your-key-here" >> .env

# Run tests first
npm test

# Then run healer
node gemini-healer.js --auto-fix
```

### Viewing Reports
```bash
# HTML reports generated at:
test-results/healer-report-2026-01-02T18-45-30-123Z.html

# Error reports at:
test-results/healer-error-report-1704201930123.json

# Audit log at:
.healer-audit.log
```

---

## Summary

The **Gemini Healer** system provides:

✅ **Intelligent Test Analysis** - AI-powered root cause identification  
✅ **Automated Fixing** - Generates and applies test code fixes  
✅ **Verification** - Re-runs tests to confirm fixes work  
✅ **Safety** - Backups, validation, and rollback capability  
✅ **Professional Reports** - Beautiful interactive HTML reports  
✅ **Audit Trail** - Complete operation logging  
✅ **Security** - Path validation, code scanning, XSS prevention  

Perfect for maintaining large Playwright test suites with AI assistance!
