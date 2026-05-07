# E2E Self-Healing Mechanism - Complete Technical Analysis

**Document Purpose**: Deep dive study into the Gemini-powered Playwright auto-healing system used in TicketsVenue E2E test automation.

**Last Updated**: March 15, 2026  
**Status**: Comprehensive Analysis  
**Audience**: QA Engineers, DevOps, Test Automation Architects

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Healing Workflow](#healing-workflow)
5. [Error Classification System](#error-classification-system)
6. [Security Framework](#security-framework)
7. [Configuration & Tuning](#configuration--tuning)
8. [Advanced Features](#advanced-features)
9. [Integration Points](#integration-points)
10. [Monitoring & Observability](#monitoring--observability)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Best Practices](#best-practices)

---

## Executive Summary

The **Self-Healing Mechanism** is an intelligent, AI-powered test automation system that:

- **Detects** failing Playwright tests automatically
- **Analyzes** root causes using Google Gemini API (LLM-based)
- **Generates** intelligent fixes for broken tests
- **Applies** fixes with safety verification & rollback capability
- **Reports** detailed insights via interactive HTML reports

### Key Capabilities

| Feature | Description | Status |
|---------|-------------|--------|
| **AI Analysis** | Gemini-powered root cause analysis | ✅ Active |
| **Auto-Fix** | Automatic test code generation and application | ✅ Active |
| **Verification** | Re-run tests to validate fixes | ✅ Active |
| **Rollback** | Automatic reversal if fixes fail | ✅ Active |
| **Security** | Comprehensive input validation & sanitization | ✅ Active |
| **Audit Trail** | Complete logging of all operations | ✅ Active |
| **Report Generation** | Interactive HTML dashboards | ✅ Active |
| **Rate Limiting** | API quota management with exponential backoff | ✅ Active |
| **Backup Management** | Automatic backup with retention policies | ✅ Active |
| **Source Code Analysis** | Optional frontend code context | ✅ Active |

---

## Architecture Overview

### High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    E2E Test Execution (npm test)                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│        Results Generated: reports/results/results.json          │
│        (Contains: title, error, status for each test)           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│            Invoke Healer (node gemini-healer.js)                │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │   PRE-FLIGHT CHECK      │
        │  - Dependencies OK?     │
        │  - Config valid?        │
        │  - Env ready?           │
        └────────────┬────────────┘
                     │
        Success?─────┴─► (Continue) ─┐
         (NO)                        │
          │                          │
      Exit 1                         ▼
                        ┌──────────────────────────┐
                        │ PARSE TEST RESULTS       │
                        │ Extract failed tests     │
                        │ Classify error types    │
                        └────────────┬─────────────┘
                                     │
                        ┌────────────┴─────────────┐
                        │  FOR EACH FAILED TEST    │
                        └────────────┬─────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │  DECISION GATE               │
                    │  Can test be fixed?         │
                    └────────────────┬────────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
           INFRA ERROR          UNKNOWN ERROR       FIXABLE ERROR
           (Network/Conn)     (Try to fix)      (Selector/Logic)
                 │                   │                   │
                 ▼                   ▼                   ▼
             SKIP TEST          ATTEMPT FIX         FIX TEST
            (Not fixable)       (50% chance)      (High confidence)
                                                        │
                                ┌──────────────────────┴──────────────────────┐
                                │                                             │
                                ▼                                             ▼
                        ┌─────────────────────┐                   ┌─────────────────────┐
                        │  SEND TO GEMINI API │                   │  SEND TO GEMINI API │
                        │  - Error message    │                   │  - Error message    │
                        │  - Test file code   │                   │  - Test file code   │
                        │  - Test title       │                   │  - Test title       │
                        │  - Stack trace      │                   │  - Stack trace      │
                        └──────────┬──────────┘                   └──────────┬──────────┘
                                   │                                         │
                                   ▼                                         ▼
                        ┌─────────────────────┐                   ┌─────────────────────┐
                        │ GEMINI ANALYSIS     │                   │ GEMINI ANALYSIS     │
                        │ (3 second timeout)  │                   │ (3 second timeout)  │
                        └──────────┬──────────┘                   └──────────┬──────────┘
                                   │                                         │
                                   ▼                                         ▼
                        ┌─────────────────────┐                   ┌─────────────────────┐
                        │  PARSE SUGGESTION   │                   │  PARSE SUGGESTION   │
                        │  - Root cause       │                   │  - Root cause       │
                        │  - Confidence score │                   │  - Confidence score │
                        │  - Fixed code       │                   │  - Fixed code       │
                        └──────────┬──────────┘                   └──────────┬──────────┘
                                   │                                         │
                                   ▼                                         ▼
                        ┌─────────────────────┐                   ┌─────────────────────┐
                        │  NO AUTO-FIX MODE   │                   │  AUTO-FIX MODE?    │
                        │  Log analysis only  │                   │  (--auto-fix flag) │
                        │  Skip application   │                   └──────────┬──────────┘
                        └─────────────────────┘                              │
                                                           ┌─────────────────┴──────────┐
                                                           │                            │
                                                      YES                          NO
                                                           │                            │
                                                           ▼                            ▼
                                                  ┌─────────────────┐      ┌─────────────────┐
                                                  │ CREATE BACKUP   │      │  REPORT ONLY    │
                                                  │ (timestamp.bak) │      │  Skip apply     │
                                                  └────────┬────────┘      └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ VALIDATE CODE   │
                                                  │ - No fs/exec    │
                                                  │ - No imports    │
                                                  │ - Syntax OK     │
                                                  │ - Size <50KB    │
                                                  └────────┬────────┘
                                                           │
                                        ┌──────────────────┴──────────────┐
                                        │                                 │
                                    VALID                            INVALID
                                        │                                 │
                                        ▼                                 ▼
                                  ┌─────────────┐          ┌──────────────────────┐
                                  │ APPLY FIX   │          │ REJECT & LOG ERROR   │
                                  │ ATOMICALLY  │          │ Rollback not needed  │
                                  └──────┬──────┘          └──────────────────────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │ RE-RUN TEST │
                                  │ (Verify fix)│
                                  └──────┬──────┘
                                         │
                                 ┌───────┴───────┐
                                 │               │
                            PASS             FAIL
                                 │               │
                                 ▼               ▼
                        ┌──────────────┐  ┌─────────────────┐
                        │ MARK FIXED   │  │ RESTORE BACKUP  │
                        │ Update logs  │  │ (Rollback)      │
                        └──────────────┘  │ Log failure     │
                                          └─────────────────┘
                                          
                        ┌──────────────────────────────────────┐
                        │  AFTER ALL TESTS PROCESSED           │
                        ├──────────────────────────────────────┤
                        │  - Generate HTML Report              │
                        │  - Create Error Report (if any)      │
                        │  - Persist Logs to JSON              │
                        │  - Cleanup Old Backups               │
                        │  - Cleanup Old Reports               │
                        └──────────────────────────────────────┘
```

### Component Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                     gemini-healer.js                            │
│                   (Main orchestrator)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ Pre-Flight Checks  │  │ Error Classifier │  │ API Client │ │
│  │ - Dependencies     │  │ - Infrastructure │  │ - Gemini   │ │
│  │ - Configuration    │  │ - Assertion      │  │ - Rate lim │ │
│  │ - Environment      │  │ - Selector       │  │ - Timeout  │ │
│  └────────────────────┘  └──────────────────┘  └────────────┘ │
│                                                                 │
│  ┌────────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ Security Layer     │  │ Backup Manager   │  │ Logging    │ │
│  │ - Input validation │  │ - Create backups │  │ - Events   │ │
│  │ - Code sanitize    │  │ - Atomic write   │  │ - Audit    │ │
│  │ - Path traversal   │  │ - Cleanup        │  │ - Stats    │ │
│  └────────────────────┘  └──────────────────┘  └────────────┘ │
│                                                                 │
│  ┌────────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ Test Analysis      │  │ Prompt Builder   │  │ Fix Engine │ │
│  │ - Parse results    │  │ - Context gather │  │ - Apply    │ │
│  │ - Extract errors   │  │ - Constraint     │  │ - Verify   │ │
│  │ - Decision logic   │  │ - Sanitize       │  │ - Rollback │ │
│  └────────────────────┘  └──────────────────┘  └────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌─────────────────────┐   ┌──────────────────────┐
    │ healer-report-      │   │ verify-sanitization  │
    │ generator.js        │   │ .js                  │
    │ (HTML Reports)      │   │ (Code validation)    │
    └─────────────────────┘   └──────────────────────┘
                │                         │
                ▼                         ▼
    ┌─────────────────────────────────────────────┐
    │  Output: reports/healer/                    │
    │  - healer-report-*.html                     │
    │  - healer-error-report-*.json               │
    │  - healing-logs.json                        │
    └─────────────────────────────────────────────┘
```

---

## Core Components

### 1. **Gemini Healer (gemini-healer.js)**

**Purpose**: Main orchestrator for the entire healing workflow.

**Key Responsibilities**:
- Pre-flight validation (dependencies, config, environment)
- Test results parsing and error classification
- Gemini API integration for intelligent analysis
- Fix application with safety verification
- Backup and rollback management
- Report generation and logging

**Configuration Driven By**:
- `GEMINI_API_KEY_TEST` - Required API authentication
- `HEALER_AUTO_FIX` - Enable/disable automatic fix application
- `HEALER_VERBOSE` - Detailed debug output
- `HEALER_MAX_RETRIES` - API retry attempts
- `HEALER_API_TIMEOUT` - Timeout for API calls
- `HEALER_API_RATE_LIMIT` - API calls per minute

**Key Functions**:

| Function | Purpose | Called By |
|----------|---------|-----------|
| `checkDependencies()` | Verify npm packages installed | Pre-flight |
| `validateConfiguration()` | Check config values | Pre-flight |
| `validateEnvironment()` | Check file paths and dirs | Pre-flight |
| `getFailedTests()` | Parse results.json | Analysis |
| `classifyErrorType()` | Categorize error | Decision gate |
| `shouldHealTest()` | Decide if fixable | Decision gate |
| `generateAnalysisPrompt()` | Build Gemini prompt | API request |
| `analyzeWithGemini()` | Call Gemini API | Analysis |
| `applyFix()` | Apply changes to file | Fix engine |
| `verifyFix()` | Re-run test | Verification |
| `createBackup()` | Save original version | Backup |
| `auditLog()` | Record operation | Logging |

### 2. **Report Generator (healer-report-generator.js)**

**Purpose**: Create interactive HTML reports of healing sessions.

**Output Format**: Professional 5-tab HTML interface:
1. **Status Tab**: Overall healing results & summary
2. **Details Tab**: Per-test analysis with errors
3. **Changes Tab**: Detailed code modifications
4. **Logs Tab**: Event timeline with timestamps
5. **Recommendations Tab**: Next steps & patterns

**Color Scheme**: Navy (#1e3a8a), Green (#10b981), Grey (#6b7280)

**Features**:
- ANSI code stripping (clean error output)
- Syntax highlighting for code blocks
- Line number formatting
- Responsive design (mobile-friendly)
- Interactive tabs with state persistence

### 3. **Sanitization Verifier (verify-sanitization.js)**

**Purpose**: Validate that security functions are properly implemented.

**Checks**:
1. `sanitizeForPrompt()` - Input escaping & redaction
2. `sanitizeErrorMessage()` - Error message cleaning
3. `detectPromptInjection()` - Injection attack detection
4. `validateTestCodeSize()` - Token overflow prevention
5. Integration in `generateAnalysisPrompt()`
6. Sanitized error types in analysis
7. Sanitized error messages
8. Sanitized test code

**Exit Code**: 0 if all 8 checks pass, 1 otherwise

### 4. **Selective Healer (gemini-healer-selective.js)**

**Purpose**: Alternative to full-file healing; fixes only specific test blocks.

**Key Difference**:
- Full healer: Healing entire test file
- Selective healer: Fix only failing `test()` blocks

**Advantages**:
- Preserves passing tests
- Reduces risk of systemic changes
- Faster API calls (smaller context)
- More granular rollback

**Algorithm**:
1. Parse file to extract test blocks
2. Identify failing tests by name
3. Extract only those test functions
4. Send to Gemini individually
5. Replace only the broken blocks
6. Keep passing tests unchanged

---

## Healing Workflow

### Phase 1: Pre-Flight Validation (3-5 seconds)

```typescript
// Step 1.1: Check Dependencies
Dependencies checked:
  ✓ @google/generative-ai
  ✓ @playwright/test
  ✓ dotenv

// Step 1.2: Validate Configuration
config = {
  HEALER_MAX_FILE_SIZE: 1048576,
  HEALER_MAX_RETRIES: 3,
  HEALER_API_TIMEOUT: 60000,
  HEALER_API_RATE_LIMIT: 5,
  BACKUP_RETENTION_DAYS: 7,
  MAX_BACKUPS_PER_FILE: 5
}

// Step 1.3: Validate Environment
Checks:
  ✓ .env file exists
  ✓ reports/results/results.json exists
  ✓ tests/ directory exists
  ✓ playwright.config.ts exists
  ✓ Backup directory writable
  ✓ Audit log directory writable
```

### Phase 2: Test Analysis & Classification (2-5 seconds)

```typescript
// Parse results.json
results = {
  suites: [
    {
      file: 'tests/MovieDetails.spec.ts',
      specs: [
        {
          title: 'should book seats for selected showtime',
          ok: false,
          error: [...],
          errorType: 'Test failed'
        }
      ]
    }
  ]
}

// Extract failed tests
failedTests = [
  {
    file: 'tests/MovieDetails.spec.ts',
    title: 'should book seats for selected showtime',
    error: 'locator with role=button and name=/Book Seats/i(...)',
    errorType: 'ASSERTION'  // Classified
  }
]

// Classify each error
INFRASTRUCTURE_ERRORS = [
  'connection refused', 'dns lookup failed', 'timeout waiting for connection', ...
]

errorType = classifyErrorType(error) → 'ASSERTION' | 'SELECTOR' | 'TIMEOUT' | ...
```

### Phase 3: Decision Gate (Per Test)

```typescript
for (const test of failedTests) {
  // Decision Logic
  if (test.classifiedType === 'INFRASTRUCTURE') {
    // TRUE network/connection errors - not fixable by test changes
    SKIP_TEST()
  } else if (test.classifiedType === 'ASSERTION') {
    // Assertion wrong, selector wrong, text changed - FIXABLE
    SEND_TO_GEMINI()
  } else if (test.classifiedType === 'SELECTOR') {
    // Locator broken, DOM changed - FIXABLE
    SEND_TO_GEMINI()
  } else if (test.classifiedType === 'UNKNOWN') {
    // Try anyway (better to attempt fix)
    SEND_TO_GEMINI()
  }
}
```

### Phase 4: Gemini API Analysis (3-10 seconds per test)

```typescript
// Build Prompt (Sanitized)
prompt = `
## Test Failure Analysis Request

**Test File**: tests/MovieDetails.spec.ts
**Test Name**: should book seats for selected showtime
**Error Message**: ${sanitizeErrorMessage(error)}

**Test Code**:
\`\`\`typescript
${sanitizeForPrompt(testCode)}
\`\`\`

**Stack Trace**:
${sanitizeForPrompt(stackTrace)}

**Your Task**:
1. Identify root cause of failure
2. Provide fixed test code
3. Explain the fix briefly
4. Rate confidence 0-100

Respond with:
ROOT_CAUSE: [brief explanation]
FIXED_CODE: [complete fixed test function]
CONFIDENCE: [80]
`

// Send to Gemini API
response = await genAI.generateContent(prompt)
  .then(response => parseResponse(response.text()))
  .catch(error => handleRetry(error))

// Parse Response
analysis = {
  rootCause: 'Button selector changed in Material-UI component update',
  fixedCode: 'test("should book seats..."...',
  confidence: 85,
  fixType: 'SELECTOR_UPDATE'
}
```

### Phase 5: Fix Application (Auto-Fix Mode Only) (2-10 seconds)

```typescript
if (HEALER_AUTO_FIX) {
  // Step 5.1: Create Backup
  backup = createBackup(testFilePath)
  // → reports/audit/.healer-backups/MovieDetails.spec.ts.1710521400000.bak

  // Step 5.2: Validate Generated Code
  validation = validateGeneratedCode(analysis.fixedCode)
  if (!validation.isValid) {
    console.error(`❌ Code validation failed: ${validation.issues}`)
    SKIP_APPLICATION()
  }

  // Step 5.3: Apply Fix Atomically
  originalContent = fs.readFileSync(testFilePath, 'utf8')
  newContent = originalContent.replace(oldTestBlock, analysis.fixedCode)
  atomicFileWrite(testFilePath, newContent)
  // Safe: create temp file → verify → move to target → cleanup temp
  
  // Step 5.4: Re-Run Test for Verification
  result = execSync('npx playwright test TestFile.spec.ts --reporter=json', {
    stdio: 'pipe'
  })
  
  if (result.passed) {
    console.log(`✅ Fix verified! Test now passes.`)
    logHealingEvent('verification_passed', testName, oldLocator, newLocator)
  } else {
    console.error(`❌ Fix failed verification. Rolling back.`)
    fs.copyFileSync(backup, testFilePath)  // Restore from backup
    logHealingEvent('verification_failed', testName, oldLocator, newLocator)
  }
}
```

### Phase 6: Reporting & Cleanup (1-3 seconds)

```typescript
// Step 6.1: Update Logs
healingLogs = {
  sessionId: 'healing-1710521400000-abc123',
  startTime: '2024-03-15T10:00:00Z',
  events: [
    { timestamp, eventType: 'locator_failure', element: 'bookButton', ... },
    { timestamp, eventType: 'element_healed', element: 'bookButton', ... }
  ],
  statistics: {
    totalEvents: 25,
    failedLocators: 5,
    workedLocators: 5,
    elementsHealed: 5,
    avgConfidence: 82
  }
}

// Step 6.2: Generate HTML Report
generateHtmlReport({
  tests: [...],
  session: healingLogs,
  summary: {...}
})
// → reports/healer/healer-report-{timestamp}.html

// Step 6.3: Generate Error Report (if failures)
generateErrorReport(failedHeals)
// → reports/healer/healer-error-report-{timestamp}.json

// Step 6.4: Cleanup Old Backups
cleanupOldBackups()
// Keep last 5 per file + older than 7 days

// Step 6.5: Cleanup Old Reports
cleanupOldReports()
// Keep last 5 reports, delete older
```

---

## Error Classification System

### Classification Categories

```
ERROR TYPE             FIXABLE?  ROOT CAUSES                          EXAMPLES
──────────────────────────────────────────────────────────────────────────────
INFRASTRUCTURE        ❌ NO      Connection issues, DNS, timeouts    "Connection refused"
                                Network problems, server down        "Socket hang up"
                                                                    "Host not found"
                                
ASSERTION             ✅ YES     Expected text/value wrong          "expect(1).toBe(2)"
                                Element not found                    "Button not found"
                                Wrong page state                     "URL mismatch"
                                
SELECTOR              ✅ YES     Locator syntax broken              "Not in strict mode"
                                Element moved in DOM                 "No matching elements"
                                Strict mode violations              "Too many matches"
                                
NAVIGATION            ✅ YES     URL changed                        "Expected localhost:3000"
                                Routing logic altered               "Actual: localhost:5000"
                                
DOM_ARCHITECTURE      ✅ YES     Shadow DOM, iframes               "Cannot pierce shadow DOM"
                                Web Components                      "Frames not accessible"
                                Nested elements
                                
TIMEOUT_ASSERTION     ✅ YES     Timeout waiting for element        "Waiting for selector timeout"
                                Element appears late                "Navigation timeout"
                                
BEHAVIORAL_CHANGE     ✅ YES     Frontend behavior changed          "Button no longer shows"
                                Logic flow altered                  "Redirect happens earlier"
                                
UNKNOWN               ⚠️ TRY     Unable to classify               "Stack trace unclear"
                                Edge cases                         "Unexpected error format"
```

### Classification Logic

```typescript
function classifyErrorType(errorMessage) {
  const lower = errorMessage.toLowerCase();
  
  // Check for TRUE infrastructure/connection errors FIRST
  const INFRASTRUCTURE_ERRORS = [
    'connection refused', 'connection reset', 'enotfound', 'econnrefused',
    'host not found', 'dns', 'getaddrinfo', 'econnreset',
    'target page, context or browser has been closed', 'browser context was closed',
    'websocket closed', 'target closed', 'session not created',
    'err_name_not_resolved', 'err_connection_refused', 'err_connection_reset',
    'err_network_changed', 'timeout waiting for connection',
    'socket hang up', 'socket error', 'epipe'
  ];
  
  for (const infError of INFRASTRUCTURE_ERRORS) {
    if (lower.includes(infError)) {
      return 'INFRASTRUCTURE';  // Skip - not fixable
    }
  }
  
  // Check for timeout patterns (more nuanced)
  if (lower.includes('timeout')) {
    if (lower.includes('waiting for') && (lower.includes('connection') || lower.includes('server'))) {
      return 'INFRASTRUCTURE';  // Network timeout - skip
    }
    if (lower.includes('browser') && lower.includes('closed')) {
      return 'INFRASTRUCTURE';  // Browser crashed - skip
    }
    return 'TIMEOUT_ASSERTION';  // Assertion timeout - fixable
  }
  
  // Check for selector/DOM errors (fixable)
  if (lower.includes('not in strict mode') || lower.includes('strict mode')) {
    return 'SELECTOR';
  }
  if (lower.includes('no matching element') || lower.includes('selector did not resolve')) {
    return 'SELECTOR';
  }
  if (lower.includes('expect') || lower.includes('assertion')) {
    return 'ASSERTION';
  }
  
  // URL/navigation errors (fixable)
  if (lower.includes('expected url') || lower.includes('toHaveURL')) {
    return 'NAVIGATION';
  }
  
  // Shadow DOM / iframes
  if (lower.includes('shadow') || lower.includes('frame') || lower.includes('iframe')) {
    return 'DOM_ARCHITECTURE';
  }
  
  return 'UNKNOWN';  // Try anyway
}
```

### Healing Decision Logic

```typescript
function shouldHealTest(testInfo, testCode = '') {
  const classifiedType = testInfo.classifiedType || 'UNKNOWN';
  
  // ❌ SKIP: Only true infrastructure errors
  if (classifiedType === 'INFRASTRUCTURE') {
    console.log('⏭️  Skipping: True infrastructure error (not fixable)');
    return false;
  }
  
  // ✅ HEAL: All other error types
  const healableTypes = ['ASSERTION', 'SELECTOR', 'NAVIGATION', 'DOM_ARCHITECTURE', 'TIMEOUT_ASSERTION'];
  if (healableTypes.includes(classifiedType)) {
    console.log(`✅ Healing: ${classifiedType} error (fixable)`);
    return true;
  }
  
  // ⚠️ ATTEMPT: Unknown errors
  if (classifiedType === 'UNKNOWN') {
    console.log('🔍 Unknown error type, attempting to heal...');
    return true;  // Better to try than skip
  }
  
  return true;  // Default: attempt healing
}
```

---

## Security Framework

### Input Validation & Sanitization

#### 1. **CLI Argument Validation**

```typescript
function parseArgs() {
  const args = process.argv.slice(2);
  let testFile = args.find(arg => !arg.startsWith('-'));
  
  // Validate test file name (alphanumeric + dot/hyphen/slash only)
  if (testFile) {
    if (!/^[a-zA-Z0-9._\-/]+$/.test(testFile)) {
      console.error(`❌ Invalid test file name: ${testFile}`);
      process.exit(1);
    }
    
    // Prevent directory traversal (../../etc/passwd)
    if (testFile.includes('..')) {
      console.error('❌ Directory traversal detected');
      process.exit(1);
    }
  }
  
  return {
    autoFix: args.includes('--auto-fix'),
    verbose: args.includes('--verbose'),
    testFile: testFile,
    help: args.includes('--help')
  };
}
```

#### 2. **File Path Validation**

```typescript
function validateFilePath(filePath) {
  try {
    const resolved = path.resolve(filePath);
    const projectRoot = path.resolve(process.cwd());
    const testDir = path.resolve(process.cwd(), 'tests');
    
    // Ensure path is within expected directories
    if (!resolved.startsWith(testDir) && !resolved.startsWith(projectRoot)) {
      console.error(`❌ Path traversal detected: ${filePath}`);
      return null;
    }
    
    // Prevent symlink exploitation
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) {
      console.error(`❌ Symbolic links not allowed: ${filePath}`);
      return null;
    }
    
    // Prevent oversized files (DOS attack)
    if (stats.size > HEALER_MAX_FILE_SIZE) {
      console.error(`❌ File exceeds max size (${HEALER_MAX_FILE_SIZE} bytes)`);
      return null;
    }
    
    return resolved;
  } catch (err) {
    console.error(`❌ Path validation error: ${err.message}`);
    return null;
  }
}
```

#### 3. **Test Code Sanitization**

```typescript
function sanitizeForPrompt(input, maxLength = 5000) {
  if (!input || typeof input !== 'string') return '';
  
  // Truncate if too long
  let sanitized = input.substring(0, maxLength);
  
  // Escape special characters for safety
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  
  // Remove sensitive information
  sanitized = sanitized
    .replace(/GEMINI_API_KEY[=:].*?[\n;]/g, 'GEMINI_API_KEY=***REDACTED***')
    .replace(/password[=:].*?[\n;]/g, 'password=***REDACTED***')
    .replace(/secret[=:].*?[\n;]/g, 'secret=***REDACTED***');
  
  return sanitized;
}

function sanitizeErrorMessage(error, maxLength = 1000) {
  if (!error) return '';
  
  let msg = error.substring(0, maxLength);
  
  // Remove file paths (info disclosure)
  msg = msg.replace(/\/[a-zA-Z0-9_\-/]*\.js/g, '/***');
  msg = msg.replace(/C:\\.*?\\/g, 'C:\\***\\');
  
  // Remove API keys
  msg = msg.replace(/AIzaSy[a-zA-Z0-9_\-]{35}/g, 'AIzaSy***REDACTED***');
  
  return msg;
}

function detectPromptInjection(input) {
  const INJECTION_PATTERNS = [
    /ignore previous instructions/i,
    /system prompt/i,
    /you are now a/i,
    /as an ai/i,
    /forget about/i,
    /do this instead/i,
    /generate.*without.*safety/i
  ];
  
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  
  return false;
}
```

#### 4. **Generated Code Validation**

```typescript
function validateGeneratedCode(code) {
  const issues = [];
  
  // Dangerous patterns that should NOT appear in test code
  const DANGEROUS_PATTERNS = [
    /fs\.(rm|unlink|rmdir)/,           // File deletion
    /execSync|execFile|spawn/,         // Shell execution
    /require\(|import\(/,              // Dynamic imports
    /eval\(|new Function/,             // Code execution
    /process\.exit/,                   // Process termination
    /child_process/                    // Child process execution
  ];
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      issues.push(`Dangerous pattern detected: ${pattern}`);
    }
  }
  
  // Check for suspicious imports
  if (code.match(/import.*fs|import.*child_process|import.*os/)) {
    issues.push('Suspicious imports detected (fs, child_process, os)');
  }
  
  // Determine if this is a partial fix (just locator) or full test
  const isPartialFix = (code.includes('page.locator') || code.includes('.locator(')) && 
                        !code.includes('test(') && 
                        !code.includes('it(');
  
  if (!isPartialFix) {
    // Full test functions MUST have test() and expect()
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

function validateTestCodeSize(code, maxLength = 50000) {
  if (!code || typeof code !== 'string') {
    return { valid: false, reason: 'Code is not a string' };
  }
  
  if (code.length > maxLength) {
    return { 
      valid: false, 
      reason: `Test code exceeds max size (${code.length} > ${maxLength})`
    };
  }
  
  return { valid: true };
}
```

### Audit Trail & Logging

```typescript
function auditLog(action, filePath, details = '') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,                              // BACKUP_CREATED, FIX_APPLIED, ROLLBACK, etc.
    filePath: path.basename(filePath),
    userId: process.env.USER || 'unknown',
    details,
    pid: process.pid
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(HEALER_AUDIT_LOG, logLine, 'utf8');
  // Stored in: reports/audit/.healer-audit.log
  
  if (HEALER_VERBOSE) {
    console.log(`📝 Audit: ${action} - ${path.basename(filePath)}`);
  }
}
```

**Audit Log Entry Example**:
```json
{
  "timestamp": "2024-03-15T10:05:30.123Z",
  "action": "BACKUP_CREATED",
  "filePath": "MovieDetails.spec.ts",
  "userId": "devuser",
  "details": "reports/audit/.healer-backups/MovieDetails.spec.ts.1710521130000.bak",
  "pid": 8492
}
```

---

## Configuration & Tuning

### Environment Variables (Priority: CLI > .env > Defaults)

| Variable | Type | Default | Purpose | Example |
|----------|------|---------|---------|---------|
| **GEMINI_API_KEY_TEST** | string | - | **REQUIRED**: Gemini API key | `AIzaSy...` |
| HEALER_AUTO_FIX | bool | false | Enable auto-fix mode | `true` |
| HEALER_VERBOSE | bool | false | Enable debug logging | `true` |
| HEALER_MAX_RETRIES | int | 3 | API call retry attempts | `5` |
| HEALER_API_TIMEOUT | ms | 60000 | API response timeout | `120000` |
| HEALER_API_RATE_LIMIT | calls/min | 5 | Gemini API rate limit | `10` |
| HEALER_MAX_FILE_SIZE | bytes | 1048576 | Max test file size | `2097152` |
| HEALER_BACKUP_DIR | path | `reports/audit/.healer-backups` | Backup storage | `.backups` |
| HEALER_AUDIT_LOG | path | `reports/audit/.healer-audit.log` | Audit log | `.audit.log` |
| BACKUP_RETENTION_DAYS | days | 7 | Keep backups for | `14` |
| MAX_BACKUPS_PER_FILE | count | 5 | Max backups per file | `10` |
| **HEALER_SOURCE_CODE_ANALYSIS** | bool | false | Include app source code | `true` |
| HEALER_SOURCE_CODE_WHITELIST | glob | `movieapp/frontend/src/components/**` | Files to analyze | `src/**` |
| HEALER_SOURCE_CODE_MAX_FILE_SIZE | bytes | 500000 | Max source file | `1000000` |
| MAX_SOURCE_CODE_FILES_PER_SESSION | count | 20 | Max files to extract | `50` |

### Example .env File

```bash
# === REQUIRED ===
GEMINI_API_KEY_TEST=AIzaSy_your_actual_api_key_here_

# === HEALING MODE ===
HEALER_AUTO_FIX=true                    # Auto-apply fixes
HEALER_VERBOSE=true                     # Show debug output

# === PERFORMANCE ===
HEALER_MAX_RETRIES=3                    # Retry failed API calls
HEALER_API_TIMEOUT=60000                # Wait up to 60 seconds
HEALER_API_RATE_LIMIT=5                 # Max 5 API calls/minute

# === STORAGE ===
HEALER_MAX_FILE_SIZE=1048576            # 1MB file size limit
HEALER_BACKUP_DIR=reports/audit/.healer-backups
HEALER_AUDIT_LOG=reports/audit/.healer-audit.log
BACKUP_RETENTION_DAYS=7                 # Keep 7 days
MAX_BACKUPS_PER_FILE=5                  # Keep 5 per file

# === SOURCE CODE ANALYSIS (Optional) ===
HEALER_SOURCE_CODE_ANALYSIS=true        # Include frontend code
HEALER_SOURCE_CODE_WHITELIST=movieapp/frontend/src/components/**
HEALER_SOURCE_CODE_MAX_FILE_SIZE=500000 # 500KB per file
MAX_SOURCE_CODE_FILES_PER_SESSION=20    # 20 files max
```

### Command-Line Flags

```bash
# Healing and Reporting (no fixes applied)
node gemini-healer.js
node gemini-healer.js --verbose
node gemini-healer.js -v

# Healing with Auto-Fix
node gemini-healer.js --auto-fix
node gemini-healer.js --auto-fix --verbose
node gemini-healer.js -a -v

# Heal Specific File
node gemini-healer.js --auto-fix tests/MovieDetails.spec.ts
node gemini-healer.js tests/HomePage.spec.ts

# Help
node gemini-healer.js --help
```

---

## Advanced Features

### 1. Selective Test Block Healing

**File**: `gemini-healer-selective.js`

**Purpose**: Fix only failing test blocks instead of entire files.

**Advantage**: Preserves passing tests within the same file.

**How It Works**:

```typescript
// Parse file to extract test blocks
testBlocks = [
  { name: 'should load page', start: 0, end: 150, code: '...', isFailing: true },
  { name: 'should click button', start: 150, end: 350, code: '...', isFailing: false },
  { name: 'should submit form', start: 350, end: 500, code: '...', isFailing: true }
]

// Extract failing only
failingBlocks = testBlocks.filter(b => b.isFailing)
// → [should load page, should submit form]

// Analyze each failing block separately
for (const block of failingBlocks) {
  analysis = await analyzeTestBlock(block)
  // → Fixed code for that block only
  
  newContent = originalContent
    .substring(0, block.startPos)
    + analysis.fixedCode
    + originalContent.substring(block.endPos)
}

// Result: File with 2 fixed blocks + 1 unchanged passing block
```

### 2. Source Code Context Analysis

**Purpose**: Include frontend source code in Gemini prompts to provide richer context.

**Controlled By**:
- `HEALER_SOURCE_CODE_ANALYSIS=true` to enable
- Whitelist patterns (default: `movieapp/frontend/src/components/**`)
- File size limits (500KB default)
- Session extraction limits (20 files, 2MB total)

**How It Works**:

```typescript
if (HEALER_SOURCE_CODE_ANALYSIS) {
  // Find relevant source files
  sourceFiles = globSync(HEALER_SOURCE_CODE_WHITELIST)
  
  // Filter by keyword matching (component names from error)
  relevantFiles = sourceFiles.filter(file => {
    return file.includes('MovieDetails') ||  // From test name
           file.includes('PaymentPage')      // From error context
  })
  
  // Extract and send with test error
  prompt = `
  ## Frontend Code Context
  
  ### MovieDetails.tsx
  \`\`\`typescript
  ${extractSourceCode('MovieDetails.tsx')}
  \`\`\`
  
  ### PaymentPage.tsx
  \`\`\`typescript
  ${extractSourceCode('PaymentPage.tsx')}
  \`\`\`
  
  ## Test Failure
  [test error details]
  `
}
```

**Audit Trail**:
- Logged in `logs/source-code-access-audit.json`
- Tracks: file name, bytes extracted, timestamp, session
- Per-session limits prevent excessive extraction

### 3. Intelligent Retry Mechanism

**Algorithm**: Exponential backoff with circuit breaker

```typescript
async function analyzeWithGemini(testInfo, retryCount = 0) {
  try {
    await rateLimitAndWait()  // Respect rate limits
    
    const finalPrompt = generateAnalysisPrompt(testInfo)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const response = await Promise.race(
      model.generateContent(finalPrompt),
      timeoutPromise(HEALER_API_TIMEOUT)
    )
    
    return parseAnalysisResponse(response.text())
    
  } catch (error) {
    if (retryCount < HEALER_MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, retryCount) * 1000
      console.log(`⏱️  Retrying in ${delay/1000}s (attempt ${retryCount+1}/${HEALER_MAX_RETRIES})`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      return analyzeWithGemini(testInfo, retryCount + 1)
    } else {
      throw error
    }
  }
}
```

### 4. Atomic File Operations

**Purpose**: Ensure data integrity even if process crashes.

```typescript
function atomicFileWrite(filePath, content) {
  const targetDir = path.dirname(filePath);
  
  // Step 1: Write to temporary file
  const tempFile = path.join(
    targetDir,
    `healer-${Date.now()}-${randomId()}.tmp`
  );
  fs.writeFileSync(tempFile, content, 'utf8');
  
  // Step 2: Verify content matches
  const written = fs.readFileSync(tempFile, 'utf8');
  if (written !== content) {
    fs.unlinkSync(tempFile);
    throw new Error('Content verification failed');
  }
  
  // Step 3: Copy to target (atomic on most systems)
  fs.copyFileSync(tempFile, filePath);
  
  // Step 4: Cleanup temp file
  fs.unlinkSync(tempFile);
  
  // If process crashes between steps 3-4, temp file remains but target is intact
}
```

### 5. Backup Management

**Retention Policy**:
- Keep last 5 backups per file
- Keep backups for 7 days
- Cleanup runs after healing session

**Backup File Naming**:
```
reports/audit/.healer-backups/MovieDetails.spec.ts.1710521130000.bak
                                               └─ timestamp ──┘
```

**Cleanup Logic**:
```typescript
function cleanupOldBackups() {
  // Group backups by original file
  const backupsByFile = {};
  files.forEach(file => {
    const match = file.match(/^(.+)\.(\d+)\.bak$/);
    if (match) {
      const originalFile = match[1];
      const timestamp = parseInt(match[2]);
      
      if (!backupsByFile[originalFile]) {
        backupsByFile[originalFile] = [];
      }
      backupsByFile[originalFile].push({ file, timestamp });
    }
  });
  
  // For each file: keep newest 5, delete older than 7 days
  Object.entries(backupsByFile).forEach(([file, backups]) => {
    backups.sort((a, b) => b.timestamp - a.timestamp);
    
    backups.forEach((backup, idx) => {
      const age = now - backup.timestamp;
      const tooOld = age > (7 * 24 * 60 * 60 * 1000);
      const tooMany = idx >= 5;
      
      if (tooOld || tooMany) {
        fs.unlinkSync(path.join(HEALER_BACKUP_DIR, backup.file));
      }
    });
  });
}
```

---

## Integration Points

### With Playwright Test Framework

**playwright.config.ts**:
```typescript
export default defineConfig({
  testDir: './tests',
  reporter: [
    ['html', { outputFolder: 'reports/playwright' }],
    ['json', { outputFile: 'reports/results/results.json' }]  // ← Healer reads this
  ],
  use: {
    trace: 'on-first-retry',  // Capture traces for analysis
  }
})
```

**How Healer Reads Results**:
1. Playwright writes `reports/results/results.json`
2. Healer `getFailedTests()` parses it
3. Extracts: file, title, error, stack trace
4. Classifies error type
5. Sends to Gemini for analysis

### With GitHub Actions (CI/CD)

**Example Workflow**:
```yaml
name: Test & Heal

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Start backend/frontend
      - name: Start Services
        run: |
          cd movieapp/backend && npm install && npm start &
          cd movieapp/frontend && npm install && npm start &
          sleep 10
      
      # Run tests
      - name: Run E2E Tests
        run: cd e2e && npm install && npm test || true  # Don't fail on test failures
      
      # Heal failures
      - name: Auto-Heal Failures (No-Fix Mode)
        if: always()
        env:
          GEMINI_API_KEY_TEST: ${{ secrets.GEMINI_API_KEY }}
          HEALER_VERBOSE: true
        run: cd e2e && node gemini-healer.js --verbose
      
      # Upload reports
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: healer-report
          path: e2e/reports/healer/
```

**Note**: In CI, always use analysis-only mode (no `--auto-fix`) to prevent unreviewed code commits.

### JSON Schema for Results

**Input** (`reports/results/results.json`):
```json
{
  "suites": [
    {
      "file": "tests/MovieDetails.spec.ts",
      "specs": [
        {
          "title": "should book seats for selected showtime",
          "ok": false,
          "error": "locator with role=button and name=/Book Seats/i not found",
          "errorType": "Test failed"
        }
      ]
    }
  ]
}
```

**Output** (`reports/healer/healer-report-{timestamp}.html`):
- Status Tab: Summary of healed tests
- Details Tab: Per-test analysis
- Changes Tab: Code diffs
- Logs Tab: Event timeline
- Recommendations Tab: Next steps

---

## Monitoring & Observability

### Healing Logs (JSON)

**File**: `reports/results/healing-logs.json`

**Structure**:
```json
{
  "sessionId": "healing-1710521400000-abc123",
  "startTime": "2024-03-15T10:00:00.000Z",
  "endTime": "2024-03-15T10:05:30.456Z",
  "events": [
    {
      "timestamp": "2024-03-15T10:05:10.123Z",
      "eventType": "locator_failure",
      "elementName": "BookSeatsButton",
      "failedLocator": "role=button and name=/Book Seats/i",
      "workingLocator": "role=button and name=/Confirm Booking/i",
      "details": {
        "duration": 2300,
        "confidence": 85
      }
    },
    {
      "timestamp": "2024-03-15T10:05:15.456Z",
      "eventType": "element_healed",
      "elementName": "BookSeatsButton",
      "failedLocator": "role=button and name=/Book Seats/i",
      "workingLocator": "role=button and name=/Confirm Booking/i",
      "details": { }
    }
  ],
  "statistics": {
    "totalEvents": 25,
    "failedLocators": 5,
    "workedLocators": 5,
    "elementsHealed": 5,
    "behavioralChangesDetected": 2,
    "frontendBugsDetected": 1,
    "selectorUpdates": 3,
    "textUpdates": 1,
    "urlUpdates": 1,
    "architecturalFixes": 0,
    "decisionBreakdown": {
      "FRONTEND_BUG": 1,
      "UPDATE_TEST": 2,
      "UPDATE_SELECTOR": 3
    },
    "confidenceDistribution": {
      "high": 4,
      "medium": 1,
      "low": 0
    }
  }
}
```

### Audit Log

**File**: `reports/audit/.healer-audit.log`

**Format** (one JSON object per line):
```json
{"timestamp":"2024-03-15T10:05:10.123Z","action":"BACKUP_CREATED","filePath":"MovieDetails.spec.ts","userId":"devuser","details":"reports/audit/.healer-backups/MovieDetails.spec.ts.1710521130000.bak","pid":8492}
{"timestamp":"2024-03-15T10:05:15.456Z","action":"FIX_APPLIED","filePath":"MovieDetails.spec.ts","userId":"devuser","details":"Locator updated: /Book Seats/ → /Confirm Booking/","pid":8492}
{"timestamp":"2024-03-15T10:05:20.789Z","action":"VERIFICATION_PASSED","filePath":"MovieDetails.spec.ts","userId":"devuser","details":"Test re-run successful","pid":8492}
```

**Audit Log Functions**:
- `auditLog('BACKUP_CREATED', filePath, backupPath)`
- `auditLog('FIX_APPLIED', filePath, changeDescription)`
- `auditLog('VERIFICATION_PASSED', filePath, resultSummary)`
- `auditLog('ROLLBACK_EXECUTED', filePath, reason)`
- `auditLog('ERROR_REPORT_GENERATED', reportPath)`

### Source Code Access Audit

**File**: `logs/source-code-access-audit.json`

**Tracks**:
```json
{
  "timestamp": "2024-03-15T10:05:10.123Z",
  "sessionId": "healing-1710521400000-abc123",
  "filesAnalyzed": [
    {
      "path": "movieapp/frontend/src/components/MovieDetails.tsx",
      "bytesExtracted": 2850,
      "timestamp": "2024-03-15T10:05:12.000Z"
    }
  ],
  "totalBytesExtracted": 5700,
  "sessionLimit": 2097152,
  "withinLimit": true
}
```

### Health Checks

**Pre-Flight Validation Output**:
```
🔍 Pre-flight Environment Checks:
  ✅ .env file
  ✅ reports/results/results.json
  ✅ tests/ directory
  ✅ playwright.config.ts
  ✅ Backup directory
  ✅ Audit log directory

✅ All environment checks passed
```

**Configuration Validation Output**:
```
✅ Configuration validation passed:
   HEALER_MAX_FILE_SIZE: 1048576
   HEALER_MAX_RETRIES: 3
   HEALER_API_TIMEOUT: 60000
   HEALER_API_RATE_LIMIT: 5
   BACKUP_RETENTION_DAYS: 7
   MAX_BACKUPS_PER_FILE: 5
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### ❌ "GEMINI_API_KEY_TEST environment variable is not set"

**Cause**: Missing or invalid API key configuration.

**Solutions**:
1. Create `.env` file in `e2e/` directory:
   ```bash
   cp .env.example .env
   ```
2. Add your Gemini API key:
   ```bash
   GEMINI_API_KEY_TEST=AIzaSy_your_key_here_
   ```
3. Verify format (starts with `AIzaSy`, 39+ chars):
   ```bash
   echo $GEMINI_API_KEY_TEST | wc -c  # Should be ≥ 40
   ```
4. Get key from: https://aistudio.google.com/app/apikeys

#### ❌ "Failed to analyze test: DEADLINE_EXCEEDED"

**Cause**: Gemini API timeout (default 60s).

**Solutions**:
1. Increase timeout in `.env`:
   ```bash
   HEALER_API_TIMEOUT=120000  # 120 seconds
   ```
2. Check API quota/usage: https://aistudio.google.com/app/apikeys
3. Try again in 5 minutes (rate limiting)

#### ❌ "Rate limit reached. Waiting Xs"

**Cause**: Exceeding 5 API calls per minute.

**Solutions**:
1. Increase rate limit in `.env`:
   ```bash
   HEALER_API_RATE_LIMIT=10  # Allow 10 calls/minute
   ```
2. **Note**: Gemini API has hard limits (~1000/day for free tier)
3. Space out healer runs across CI/CD pipeline

#### ❌ "File exceeds max size (1048576 bytes)"

**Cause**: Test file larger than 1MB limit.

**Solutions**:
1. Increase limit in `.env`:
   ```bash
   HEALER_MAX_FILE_SIZE=2097152  # 2MB
   ```
2. **Better**: Split large test files:
   ```typescript
   // ❌ DON'T: 1500 lines in one file
   // @playwright/test doesn't scale well
   
   // ✅ DO: Split into multiple files
   // HomePage.spec.ts (300 lines)
   // MovieDetails.spec.ts (300 lines)
   // Booking.spec.ts (300 lines)
   ```

#### ❌ "Path traversal detected"

**Cause**: CLI argument contains `..` or invalid characters.

**Solutions**:
1. Use safe file names:
   ```bash
   ✅ node gemini-healer.js tests/HomePage.spec.ts
   ❌ node gemini-healer.js ../../etc/passwd
   ❌ node gemini-healer.js tests/..//..//HomePage.spec.ts
   ```
2. Healer only accepts:
   - Alphanumeric: a-z, A-Z, 0-9
   - Punctuation: . (dot), - (hyphen), / (slash)

#### ❌ "Dangerous pattern detected"

**Cause**: Gemini generated code with unsafe patterns (`fs`, `exec`, etc.).

**Solutions**:
1. This is a **safety feature**; don't disable it
2. Check Gemini's analysis carefully
3. Re-run healer; Gemini may generate safer code on retry
4. Manual fix required if persist

#### ❌ "No test results found. Run tests first"

**Cause**: `reports/results/results.json` doesn't exist.

**Solutions**:
1. Run tests first:
   ```bash
   cd e2e && npm test
   ```
2. Verify `reports/results/results.json` was created:
   ```bash
   ls -la reports/results/  # Should show results.json
   ```

#### ❌ "Verification failed. Rolling back"

**Cause**: Fix applied but test still fails.

**Solutions**:
1. Check healer logs for details:
   ```bash
   cat reports/results/healing-logs.json | grep "verification_failed"
   ```
2. Review the error in reports/healer HTML report
3. Manual code review often needed
4. Consider if error is infrastructure (unfixable)

#### ✅ "Code validation failed: No test function found"

**Cause**: Gemini generated incomplete code (e.g., just a locator).

**Solutions**:
1. This might be intentional (partial fix)
2. Check HTML report to see generated code
3. If partial, manually wrap in test():
   ```typescript
   // ❌ What Gemini gave (partial):
   const button = page.locator('role=button and name=/Book/')
   
   // ✅ What you need (full test):
   test('should click book button', async ({ page }) => {
     const button = page.locator('role=button and name=/Book/')
     await button.click()
     expect(...).toBe(...)
   })
   ```

---

## Best Practices

### 1. **Use in Pre-Commit Hooks**

```bash
#!/bin/sh
# .git/hooks/pre-commit

cd e2e

# Run tests
npm test || {
  echo "Tests failed. Analyzing with Gemini..."
  node gemini-healer.js --verbose
  
  echo "Review healer report at: reports/healer/healer-report-*.html"
  exit 1
}
```

### 2. **CI/CD Integration (Analysis-Only)**

```yaml
# .github/workflows/e2e-heal.yml
- name: Heal Test Failures (Report Only)
  if: always()
  env:
    GEMINI_API_KEY_TEST: ${{ secrets.GEMINI_API_KEY }}
  run: |
    cd e2e
    node gemini-healer.js --verbose
    # NO --auto-fix in CI!
```

### 3. **Manual Review Before Auto-Fix**

```bash
# Step 1: Analyze failures
node gemini-healer.js --verbose

# Step 2: Review HTML report
open reports/healer/healer-report-*.html
# Check: Confidence scores, Suggested changes, Risks

# Step 3: Apply fixes manually (safer)
node gemini-healer.js --auto-fix

# Step 4: Re-run tests
npm test
```

### 4. **Error Drift Detection**

Monitor healing logs for patterns:

```bash
# Extract frequent error types
cat reports/results/healing-logs.json |
  jq '.events | map(.eventType) | group_by(.) | map({type: .[0], count: length})'

# Example output:
# [
#   { "type": "element_healed", "count": 15 },
#   { "type": "locator_failure", "count": 12 },
#   { "type": "selector_updated", "count": 10 }
# ]
```

### 5. **Rate Limit Management**

```bash
# For large test suites, spread across multiple runs:

# Run 1: Heal tests A-F
node gemini-healer.js tests/A*.spec.ts tests/B*.spec.ts tests/C*.spec.ts

# Wait 1 minute

# Run 2: Heal tests G-Z
node gemini-healer.js tests/D*.spec.ts tests/E*.spec.ts tests/F*.spec.ts
```

### 6. **Backup Strategy**

```bash
# Keep local backup of healer backups
cp -r reports/audit/.healer-backups ./backups/$(date +%Y%m%d)

# List recent backups for a file
ls -lt reports/audit/.healer-backups/MovieDetails* | head -5
```

### 7. **Confidence Threshold Filtering**

```bash
# Only review fixes with high confidence
cat reports/results/healing-logs.json |
  jq '.events[] |
    select(.details.confidence >= 80) |
    {element: .elementName, confidence: .details.confidence}'
```

### 8. **Test Code Organization**

```typescript
// ✅ GOOD: Small, focused tests
test('should load movie list', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=TicketsVenue')).toBeVisible()
})

test('should navigate to movie details', async ({ page }) => {
  await page.goto('/')
  await page.locator('role=button and name=/First Movie/i').click()
  await expect(page).toHaveURL(/\/movie\/\d+/)
})

// ❌ AVOID: Large, complex tests
test('entire booking flow', async ({ page }) => {
  // 300+ lines of setup, navigation, assertions
  // Hard to diagnose failures
  // Harder for Gemini to suggest fixes
})
```

### 9. **Explicit Waits**

```typescript
// ✅ GOOD: Explicit waits help Gemini understand intent
await page.waitForLoadState('networkidle')
await expect(page.locator('text=Loading')).not.toBeVisible()
const button = await page.locator('role=button and name=/Book/i')
await button.click()

// ❌ AVOID: Silent waits that fail
const button = page.locator('role=button and name=/Book/i')  // May not exist yet
await button.click()  // Fails unpredictably
```

### 10. **Error Message Clarity**

```typescript
// ✅ GOOD: Clear, specific expectations
await expect(page.locator('role=heading')).toHaveText('Booking Confirmed')
await expect(page).toHaveURL(/\/payment\?orderId=\d+/)

// ❌ AVOID: Vague expectations
const text = await page.textContent('.container')
expect(text).toBeTruthy()  // What specifically should be true?
```

---

## Summary Table

| Aspect | Coverage | Status |
|--------|----------|--------|
| **Core Mechanism** | Classification → Gemini → Fix → Verify | ✅ Complete |
| **Error Handling** | Infrastructure vs Fixable error detection | ✅ Complete |
| **Security** | Input validation, code sanitization, audit trail | ✅ Complete |
| **Reliability** | Backup/rollback, atomic writes, retry logic | ✅ Complete |
| **Performance** | Rate limiting, timeout handling, caching | ✅ Complete |
| **Observability** | JSON logs, HTML reports, audit trails | ✅ Complete |
| **Integration** | Playwright, GitHub Actions, CI/CD | ✅ Complete |

---

## Resources

- **Gemini API Docs**: https://ai.google.dev/docs
- **Playwright Docs**: https://playwright.dev/
- **Test Reports**: `reports/healer/healer-report-*.html`
- **Audit Trail**: `reports/audit/.healer-audit.log`
- **Configuration**: `e2e/.env`

**Last Updated**: March 15, 2026  
**Maintained By**: QA Engineering  
**Version**: 2.0
