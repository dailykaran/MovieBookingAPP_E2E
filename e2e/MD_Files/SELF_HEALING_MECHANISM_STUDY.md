# Self-Healing Test Automation Mechanism - Complete Study Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Key Components](#key-components)
5. [Features](#features)
6. [Technologies](#technologies)
7. [Configuration](#configuration)
8. [Workflow & Process](#workflow--process)
9. [Data Flow](#data-flow)
10. [Error Handling](#error-handling)
11. [Report System](#report-system)
12. [Security & Validation](#security--validation)
13. [Best Practices](#best-practices)
14. [Examples](#examples)
15. [Troubleshooting](#troubleshooting)

---

## Overview

The Self-Healing Test Automation Mechanism is an **AI-powered Playwright test repair system** that automatically analyzes failing tests, generates fixes, and verifies them against the actual application state.

### Problem It Solves

When frontend applications change during development:
- ❌ CSS classes shift → selectors break
- ❌ Component structure changes → elements unreachable
- ❌ DOM architecture evolves → Shadow DOM/iframes introduced
- ❌ Text content updates → text-based selectors fail

**Traditional Approach**: Manual test maintenance (slow, error-prone)

**Self-Healing Approach**: Automatic test repair with AI analysis (fast, intelligent)

### Core Purpose

```
Test Fails → Capture Context → Analyze with Gemini → Generate Fix → Apply → Verify → Report
```

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-HEALING SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐        ┌──────────────┐      ┌─────────────┐ │
│  │   Playwright │        │  Error/Trace │      │   Gemini    │ │
│  │   Test Run   │───────▶│  Collection  │─────▶│   AI API    │ │
│  └──────────────┘        └──────────────┘      └─────────────┘ │
│         △                       │                     │          │
│         │                       ▼                     ▼          │
│         │                ┌──────────────┐      ┌─────────────┐ │
│         │                │  Healer Core │◀─────│  Analysis   │ │
│         │                │  (JS Logic)  │      │  Prompt     │ │
│         │                └──────────────┘      └─────────────┘ │
│         │                       │                               │
│         │                       ▼                               │
│         │                ┌──────────────┐                       │
│         └────────────────│   Apply Fix  │                       │
│                          │  + Verify    │                       │
│                          └──────────────┘                       │
│                                 │                               │
│                                 ▼                               │
│                          ┌──────────────┐                       │
│                          │Report Index  │                       │
│                          │  + Archive   │                       │
│                          └──────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
e2e/
├── gemini-healer.js              # Main healer engine (2400+ lines)
├── healer-report-generator.js    # HTML report creation
├── playwright.config.ts          # Trace capture config
├── .env                          # API key configuration
├── package.json                  # Dependencies & npm scripts
│
├── tests/
│   ├── HomePage.spec.ts
│   ├── LandingPageMovieList.spec.ts
│   └── Heal_Scenarios/           # Test fixtures for healer
│
└── reports/
    ├── healer/
    │   ├── index.html            # Report index (auto-generated)
    │   ├── healer-report-*.html  # Individual healing sessions
    │   └── (kept last 5 reports)
    ├── results/
    │   ├── healing-logs.json     # Healer session logs
    │   └── results.json          # Playwright test results
    └── playwright/               # Playwright traces
```

---

## How It Works

### Step-by-Step Process

#### **Phase 1: Test Execution & Failure Detection**
```javascript
// When test runs
await page.goto('http://localhost:3000');
await page.locator('button').click();  // ❌ FAILS - "0 found"
```

**What Happens:**
1. Playwright runs test and captures failure
2. Trace file created (`.zip` with HTML, network, etc.)
3. Test error recorded in `test-results/`

#### **Phase 2: Healer Analysis**
```javascript
// gemini-healer.js reads:
1. Error message: "Locator 'button' resolved to 0 elements"
2. Test code: page.locator('button').click()
3. Playwright trace: actual page HTML/DOM
```

**Extracts:**
- Button elements found in page
- Input fields and dialogs
- HTML snapshots from trace
- Error patterns and classification

#### **Phase 3: Gemini Prompt Generation**
```markdown
You are an expert Playwright engineer. Here's a failing test:

Error: Locator 'button' resolved to 0 elements

Test Code:
const button = page.locator('button');
await button.click();

Real Page Elements from Trace:
- Button "Book Now" 
- Button "Confirm Booking"
- Input field (email)

Your Analysis:
1. Root Cause: Test targets all buttons, page has specific ones
2. Fix: Use getByRole('button', { name: /Book Now/i })
3. Resilience: Text-based matching survives UI updates

Fixed Code:
const button = page.getByRole('button', { name: /Book Now/i });
await button.click();
```

#### **Phase 4: Fix Application**
```javascript
// Apply recommended fix
const originalTest = fs.readFileSync('test.spec.ts', 'utf8');
const fixedTest = originalTest.replace(
  'page.locator("button")',
  'page.getByRole("button", { name: /Book Now/i })'
);

// Create backup
fs.copyFileSync('test.spec.ts', 'backup/test.spec.ts.bak');

// Write fix
fs.writeFileSync('test.spec.ts', fixedTest, 'utf8');
```

#### **Phase 5: Verification**
```javascript
// Re-run test to confirm fix works
spawn('npx', ['playwright', 'test', 'test.spec.ts']);
// ✅ Pass = Success!
// ❌ Fail = Rollback to backup
```

---

## Key Components

### 1. **Gemini API Integration**

**File:** `gemini-healer.js` (lines 1600-1700)

```javascript
async function analyzeWithGemini(testInfo, testCode, retryCount = 0) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',  // Fast, cost-effective
  });

  const prompt = generateAnalysisPrompt(testInfo, testCode);
  
  const analysisPromise = model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096
    }
  });

  return await Promise.race([
    analysisPromise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API timeout')), HEALER_API_TIMEOUT)
    )
  ]);
}
```

**Key Features:**
- ✅ Timeout protection (60 seconds)
- ✅ Retry mechanism (3 attempts with exponential backoff)
- ✅ Rate limiting (5 calls/min)
- ✅ Temperature tuned for consistency (0.7)

### 2. **Playwright Trace Analysis**

**File:** `gemini-healer.js` (lines 1386-1480)

```javascript
function extractElementsFromTrace(tracePath) {
  const zip = new AdmZip(tracePath);
  const traceEntry = zip.getEntries()
    .find(e => e.entryName === 'trace.json');
  
  const traceData = JSON.parse(traceEntry.getData().toString('utf8'));

  // Extract from HTML snapshots:
  // - Button text: "Book Now", "Confirm"
  // - Input placeholders: "Email address"
  // - Dialog content
  // - testId attributes
  // - data-* attributes
  
  return {
    buttons: [
      { text: "Book Now", testId: "book-btn" },
      { text: "Confirm", testId: "confirm-btn" }
    ],
    inputs: [
      { placeholder: "Email address", ariaLabel: "Email" }
    ],
    dialogs: [...]
  };
}
```

**Extracts Real DOM Data:**
- ✅ Button labels and testIds
- ✅ Input placeholders and aria-labels
- ✅ Dialog content
- ✅ Custom element attributes

### 3. **DOM Architecture Detection**

**File:** `gemini-healer.js` (lines 1144-1230)

```javascript
function detectDOMArchitectureIssues(testCode, errorMessage) {
  const issues = {
    hasShadowDOM: false,
    hasIframes: false,
    hasWebComponents: false,
    potentialArchitectureIssues: [],
    recommendations: []
  };

  // Detect Shadow DOM patterns
  if (/seat-grid|shadow|custom-element/i.test(testCode)) {
    issues.hasShadowDOM = true;
    issues.recommendations.push(
      'Use nested locators: page.locator("seat-grid").locator("button.available")'
    );
  }

  // Detect iframe patterns
  if (/iframe|frameLocator/i.test(testCode)) {
    issues.hasIframes = true;
    issues.recommendations.push(
      'Use frameLocator: page.frameLocator("iframe").locator("button")'
    );
  }

  return issues;
}
```

**Handles Complex DOM:**
- ✅ Shadow DOM piercing
- ✅ iframe context switching
- ✅ Web Components
- ✅ Dynamic content

### 4. **Backup & Rollback System**

**File:** `gemini-healer.js` (lines 2050-2150)

```javascript
function createBackup(filePath) {
  const backupDir = path.join(HEALER_BACKUP_DIR, path.basename(filePath));
  ensureDirectoryExists(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}.ts`);
  
  fs.copyFileSync(filePath, backupPath);
  cleanupOldBackups(backupDir);  // Keep only last 5
  
  return backupPath;
}

function rollbackFix(filePath, backupPath) {
  if (!fs.existsSync(backupPath)) return false;
  
  try {
    fs.copyFileSync(backupPath, filePath);
    console.log('✅ Rollback successful');
    return true;
  } catch (err) {
    console.error('❌ Rollback failed');
    return false;
  }
}
```

**Features:**
- ✅ Automatic backup before fix
- ✅ Keep 5 backups per file
- ✅ Rollback on verification fail
- ✅ Audit trail

### 5. **Healing Session Logger**

**File:** `gemini-healer.js` (lines 90-160)

```javascript
function logHealingEvent(eventType, elementName, failedLocator, workingLocator, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    sessionId: healingLogs.sessionId,
    eventType,         // 'locator_failure', 'element_healed', 'verification_passed'
    elementName,       // 'Book Button'
    failedLocator,     // 'button'
    workingLocator,    // 'getByRole("button", { name: /Book/i })'
    details,
    duration
  };

  healingLogs.events.push(logEntry);
  persistLogs();  // Save to healing-logs.json
}
```

**Event Types:**
- `locator_failure` - Failed selector identified
- `locator_found` - Working selector discovered
- `element_healed` - Fix applied successfully
- `verification_passed` - Test passes with fix
- `verification_failed` - Test still fails, rollback triggered

### 6. **HTML Report Generation**

**File:** `healer-report-generator.js`

```javascript
function generateHtmlReport(healingResults) {
  const reportDir = path.join(process.cwd(), 'reports/healer');
  const reportPath = path.join(
    reportDir, 
    `healer-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`
  );
  
  fs.writeFileSync(reportPath, htmlContent, 'utf8');
  generateReportIndex(reportDir);  // Update index.html
  
  return reportPath;
}
```

**Report Contains:**
- ✅ Test summary (pass/fail counts)
- ✅ Before/after code comparison
- ✅ Error analysis
- ✅ Locator changes
- ✅ Timeline of events
- ✅ Links to all reports

---

## Features

### 🎯 Core Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| **AI-Powered Analysis** | Gemini 2.5 Flash analyzes test failures | Accurate, context-aware fixes |
| **Playwright Traces** | Extracts real page state from traces | Knows actual page elements |
| **DOM Architecture Detection** | Identifies Shadow DOM, iframes, Web Components | Handles complex frontends |
| **Automatic Fixing** | Rewrites test code with working selectors | Saves developer time |
| **Verification** | Re-runs test to confirm fix works | Ensures quality |
| **Rollback System** | Reverts fix if verification fails | Safety guarantee |
| **Comprehensive Logging** | JSON logs + HTML reports | Full audit trail |
| **Report Index** | Central dashboard of all healing sessions | Easy navigation |
| **Resilient Selectors** | Prioritizes text/role over CSS classes | Survives UI changes |
| **Security Validation** | Sanitizes code, detects injections | Prevents malicious code |

### 🔒 Security Features

| Feature | Purpose |
|---------|---------|
| Prompt injection detection | Prevents malicious test code in prompts |
| Code sanitization | Removes sensitive data before sending to API |
| Dangerous pattern blocking | Detects unsafe operations (fs.rm, eval, etc.) |
| Rollback protection | Original code preserved if fix fails |
| Backup retention | Full history available for audit |

### ⚡ Performance Features

| Feature | Impact |
|---------|--------|
| Rate limiting (5 calls/min) | Respects API quotas |
| API timeout (60s) | Prevents hanging |
| Retry mechanism (3x) | Handles transient failures |
| Code caching | Avoids re-analyzing same errors |
| Report cleanup (keep 5) | Prevents disk bloat |

---

## Technologies

### Dependencies

```json
{
  "@google/generative-ai": "^0.3.1",    // Gemini API
  "@playwright/test": "^1.56.1",        // Test framework
  "adm-zip": "^0.5.16",                 // Trace extraction
  "dotenv": "^17.2.3"                   // Environment config
}
```

### APIs & Services

| Service | Purpose | Cost |
|---------|---------|------|
| **Google Gemini 2.5 Flash** | AI analysis & code generation | ~$0.075/M input tokens |
| **Playwright** | Test execution & trace capture | Free (open source) |

### Key Technologies

- **Node.js ES Modules** - Modern JavaScript runtime
- **Express.js** - Backend service (for target app)
- **React + Redux** - Frontend (target app being tested)
- **Material-UI** - Component library (target app)

---

## Configuration

### Environment Setup

#### **.env File**

```bash
# Gemini API Configuration
GEMINI_API_KEY_TEST=AIza...your...key...  # Required

# Healer Behavior
HEALER_AUTO_FIX=true                      # Auto-apply fixes (default: false)
HEALER_VERBOSE=false                      # Detailed logging (default: false)

# Performance Tuning
HEALER_MAX_RETRIES=3                      # Retry attempts on API failure
HEALER_API_TIMEOUT=60000                  # API timeout in ms
HEALER_API_RATE_LIMIT=5                   # Calls per minute
HEALER_MAX_FILE_SIZE=1048576              # Max file size for analysis (1MB)

# Storage
HEALER_BACKUP_DIR=reports/audit/.healer-backups
HEALER_AUDIT_LOG=reports/audit/.healer-audit.log
BACKUP_RETENTION_DAYS=7                   # Keep backups for 7 days
MAX_BACKUPS_PER_FILE=5                    # Keep 5 backups per test file
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',  // ✅ Capture trace on failure
  },
  
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Critical Setting:** `trace: 'on-first-retry'` enables trace capture that healer uses for element extraction.

### npm Scripts

```json
{
  "scripts": {
    "test": "playwright test",
    "heal:gemini": "node gemini-healer.js",
    "heal:gemini:auto": "node gemini-healer.js --auto-fix",
    "heal:gemini:verbose": "node gemini-healer.js --auto-fix --verbose",
    "test:debug": "playwright test --debug --headed"
  }
}
```

---

## Workflow & Process

### Command: `npm run heal:gemini:verbose`

```
┌─────────────────────────────────────────────────┐
│  1. INITIALIZE                                  │
│  - Load .env configuration                      │
│  - Validate dependencies installed             │
│  - Check Gemini API key                        │
│  - Cleanup old reports (keep last 5)           │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  2. DETECT FAILURES                             │
│  - Parse Playwright test results                │
│  - Extract error messages                       │
│  - Count failed tests                           │
│  - Show summary                                 │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  3. FOR EACH FAILED TEST:                       │
│  ┌─────────────────────────────────────────┐   │
│  │ a) EXTRACT CONTEXT                      │   │
│  │    - Read test code                     │   │
│  │    - Find trace.zip file                │   │
│  │    - Extract trace.json                 │   │
│  │    - Get buttons, inputs, dialogs       │   │
│  │                                         │   │
│  │ b) DETECT ARCHITECTURE ISSUES           │   │
│  │    - Check for Shadow DOM               │   │
│  │    - Check for iframes                  │   │
│  │    - Check for Web Components           │   │
│  │                                         │   │
│  │ c) BUILD GEMINI PROMPT                  │   │
│  │    - Test code + error                  │   │
│  │    - Real page elements                 │   │
│  │    - Architecture guidance              │   │
│  │    - Selector best practices            │   │
│  │                                         │   │
│  │ d) CALL GEMINI API                      │   │
│  │    - Send prompt                        │   │
│  │    - With retry + timeout               │   │
│  │    - Get fixed code                     │   │
│  │    - Extract code from response         │   │
│  │                                         │   │
│  │ e) APPLY FIX (if --auto-fix)            │   │
│  │    - Create backup                      │   │
│  │    - Replace code in file                │   │
│  │    - Validate TypeScript                │   │
│  │    - Log the event                      │   │
│  │                                         │   │
│  │ f) VERIFY FIX                           │   │
│  │    - Run test again                     │   │
│  │    - Check if passes                    │   │
│  │    - If fails: rollback                 │   │
│  │                                         │   │
│  │ g) LOG RESULTS                          │   │
│  │    - Before/after code                  │   │
│  │    - Pass/fail status                   │   │
│  │    - Duration                           │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  4. GENERATE REPORTS                            │
│  - Summary statistics                           │
│  - HTML report with tabs                        │
│  - Update index.html                            │
│  - Save healing-logs.json                       │
│  - Print console summary                        │
└─────────────────────────────────────────────────┘
```

---

## Data Flow

### Healing Session Flow

```
Test File (HomePage.spec.ts)
       │
       ▼
Playwright Runs Test
       │
       ├─ ✅ PASS → No healing needed
       │
       └─ ❌ FAIL
           │
           ├─ Error: "Locator 'button' resolved to 0 elements"
           ├─ Stack trace
           └─ trace.zip (HTML, network log, videos)
               │
               ▼
        Healer Analysis
           │
           ├─ Read test code
           ├─ Extract trace.zip
           │   └─ trace.json
           │       ├─ Snapshots
           │       │   ├─ Button: "Book Now"
           │       │   ├─ Button: "Confirm"
           │       │   └─ Input: Email field
           │       └─ Actions (clicks, types, etc)
           │
           ├─ Detect architecture
           │   ├─ Shadow DOM? No
           │   ├─ iframes? No
           │   └─ Web Components? No
           │
           ▼
        Generate Prompt
           │
           ├─ "Here's failing test..."
           ├─ "Error: 0 found"
           ├─ "Test code: page.locator('button')"
           ├─ "Real buttons: 'Book Now', 'Confirm'"
           └─ "You are expert Playwright engineer..."
               │
               ▼
        Call Gemini API
           │
           ├─ POST to gemini-2.5-flash-lite
           ├─ Temperature: 0.7 (consistent)
           ├─ Timeout: 60 seconds
           ├─ Retry: 3 attempts
           │
           ▼
        Get Response
           │
           ├─ Root cause: "Targets all buttons, need specific"
           ├─ Recommendation: "Use getByRole with name"
           ├─ Fixed code:
           │   ```typescript
           │   const button = page.getByRole('button', { 
           │     name: /Book Now/i 
           │   });
           │   await button.click();
           │   ```
           │
           ▼
        Apply & Verify
           │
           ├─ Create backup
           ├─ Write fixed code
           ├─ Run test again
           │
           ├─ ✅ PASS
           │   └─ Log: "element_healed"
           │       Log: "verification_passed"
           │
           └─ ❌ FAIL
               └─ Rollback to backup
                   Log: "verification_failed"
               
               ▼
        Generate Report
           │
           ├─ HTML with all details
           ├─ Before/after tabs
           ├─ Timeline
           ├─ Logs
           └─ Summary stats
```

---

## Error Handling

### Architecture

**File:** `gemini-healer.js` (lines 1700-1800)

```javascript
// Resilient error handling with multiple strategies

// 1. API FAILURES
async function analyzeWithGemini(testInfo, testCode, retryCount = 0) {
  try {
    // Attempt 1
    const response = await model.generateContent({ ... });
    return response;
  } catch (error) {
    if (retryCount < HEALER_MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryCount) * 1000;  // 1s, 2s, 4s
      await new Promise(r => setTimeout(r, backoffMs));
      return analyzeWithGemini(testInfo, testCode, retryCount + 1);
    }
    throw error;
  }
}

// 2. TIMEOUT PROTECTION
const analysisPromise = Promise.race([
  model.generateContent({ ... }),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('API timeout')), 60000)
  )
]);

// 3. SKIP NON-HEALABLE ERRORS
const SKIP_HEALING_KEYWORDS = [
  'network error',
  'connection refused',
  'port 5000',
  'not installed'
];

if (SKIP_HEALING_KEYWORDS.some(kw => error.includes(kw))) {
  console.log('⏭️  Skipping: Infrastructure error');
  return;  // Don't try to heal infrastructure issues
}

// 4. VERIFICATION & ROLLBACK
try {
  const verified = verifyFix(testFile);
  if (!verified) {
    console.log('❌ Fix failed verification, rolling back...');
    rollbackFix(testFile, backupPath);
    return { fixed: false };
  }
} catch (verifyError) {
  console.warn('⚠️  Verification error:', verifyError.message);
}
```

### Recoverable vs Non-Recoverable Errors

| Error | Type | Action |
|-------|------|--------|
| "Connection refused" | Non-recoverable (Infrastructure) | Skip healing |
| "Port 5000 not available" | Non-recoverable (Environment) | Skip healing |
| "Gemini API timeout" | Recoverable (Transient) | Retry 3x |
| "Could not find trace file" | Recoverable (Warn) | Continue with other tests |
| "Invalid test code" | Non-recoverable (Code issue) | Skip & report |
| "Test still fails after fix" | Recoverable (Verification) | Rollback |

---

## Report System

### Report Structure

**Location:** `reports/healer/index.html`

```html
<!-- Auto-generated index -->
<table>
  <tr>
    <td><a href="healer-report-2026-03-13T16-51-12-972Z.html">
      Latest: Mar 13, 2026 4:51 PM
    </a></td>
  </tr>
  <tr>
    <td><a href="healer-report-2026-03-13T15-30-45-123Z.html">
      Previous: Mar 13, 2026 3:30 PM
    </a></td>
  </tr>
</table>
```

### Individual Report Tabs

```
┌────────────────────────────────────────────────────────────┐
│  Healer Report - 2026-03-13T16-51-12-972Z                  │
├────────────────────────────────────────────────────────────┤
│ [Summary] [Tests] [Changes] [Timeline] [Logs]              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Summary Tab:                                               │
│ ✅ 5 tests healed out of 8                                 │
│ ⏱️  Duration: 45s                                           │
│ 📊 Success Rate: 62.5%                                     │
│                                                             │
│ Tests Tab:                                                 │
│ [HEALED] dialog_alert_rename_button.spec.ts                │
│          ❌ Before: page.locator('.MuiDialog-root')        │
│          ✅ After:  page.locator('.alert-dialog')          │
│                                                             │
│ Changes Tab:                                               │
│ - 5 selectors fixed                                        │
│ - 2 tests still failing                                    │
│ - 1 verification failed (rolled back)                      │
│                                                             │
│ Timeline Tab:                                              │
│ 16:51:12 - Started healer session                          │
│ 16:51:15 - Extracted trace (8.2MB)                         │
│ 16:51:18 - Called Gemini API                               │
│ 16:51:25 - Generated fix for dialog test                   │
│ 16:51:28 - Verification PASSED ✅                          │
│                                                             │
│ Logs Tab:                                                  │
│ JSON event log (copy-able)                                 │
└────────────────────────────────────────────────────────────┘
```

### Report Cleanup

```javascript
function cleanupOldReports() {
  // Keep LAST 5 reports
  // Delete older ones to prevent disk bloat
  
  const reportFiles = fs.readdirSync('reports/healer')
    .filter(f => f.match(/^healer-report-.*\.html$/))
    .sort((a, b) => {
      const timeA = extractTimestamp(a);
      const timeB = extractTimestamp(b);
      return timeB - timeA;  // Newest first
    });
  
  // Keep first 5, delete rest
  reportFiles.slice(5).forEach(old => {
    fs.unlinkSync(`reports/healer/${old}`);
  });
}
```

---

## Security & Validation

### Input Validation

**File:** `gemini-healer.js` (lines 900-1000)

```javascript
// 1. PROMPT INJECTION DETECTION
function detectPromptInjection(input) {
  const dangerousPatterns = [
    /system[\s\n]*prompt/gi,
    /ignore[\s\n]*instructions/gi,
    /override[\s\n]*rules/gi
  ];
  
  return dangerousPatterns.some(p => p.test(input));
}

// 2. CODE SANITIZATION
function sanitizeForPrompt(input, maxLength = 5000) {
  // Remove sensitive data
  input = input
    .replace(/api[_-]?key[:\s]*['"][^'"]+['"]/gi, 'API_KEY')
    .replace(/password[:\s]*['"][^'"]+['"]/gi, 'PASSWORD')
    .replace(/token[:\s]*['"][^'"]+['"]/gi, 'TOKEN');
  
  // Truncate to prevent token overflow
  return input.substring(0, maxLength);
}

// 3. DANGEROUS PATTERN DETECTION
const DANGEROUS_PATTERNS = [
  /fs\.(rm|unlink|rmdir)/,      // Deletion
  /execSync|execFile|spawn/,    // Process spawning
  /eval\(|new Function/,        // Code execution
  /process\.exit/,              // Process termination
];

function validateTestCode(code) {
  const dangerous = DANGEROUS_PATTERNS.filter(p => p.test(code));
  if (dangerous.length > 0) {
    throw new Error('Dangerous patterns detected: ' + dangerous);
  }
}

// 4. FILE PATH VALIDATION
const ALLOWED_TEST_PATTERNS = [
  /^[a-zA-Z0-9._\-/]+\.spec\.ts(x)?$/,
  /^[a-zA-Z0-9._\-/]+\.test\.ts(x)?$/
];

function validateTestPath(filePath) {
  if (!ALLOWED_TEST_PATTERNS.some(p => p.test(filePath))) {
    throw new Error('Invalid test file path');
  }
}
```

### Code Verification

```javascript
// TypeScript syntax validation before applying
function validateTypeScriptSyntax(code, filePath) {
  try {
    execFileSync('npx', ['tsc', '--noEmit', filePath], {
      stdio: 'pipe',
      timeout: 5000
    });
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Before applying fix:
if (!validateTypeScriptSyntax(fixedCode, testFile).valid) {
  throw new Error('Fixed code has syntax errors');
}
```

---

## Best Practices

### ✅ Do's

```javascript
// 1. USE TEXT-BASED SELECTORS
// Good: Survives CSS changes
const button = page.locator('button:has-text("Book Now")');
const button = page.getByRole('button', { name: /Book/i });
const button = page.getByText('Book Now');

// 2. USE DATA-TESTID FOR CRITICAL ELEMENTS
// Good: Stable, explicit intent
<button data-testid="book-movie">Book Now</button>
const button = page.getByTestId('book-movie');

// 3. USE SEMANTIC HTML
// Good: Clearer intent, better accessibility
<button>Book Now</button>        // ✅ Good
<div role="button">...</div>      // ✅ OK (if semantic)
<span class="btn">...</span>     // ❌ Bad (not semantic)

// 4. HANDLE ASYNC PROPERLY
// Good: Tests stable
await page.waitForLoadState('networkidle');
await page.locator('.submit-btn').click();
await page.waitForURL('**/confirmation');

// 5. USE NESTED LOCATORS FOR SHADOW DOM
// Good: Accesses nested elements
const parent = page.locator('seat-grid');
const button = parent.locator('button.available');
await button.click();

// 6. VERIFY WITH HUMAN
// Good: Understand the fix
await expect(page.locator('button[aria-label="Book"]')).toBeVisible();
```

### ❌ Don'ts

```javascript
// 1. AVOID BRITTLE CSS SELECTORS
❌ page.locator('.MuiButton-root.MuiButton-contained')  // Will break
❌ page.locator('button:nth-child(3)')                  // Fragile
❌ page.locator('.jxa3sl2 .bx9ks9')                     // Minified classes

// 2. AVOID HARDCODED INDICES
❌ page.locator('button').first()  // What if order changes?
❌ page.locator('button').nth(2)   // Too fragile

// 3. AVOID WAITING TOO LONG
❌ await page.waitForTimeout(5000)  // Slows tests
✅ await page.waitForLoadState()   // Waits for actual load

// 4. AVOID TEXT-ONLY FOR DUPLICATES
❌ page.locator('text=Save')  // Fails if 3 "Save" buttons exist
✅ page.locator('button', { has: page.locator('[aria-label="Save Photo"]') })

// 5. AVOID HIDDEN ELEMENTS
❌ page.locator('button.hidden').click()  // Can't interact
✅ await expect(button).toBeVisible()

// 6. AVOID API KEY IN TEST CODE
❌ const key = 'sk-123456789'  // Exposed in logs!
✅ const key = process.env.API_KEY
```

### Configuration Best Practices

```javascript
// .env Configuration
# DO:
HEALER_AUTO_FIX=true          # Enable auto-fix for trusted tests
HEALER_VERBOSE=true           # Enable verbose in development
BACKUP_RETENTION_DAYS=7       # Keep week+ of history

# DON'T:
HEALER_AUTO_FIX=true          # Don't enable globally on CI (review first)
GEMINI_API_KEY=AIza...        # Don't commit keys to git!
```

---

## Examples

### Example 1: CSS Class Change

**Scenario:** CSS refactoring renamed classes from `.btn-submit` to `.submit-button`

**Test Before:**
```typescript
import { test, expect } from '@playwright/test';

test('submit form', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // ❌ FAILS: ".btn-submit" no longer exists
  await page.locator('.btn-submit').click();
  
  await expect(page).toHaveURL('**/success');
});
```

**Error:**
```
Error: Locator ".btn-submit" resolved to 0 elements
```

**Trace Analysis:**
```
Real Button Found:
<button class="submit-button">Submit Form</button>
```

**Gemini Analysis:**
```
Root Cause: CSS class renamed from "btn-submit" to "submit-button"

Recommended Fix:
- Option 1: Use role-based selector (most resilient)
  page.getByRole('button', { name: /submit/i })
  
- Option 2: Use new class (works but fragile)
  page.locator('.submit-button')

Best Practice: Use role-based
```

**Test After:**
```typescript
test('submit form', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // ✅ PASSES: Role-based, survives future CSS changes
  await page.getByRole('button', { name: /submit/i }).click();
  
  await expect(page).toHaveURL('**/success');
});
```

---

### Example 2: Shadow DOM Component

**Scenario:** New seat-grid web component uses Shadow DOM

**Test Before:**
```typescript
test('select seats', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  
  // ❌ FAILS: "0 found" - buttons inside Shadow DOM
  const seats = page.locator('button.seat.available');
  await seats.first().click();
});
```

**Error:**
```
Error: Locator "button.seat.available" resolved to 0 elements
```

**Trace Analysis:**
```
DOM Architecture:
<seat-grid>
  #shadow-root
    <button class="seat available">Seat 1</button>
    <button class="seat available">Seat 2</button>
</seat-grid>

Issue: Buttons are inside Shadow DOM, direct selectors don't work
```

**Gemini Analysis:**
```
🏗️ DOM ARCHITECTURE ANALYSIS - CRITICAL

SHADOW DOM / WEB COMPONENTS DETECTED

KEY LIMITATION: getByRole(), getByText(), and page.locator()
DO NOT pierce Shadow DOM.

SPECIFIC FIX FOR SEAT-GRID SHADOW DOM:
- PROBLEM: page.locator("button.seat.available") ❌ FAILS
- FIX: Use nested locators
  page.locator("seat-grid").locator("button.available") ✅ WORKS

MUST USE for Shadow DOM elements:
- Nested locators: page.locator("parent").locator("child.classname")
- frameLocat or() for iframes
```

**Test After:**
```typescript
test('select seats', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  
  // ✅ PASSES: Nested locators pierce Shadow DOM
  const seatGrid = page.locator('seat-grid');
  const availableSeats = seatGrid.locator('button.available');
  await availableSeats.first().click();
});
```

---

### Example 3: Dialog Element with Alert

**Scenario:** Browser alert dialog appears during booking

**Test Before:**
```typescript
test('confirm booking', async ({ page }) => {
  // ... setup booking ...
  
  // ❌ FAILS: Alert not found as regular element
  await page.locator('[role="alertdialog"]').isVisible();
});
```

**Dialog Structure from Trace:**
```html
<div role="alertdialog" class="MuiDialog-root">
  <div class="MuiPaper-root">
    <div class="MuiDialogTitle-root">
      <h2>Confirm Booking</h2>
    </div>
    <div class="MuiDialogContent-root">
      <p>Are you sure?</p>
    </div>
    <div class="MuiDialogActions-root">
      <button>Cancel</button>
      <button>Confirm</button>
    </div>
  </div>
</div>
```

**Gemini Suggestion:**
```
Dialog found: "Confirm Booking"

Better approach:
1. Verify dialog appeared
2. Get text from dialog
3. Click button inside dialog (important: dialog might block clicks)

Fixed test:
await expect(page.locator('[role="alertdialog"]')).toBeVisible();
const dialogText = await page.locator('[role="alertdialog"]').textContent();
expect(dialogText).toContain('Confirm Booking');
await page.locator('[role="alertdialog"] button:has-text("Confirm")').click();
```

**Test After:**
```typescript
test('confirm booking', async ({ page }) => {
  // ... setup ...
  
  // ✅ PASSES: Handles dialog properly
  const dialog = page.locator('[role="alertdialog"]');
  
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Confirm Booking');
  
  // Click button inside dialog context
  await dialog.locator('button:has-text("Confirm")').click();
  
  // Dialog should disappear
  await expect(dialog).not.toBeVisible();
});
```

---

## Troubleshooting

### Issue: "Gemini API Key Missing"

**Symptom:**
```
❌ Error: GEMINI_API_KEY_TEST not configured
```

**Solution:**
```bash
# 1. Get API key from Google AI Studio
#    https://aistudio.google.com/app/apikey

# 2. Create .env file in e2e/
echo 'GEMINI_API_KEY_TEST=AIza_your_key_here' > .env

# 3. Verify
node -e "console.log(process.env.GEMINI_API_KEY_TEST)"

# Should output: AIza_your_key_here
```

---

### Issue: "No Trace Files Found"

**Symptom:**
```
📋 No trace.zip found in test-results/...
```

**Solution:**
```typescript
// 1. Check playwright.config.ts
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry',  // ✅ Must be present
  },
});

// 2. Ensure tests actually fail (traces only on failure)
// 3. Run tests with: npm test (not with --headed alone)

// 4. Check test-results/ exists
ls -la test-results/

// Should see:
// test-results/
// └── test-name-chromium/
//     └── trace.zip  ← This is needed
```

---

### Issue: "Fix Applied But Verification Failed"

**Symptom:**
```
✅ Fix applied
❌ Test still failing
🔙 Rolled back to backup
```

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Selector is fragile (picks wrong element) | Gemini needs better guidance; check trace |
| Test relies on external state | Ensure test is isolated and deterministic |
| App code is actually broken | Fix the app, not the test |
| Timing issue (element loads late) | Add `waitForLoadState()` |
| Shadow DOM/iframe not handled | Ensure trace captures real DOM |

**Debug Steps:**
```bash
# 1. Run test in headed mode to see what's happening
npx playwright test --headed

# 2. Check the trace to see real page state
# reports/playwright/index.html → Click test → View trace

# 3. Manually test selector in browser console
// In DevTools console:
document.querySelectorAll('[role="button"]')
// Check if element exists

# 4. Look at healer logs for clues
tail -50 reports/results/healing-logs.json
```

---

### Issue: "Rate Limited by Gemini API"

**Symptom:**
```
❌ Error: Rate limit exceeded (429)
```

**Solution:**
```bash
# 1. Check rate limit setting
HEALER_API_RATE_LIMIT=5  # Currently 5 calls/minute

# 2. Reduce frequency
HEALER_API_RATE_LIMIT=2  # Reduce to 2 calls/minute

# 3. Or wait before retrying
sleep 60
npm run heal:gemini

# 4. Monitor API usage
# https://console.cloud.google.com/apis/dashboard → Gemini API
```

---

### Issue: "Report Not Generated"

**Symptom:**
```
HTML report not created in reports/healer/
```

**Solution:**
```bash
# 1. Ensure you used --auto-fix flag
npm run heal:gemini:auto  # ✅ Generates report
npm run heal:gemini       # ❌ Only analyzes, no report

# 2. Check reports/ directory exists
mkdir -p reports/healer

# 3. Check file permissions
chmod -R 777 reports/

# 4. Look for errors
npm run heal:gemini:verbose 2>&1 | grep -i "report\|error"
```

---

## Summary

The **Self-Healing Test Automation Mechanism** is a sophisticated system that:

1. **Detects test failures** automatically
2. **Analyzes root causes** using Playwright traces
3. **Generates intelligent fixes** with Gemini AI
4. **Applies and verifies** changes safely
5. **Reports comprehensively** for audit trails

### Key Statistics

| Metric | Value |
|--------|-------|
| Main File Size | 2,400+ lines |
| Supported Test Types | Playwright .spec.ts/.test.ts |
| AI Model | Gemini 2.5 Flash (fast + cheap) |
| Trace Analysis | Extracts buttons, inputs, dialogs, DOM state |
| Error Recovery | Automatic rollback on verification fail |
| Report Retention | Last 5 sessions |
| Security | Prompt injection detection, code validation |
| Cost | ~$0.075 per M tokens (very cheap for testing) |

### When to Use

✅ **Good For:**
- Frontend tests with Material-UI components
- Tests prone to CSS class changes
- Tests using Shadow DOM/Web Components
- Continuous development with frequent UI changes
- Learning test automation best practices

❌ **Not Good For:**
- Integration tests (infrastructure issues)
- Tests with external API dependencies
- Load/performance tests
- Flaky network-dependent tests

---

**Last Updated:** March 13, 2026
**Version:** 2.0 (Playwright Traces + Gemini 2.5 Flash)
