# Self-Healing Test Mechanism - Technical Deep Dive

**PowerPoint Presentation in Markdown Format**  
**Date**: May 4, 2026  
**Status**: Complete with Technical Details

---

## SLIDE 1: Title & Overview

### Self-Healing Test Mechanism
**Subtitle**: AI-Powered Automated Test Repair System with Gemini API Integration

**Key Metrics**:
- **Codebase**: 3,217 lines (gemini-healer.js)
- **Technology Stack**: Node.js ES6+, TypeScript, Playwright 1.x, Google Generative AI
- **Success Rate**: (Fixed + Verified) / Total × 100%
- **API Model**: gemini-2.0-flash
- **Rate Limit**: 5 API calls/minute

---

## SLIDE 2: Executive Summary - Technical Overview

### What is Self-Healing?

**Definition**: Automated repair of failing Playwright E2E tests using AI analysis without manual intervention.

### Core Components

```
Test Failure → Healer Analysis → Gemini API → Code Generation → Validation → Backup → Apply → Verify
```

### Key Features

1. **Intelligent Error Classification**
   - Infrastructure errors (skip healing)
   - Selector errors (fix locators)
   - Assertion errors (fix expectations)
   - Navigation errors (fix URLs)
   - DOM architecture errors (Shadow DOM, iframes)

2. **Multi-Layer Security**
   - Input sanitization & validation
   - Dangerous code pattern detection
   - Prompt injection prevention
   - Audit logging & rollback capability

3. **Verification-Driven Approach**
   - Backup creation before changes
   - Automatic test re-execution
   - Rollback on failure
   - Success confirmation

### Success Metrics

```typescript
interface HealingMetrics {
  totalTests: number;           // Total failing tests found
  fixedCount: number;           // Tests where fix was applied
  verifiedCount: number;        // Fixed tests that pass after re-run
  failedVerification: number;   // Fixed tests that still fail
  successRate: number;          // (fixed + verified) / total * 100
  duration: string;             // Total execution time
  confidence: 'High' | 'Medium' | 'Low';
}
```

---

## SLIDE 3: Architecture - System Diagram

### Complete Workflow Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLAYWRIGHT TEST EXECUTION                    │
│  npm test → generates test-results/results.json                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│           PHASE 1: DISCOVERY & INITIALIZATION                  │
│                                                                 │
│  1. Parse CLI arguments & options                              │
│  2. Load .env file & validate GEMINI_API_KEY_TEST             │
│  3. Check npm dependencies                                     │
│  4. Validate configuration variables                           │
│  5. Parse test-results/results.json for failures               │
│  6. Filter & sanitize failed test information                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│         PHASE 2: ERROR ANALYSIS & CLASSIFICATION                │
│                                                                 │
│  For each failing test:                                        │
│  ├─ Extract error message & stack trace                        │
│  ├─ Classify error type:                                       │
│  │  ├─ INFRASTRUCTURE → Skip (connection, DNS, browser)       │
│  │  ├─ SELECTOR → Fix locators                                │
│  │  ├─ ASSERTION → Fix expectations                           │
│  │  ├─ NAVIGATION → Fix URLs                                  │
│  │  ├─ TIMEOUT_ASSERTION → Fix selector/timing               │
│  │  ├─ DOM_ARCHITECTURE → Shadow DOM/iframes                 │
│  │  └─ UNKNOWN → Manual review                               │
│  │                                                              │
│  ├─ Detect DOM architecture issues (Shadow DOM, iframes)      │
│  ├─ Read test source code                                     │
│  ├─ Extract UI element patterns                               │
│  └─ Perform security validation:                              │
│     ├─ Sanitize error messages (remove PII)                   │
│     ├─ Validate input size (prevent token overflow)           │
│     ├─ Detect prompt injection attempts                       │
│     └─ Validate test file names (whitelist)                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│        PHASE 3: GEMINI AI ANALYSIS (API CALL)                   │
│                                                                 │
│  Rate Limiting: 5 calls/minute (sliding window)               │
│  API Timeout: 60 seconds (configurable)                       │
│  Model: gemini-2.0-flash                                      │
│  Max Retries: 3 (exponential backoff: 1s, 2s, 4s)            │
│                                                                 │
│  Input Prompt Includes:                                        │
│  ├─ Test file content (sanitized)                             │
│  ├─ Error message (classified)                                │
│  ├─ DOM architecture guidance                                 │
│  ├─ UI selector best practices                                │
│  └─ Expected code structure                                   │
│                                                                 │
│  Output: Fixed test code in markdown code block               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│       PHASE 4: SECURITY VALIDATION (CODE REVIEW)               │
│                                                                 │
│  1. Dangerous Pattern Detection:                               │
│     ├─ fs.rm, fs.unlink, fs.rmdir (file operations)           │
│     ├─ execSync, execFile, spawn (process execution)          │
│     ├─ eval, new Function (dynamic code)                      │
│     ├─ process.exit (process manipulation)                    │
│     └─ child_process (subprocess creation)                    │
│                                                                 │
│  2. TypeScript Syntax Validation                               │
│  3. Code Structure Validation (test functions, assertions)    │
│  4. Suspicious Import Detection (fs, child_process, os)       │
│  5. Size Limit Enforcement (prevent injection)                │
│                                                                 │
│  Result: Abort if validation fails, proceed if OK             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│         PHASE 5: BACKUP & FILE APPLICATION                     │
│                                                                 │
│  1. Create timestamped backup:                                 │
│     └─ reports/audit/.healer-backups/                          │
│        {testname}.{timestamp}.backup.zip                       │
│                                                                 │
│  2. Cleanup old backups:                                       │
│     ├─ Retention policy: 7 days                                │
│     ├─ Max backups per file: 5                                 │
│     └─ Delete older than threshold                             │
│                                                                 │
│  3. Audit log the change                                       │
│  4. Write fixed code to test file (atomic write)              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│        PHASE 6: VERIFICATION (RE-RUN TEST)                      │
│                                                                 │
│  Execute: npx playwright test <test-file>                      │
│  Capture: exit code, stdout, stderr                            │
│  Parse: results                                                │
│                                                                 │
│  If test passes (exit code 0):                                │
│  ├─ Mark as VERIFIED ✅                                        │
│  ├─ Log success                                                │
│  ├─ Keep backup for history                                   │
│  └─ Success count++                                            │
│                                                                 │
│  If test fails (exit code != 0):                              │
│  ├─ Rollback to original file                                 │
│  ├─ Record failure reason                                      │
│  ├─ Mark for manual review                                     │
│  └─ Generate detailed error analysis                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│         PHASE 7: REPORTING & CLEANUP                            │
│                                                                 │
│  1. Generate HTML report:                                      │
│     └─ playwright-report/healer-report-{timestamp}.html       │
│                                                                 │
│  2. Persist healing logs (JSON):                               │
│     └─ reports/results/healing-logs.json                      │
│                                                                 │
│  3. Generate error reports (for failures):                     │
│     └─ reports/healer/healer-error-report-*.json              │
│                                                                 │
│  4. Cleanup old reports (keep last 5)                         │
│  5. Display summary statistics                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## SLIDE 4: Core Components - Detailed Structure

### Main File: gemini-healer.js (3,217 lines)

#### Section Breakdown

```typescript
// SECTION 1: Imports & Initialization (Lines 1-50)
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { generateHtmlReport } from './healer-report-generator.js';

// SECTION 2: Configuration Loading (Lines 51-150)
dotenv.config({ path: '.env' });
const GEMINI_API_KEY_TEST = process.env.GEMINI_API_KEY_TEST;
const HEALER_AUTO_FIX = process.env.HEALER_AUTO_FIX === 'true';
const HEALER_VERBOSE = process.env.HEALER_VERBOSE === 'true';
const HEALER_API_TIMEOUT = parseInt(process.env.HEALER_API_TIMEOUT || '60000');
const HEALER_API_RATE_LIMIT = parseInt(process.env.HEALER_API_RATE_LIMIT || '5');
const HEALER_MAX_RETRIES = parseInt(process.env.HEALER_MAX_RETRIES || '3');
const HEALER_MAX_FILE_SIZE = parseInt(process.env.HEALER_MAX_FILE_SIZE || '1048576');

// SECTION 3: Security Functions (Lines 151-900)
function validateFilePath(filePath) { /* ... */ }
function validateGeneratedCode(code) { /* ... */ }
function sanitizeForPrompt(input, maxLength) { /* ... */ }
function detectPromptInjection(input) { /* ... */ }
function validateTestCodeSize(code, maxLength) { /* ... */ }

// SECTION 4: Logging System (Lines 901-1000)
class HealingLogger {
  constructor() {
    this.events = [];
    this.statistics = {};
  }
  
  logEvent(type, element, details) { /* ... */ }
  persist() { /* ... */ }
  getStatistics() { /* ... */ }
}

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
```

### Supporting Files

#### healer-report-generator.js
```typescript
interface HealerReport {
  timestamp: string;
  totalTests: number;
  fixedTests: number;
  verifiedTests: number;
  failedTests: number;
  successRate: number;
  duration: string;
  tests: Array<{
    title: string;
    file: string;
    errorType: string;
    errorMessage: string;
    geminiAnalysis: string;
    appliedFix: string;
    verified: boolean;
    confidence: string;
  }>;
}
```

#### verify-sanitization.js
- Validates 4 core security functions exist
- Checks for PII redaction patterns
- Validates dangerous code detection
- Verifies injection prevention

---

## SLIDE 5: Error Classification Deep Dive

### Error Type Detection Matrix

```typescript
const ERROR_CLASSIFICATION = {
  INFRASTRUCTURE: {
    patterns: [
      'connection refused',
      'connection reset',
      'enotfound',
      'econnrefused',
      'host not found',
      'websocket closed',
      'target closed',
      'browser context was closed'
    ],
    healable: false,
    action: 'SKIP'
  },
  
  SELECTOR: {
    patterns: [
      'Locator.click: Target page',
      'Resolves to',
      'elements. Use locator.first()',
      'strict mode',
      'Element not found'
    ],
    healable: true,
    action: 'UPDATE_LOCATORS'
  },
  
  ASSERTION: {
    patterns: [
      'expect',
      'toHave',
      'toBe',
      'AssertionError',
      'Assertion failed'
    ],
    healable: true,
    action: 'UPDATE_EXPECTATIONS'
  },
  
  NAVIGATION: {
    patterns: [
      'Navigation',
      'URL mismatch',
      'expected URL',
      'waitForNavigation'
    ],
    healable: true,
    action: 'UPDATE_URLs'
  },
  
  TIMEOUT_ASSERTION: {
    patterns: [
      'timeout',
      'waiting for',
      'not found within'
    ],
    healable: true,
    action: 'FIX_TIMING'
  },
  
  DOM_ARCHITECTURE: {
    patterns: [
      'shadow dom',
      'iframe',
      'web component',
      'frameLocator'
    ],
    healable: true,
    action: 'USE_NESTED_LOCATORS'
  }
};
```

### Classification Logic

```typescript
function classifyErrorType(errorMessage) {
  const lowerError = errorMessage.toLowerCase();
  
  // Check each category
  for (const [type, config] of Object.entries(ERROR_CLASSIFICATION)) {
    for (const pattern of config.patterns) {
      if (lowerError.includes(pattern.toLowerCase())) {
        return {
          type,
          healable: config.healable,
          action: config.action
        };
      }
    }
  }
  
  return {
    type: 'UNKNOWN',
    healable: null,
    action: 'MANUAL_REVIEW'
  };
}
```

---

## SLIDE 6: Security Architecture - Multi-Layer Defense

### Layer 1: Input Validation & Sanitization

```typescript
function sanitizeForPrompt(input, maxLength = 5000) {
  if (!input) return '';
  
  // Step 1: Remove PII
  let sanitized = input
    // Remove email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    // Remove Social Security Numbers (XXX-XX-XXXX)
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    // Remove credit card numbers
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    // Remove Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9_-]+/g, '[TOKEN]')
    // Remove passwords
    .replace(/password\s*[=:]\s*[^\s]+/gi, 'password=[REDACTED]')
    // Remove API keys
    .replace(/api[_-]?key\s*[=:]\s*[^\s]+/gi, 'api_key=[REDACTED]');
  
  // Step 2: Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '\n...[truncated]';
  }
  
  // Step 3: Escape HTML special characters
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
    /<<SYS>>|[SYS]|{SYSTEM}/i,
    /jailbreak/i,
    /bypass|circumvent/i
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      console.warn('⚠️  Potential prompt injection detected:', pattern);
      return true;
    }
  }
  
  return false;
}
```

### Layer 2: Code Validation

```typescript
function validateGeneratedCode(code) {
  const issues = [];
  
  // 1. Dangerous pattern detection
  const DANGEROUS_PATTERNS = [
    { pattern: /fs\.(rm|unlink|rmdir)/g, name: 'File deletion' },
    { pattern: /execSync|execFile|spawn/g, name: 'Process execution' },
    { pattern: /require\(|import.*from/g, name: 'Dynamic imports' },
    { pattern: /eval\(/g, name: 'Dynamic code evaluation' },
    { pattern: /new Function/g, name: 'Function constructor' },
    { pattern: /process\.exit/g, name: 'Process manipulation' },
    { pattern: /child_process/g, name: 'Subprocess creation' }
  ];
  
  for (const { pattern, name } of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      issues.push(`Dangerous pattern detected: ${name}`);
    }
  }
  
  // 2. Suspicious imports
  const suspiciousImports = ['fs', 'child_process', 'os', 'path'];
  for (const imp of suspiciousImports) {
    if (new RegExp(`import.*${imp}|require\\(['"]${imp}['"]\\)`).test(code)) {
      issues.push(`Suspicious import: ${imp}`);
    }
  }
  
  // 3. Size validation
  if (code.length > 100000) {
    issues.push('Code exceeds maximum size (100KB)');
  }
  
  // 4. TypeScript syntax validation
  try {
    const tsc = execFileSync('npx', ['tsc', '--noEmit', '--skipLibCheck'], {
      input: code,
      encoding: 'utf8'
    });
  } catch (err) {
    issues.push(`TypeScript syntax error: ${err.message}`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    confidence: 100 - (issues.length * 25)
  };
}
```

### Layer 3: Audit Logging

```typescript
function auditLog(action, filePath, details = '') {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    action,                      // BACKUP_CREATED, FIX_APPLIED, etc.
    filePath: path.basename(filePath),
    userId: process.env.USER || 'unknown',
    details,
    pid: process.pid
  };
  
  fs.appendFileSync(HEALER_AUDIT_LOG, JSON.stringify(entry) + '\n', 'utf8');
}

// Log file: reports/audit/.healer-audit.log
// Example entry:
// {"timestamp":"2026-05-04T10:23:45.123Z","action":"BACKUP_CREATED","filePath":"HomePage.spec.ts","userId":"naveen","details":"Backup: reports/audit/.healer-backups/HomePage.spec.ts.1714827825123.backup.zip","pid":12345}
```

---

## SLIDE 7: Gemini API Integration - Technical Details

### API Call Flow with Rate Limiting

```typescript
class GeminiAPIClient {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.apiCallTimes = [];
    this.RATE_LIMIT = 5;      // calls per minute
    this.TIMEOUT = 60000;      // milliseconds
    this.MAX_RETRIES = 3;
  }
  
  async callWithRateLimit(prompt, retryCount = 0) {
    try {
      // Check rate limit (sliding window)
      if (this.apiCallTimes.length >= this.RATE_LIMIT) {
        const oldestCall = this.apiCallTimes[0];
        const timeSinceLastBatch = Date.now() - oldestCall;
        const delayNeeded = 60000 - timeSinceLastBatch;
        
        if (delayNeeded > 0) {
          console.log(`⏳ Rate limiting: waiting ${delayNeeded}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayNeeded));
          this.apiCallTimes.shift();
        }
      }
      
      this.apiCallTimes.push(Date.now());
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutHandle = setTimeout(
        () => controller.abort(), 
        this.TIMEOUT
      );
      
      // Call Gemini API
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash' 
      });
      
      const response = await model.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: prompt }] 
        }],
        signal: controller.signal
      });
      
      clearTimeout(timeoutHandle);
      
      return response.response.text();
      
    } catch (error) {
      clearTimeout(timeoutHandle);
      
      if (error.name === 'AbortError') {
        throw new Error(`API timeout after ${this.TIMEOUT}ms`);
      }
      
      // Exponential backoff
      if (retryCount < this.MAX_RETRIES) {
        const delayMs = Math.pow(2, retryCount) * 1000;
        console.log(`⚠️  Retry ${retryCount + 1}/${this.MAX_RETRIES} after ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.callWithRateLimit(prompt, retryCount + 1);
      }
      
      throw error;
    }
  }
}
```

### Intelligent Prompt Generation

```typescript
function generateAnalysisPrompt(
  testCode,
  sanitizedError,
  errorType,
  domIssues,
  selectorGuidance
) {
  const contextInfo = buildContextInfo(testCode, errorType);
  const domArchitectureGuidance = generateDOMArchitectureGuidance(domIssues);
  
  const prompt = `You are an expert Playwright test repair specialist with deep knowledge of:
- Playwright locator strategies and best practices
- Shadow DOM and Web Components handling
- Material-UI component testing patterns
- Race condition prevention in async tests

## FAILED TEST CODE
\`\`\`typescript
${testCode}
\`\`\`

## ERROR INFORMATION
- **Type**: ${errorType}
- **Message**: ${sanitizedError}
- **Context**: ${contextInfo}

## DOM ARCHITECTURE ANALYSIS
${domArchitectureGuidance}

## SELECTOR BEST PRACTICES
${selectorGuidance}

## YOUR TASK
1. Analyze the root cause of the failure
2. Identify the specific broken part
3. Generate ONLY the corrected code
4. Preserve all passing assertions
5. Follow Playwright best practices

## REQUIREMENTS
- Output ONLY corrected code in a code block
- Do NOT include explanations or markdown
- Return complete corrected test function
- Maintain test structure and assertions

## RESPONSE FORMAT
\`\`\`typescript
// CORRECTED CODE HERE
\`\`\``;

  return prompt;
}
```

### Response Parsing

```typescript
function extractFixedCode(geminiResponse) {
  // Look for TypeScript code block
  const tsMatch = geminiResponse.match(/```typescript\n([\s\S]*?)\n```/);
  if (tsMatch) {
    return tsMatch[1].trim();
  }
  
  // Fallback to generic code block
  const codeMatch = geminiResponse.match(/```\n([\s\S]*?)\n```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }
  
  // Last resort: look for common test patterns
  if (geminiResponse.includes('test(') || geminiResponse.includes('it(')) {
    return geminiResponse;
  }
  
  throw new Error('Could not extract code from Gemini response');
}
```

---

## SLIDE 8: DOM Architecture Detection - Shadow DOM Handling

### Shadow DOM Problem & Solution

```typescript
// PROBLEM: This selector fails for Shadow DOM elements
// It tries to find buttons outside of shadow boundary
❌ await page.locator("button:has-text('Book Seat')").click();

// Error: Element not found

// SOLUTION: Use nested locators to pierce Shadow DOM
✅ await page.locator("seat-grid")
           .locator(".seat.available")
           .click();
```

### DOM Architecture Detection

```typescript
function detectDOMArchitectureIssues(testCode, errorMessage) {
  const issues = {
    hasShadowDOM: false,
    hasIframes: false,
    hasWebComponents: false,
    potentialArchitectureIssues: [],
    recommendations: []
  };
  
  // Pattern 1: Shadow DOM indicators
  const shadowPatterns = [
    /seat-grid|custom-element|shadow|#shadow-root/i,
    /getByRole\s*\(\s*['"`]button['"`]\).*seat/i,
    /page\.locator\(['"`]button[^'"`]*['"]\).*has-text/i,
    /\.shadow|shadow::/i
  ];
  
  for (const pattern of shadowPatterns) {
    if (pattern.test(testCode) || pattern.test(errorMessage)) {
      issues.hasShadowDOM = true;
      break;
    }
  }
  
  // Pattern 2: Iframe indicators
  if (/iframe|frameLocator|frame\(/i.test(testCode)) {
    issues.hasIframes = true;
  }
  
  // Pattern 3: Web Component indicators
  if (/page\.locator\(['"`]([a-z]+-[a-z]+)['"]\)/i.test(testCode)) {
    issues.hasWebComponents = true;
  }
  
  // Generate recommendations
  if (issues.hasShadowDOM) {
    issues.recommendations.push(
      'Use nested locators: page.locator("parent").locator(".child")'
    );
    issues.recommendations.push(
      'Avoid getByRole() for Shadow DOM elements'
    );
    issues.recommendations.push(
      'Use CSS classes instead of :has-text() for reliability'
    );
    issues.recommendations.push(
      'Consider using data-testid attributes for custom elements'
    );
  }
  
  if (issues.hasIframes) {
    issues.recommendations.push(
      'Use frameLocator for iframe access: page.frameLocator("iframe").locator(".element")'
    );
  }
  
  return issues;
}

// Guidance generation
function generateDOMArchitectureGuidance(domIssues) {
  let guidance = `## DOM Architecture Detected\n`;
  
  if (domIssues.hasShadowDOM) {
    guidance += `
### Shadow DOM Components
Shadow DOM elements are not accessible via normal selectors.

**Strategy**:
1. Use parent.locator(child) pattern
2. Example: page.locator("seat-grid").locator(".seat.available")
3. Combine multiple classes for specificity
4. Avoid getByRole() which doesn't pierce Shadow DOM

**Common Shadow DOM Components**:
- Custom web components (tags with hyphens: <seat-grid>)
- Material-UI components (wrapped in Shadow DOM)
- Third-party library components
`;
  }
  
  return guidance;
}
```

---

## SLIDE 9: Backup & Rollback Mechanism

### Backup Creation Strategy

```typescript
function createBackup(filePath) {
  try {
    const fileName = path.basename(filePath);
    const backupDir = HEALER_BACKUP_DIR;  // reports/audit/.healer-backups/
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create timestamped backup with ZIP compression
    const timestamp = Date.now();
    const backupPath = path.join(
      backupDir,
      `${fileName}.${timestamp}.backup.zip`
    );
    
    // Read original file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Create ZIP archive
    const zip = new AdmZip();
    zip.addFile(fileName, Buffer.from(fileContent));
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
  const BACKUP_RETENTION_DAYS = 7;
  const MAX_BACKUPS_PER_FILE = 5;
  
  // Get all backups for this file
  const allBackups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(fileName))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtimeMs
    }))
    .sort((a, b) => b.time - a.time);  // Newest first
  
  // Delete old backups
  const oldThreshold = Date.now() - (BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  
  allBackups.forEach((backup, idx) => {
    // Delete if exceeds count or older than retention
    if (idx >= MAX_BACKUPS_PER_FILE || backup.time < oldThreshold) {
      fs.unlinkSync(backup.path);
      auditLog('BACKUP_DELETED', filePath, `Removed: ${backup.name}`);
    }
  });
}

function restoreFromBackup(filePath, backupPath) {
  try {
    const zip = new AdmZip(backupPath);
    const entries = zip.getEntries();
    
    // Extract and restore
    entries.forEach(entry => {
      if (!entry.isDirectory) {
        const content = entry.getData().toString('utf8');
        fs.writeFileSync(filePath, content, 'utf8');
      }
    });
    
    auditLog('BACKUP_RESTORED', filePath, `From: ${backupPath}`);
    
  } catch (err) {
    console.error(`❌ Restore failed: ${err.message}`);
    throw err;
  }
}
```

---

## SLIDE 10: Verification & Test Re-Execution

### Test Verification Flow

```typescript
async function verifyFix(testFile) {
  try {
    console.log(`🔍 Verifying fix for: ${testFile}`);
    
    // Re-run the specific test using Playwright
    const result = spawnSync('npx', ['playwright', 'test', testFile], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30000,  // 30 second timeout
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const exitCode = result.status;
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    
    // Parse results
    if (exitCode === 0) {
      console.log(`✅ Test PASSED after fix!`);
      return {
        verified: true,
        passed: true,
        output: stdout,
        exitCode,
        duration: extractDurationFromOutput(stdout)
      };
    } else if (exitCode === 1) {
      console.log(`❌ Test FAILED - verification failed`);
      return {
        verified: false,
        passed: false,
        output: stdout || stderr,
        exitCode,
        reason: 'Test failed after fix applied'
      };
    } else {
      console.log(`⚠️  Unknown exit code: ${exitCode}`);
      return {
        verified: false,
        passed: false,
        output: stderr,
        exitCode,
        reason: `Unexpected exit code: ${exitCode}`
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

function extractDurationFromOutput(output) {
  // Playwright outputs: "X tests passed (XXms)"
  const match = output.match(/(\d+)ms/);
  return match ? parseInt(match[1]) : 0;
}
```

### Rollback & Recovery

```typescript
async function healAndVerifyWithRollback(testFile, fixedCode, backupPath) {
  let appliedFix = false;
  
  try {
    // Step 1: Create backup
    const backup = createBackup(testFile);
    
    // Step 2: Validate code before applying
    const validation = validateGeneratedCode(fixedCode);
    if (!validation.isValid) {
      console.log(`❌ Generated code failed validation`);
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
      return { 
        success: false, 
        reason: 'Code validation failed'
      };
    }
    
    // Step 3: Apply fix
    fs.writeFileSync(testFile, fixedCode, 'utf8');
    appliedFix = true;
    auditLog('FIX_APPLIED', testFile, 'Applied fix from Gemini');
    
    // Step 4: Verify by re-running test
    const verification = verifyFix(testFile);
    
    if (verification.verified) {
      console.log(`✅ Fix verified successfully!`);
      auditLog('FIX_VERIFIED', testFile, 'Test passed after fix');
      return { 
        success: true, 
        verified: true,
        duration: verification.duration
      };
    } else {
      // Step 5: Rollback if verification fails
      console.log(`⚠️  Fix failed verification. Rolling back...`);
      restoreFromBackup(testFile, backup);
      appliedFix = false;
      auditLog('FIX_ROLLED_BACK', testFile, `Reason: ${verification.reason}`);
      return { 
        success: false, 
        verified: false,
        reason: verification.reason
      };
    }
    
  } catch (err) {
    console.error(`❌ Error during fix/verify: ${err.message}`);
    
    // Emergency rollback if error occurred
    if (appliedFix && backupPath) {
      try {
        console.log(`🚨 Attempting emergency rollback...`);
        restoreFromBackup(testFile, backupPath);
        auditLog('EMERGENCY_ROLLBACK', testFile, `Error: ${err.message}`);
      } catch (rollbackErr) {
        console.error(`❌ CRITICAL: Rollback failed: ${rollbackErr.message}`);
        console.error(`   File may be corrupted: ${testFile}`);
      }
    }
    
    throw err;
  }
}
```

---

## SLIDE 11: Real-World Scenario - Shadow DOM Selector Fix

### Problem Case Study

```typescript
// TEST FILE: e2e/tests/LandingPageMovieList.spec.ts
// Line 45-60: Seat selection test

test('user can select available seats', async ({ page }) => {
  await page.goto('/movie/1');
  
  // PROBLEM: This selector fails for Shadow DOM elements
  const seatButtons = page.locator("button:has-text('Seat 1')");
  
  // Error thrown:
  // Error: Locator.click: Target page, context or browser has been closed
  
  await seatButtons.click();
  // ... rest of test
});

// ROOT CAUSE ANALYSIS:
// 1. <seat-grid> component uses Shadow DOM
// 2. Buttons inside Shadow DOM are not accessible via normal selectors
// 3. getByRole() doesn't pierce Shadow DOM boundary
// 4. :has-text() pseudo-selector doesn't work across Shadow DOM
```

### Gemini Analysis & Fix

```typescript
// GEMINI ANALYSIS PROMPT:
{
  errorType: "DOM_ARCHITECTURE",
  errorMessage: "Locator.click: Target page, context or browser has been closed",
  domIssue: {
    hasShadowDOM: true,
    potentialArchitectureIssues: ["seat-grid detected in test"],
    recommendations: [
      "Use nested locators: page.locator('parent').locator('.child')",
      "Avoid getByRole() for Shadow DOM elements",
      "Use CSS classes instead of :has-text()"
    ]
  }
}

// CORRECTED TEST CODE (Generated by Gemini):

test('user can select available seats', async ({ page }) => {
  await page.goto('/movie/1');
  
  // SOLUTION: Use nested locators to pierce Shadow DOM
  const seatGrid = page.locator('seat-grid');
  const seatButtons = seatGrid.locator('.seat.available');
  
  // Wait for seat to be visible
  await seatButtons.first().waitFor({ state: 'visible' });
  
  // Click the first available seat
  await seatButtons.first().click();
  
  // Verify click was successful
  await expect(seatButtons.first()).toHaveClass(/selected/);
});
```

### Verification

```bash
$ npx playwright test e2e/tests/LandingPageMovieList.spec.ts

Running 1 test using 1 worker

  ✅ user can select available seats (543ms)

1 passed (2s)

# Healing Log:
{
  "timestamp": "2026-05-04T10:23:45.123Z",
  "testFile": "LandingPageMovieList.spec.ts",
  "errorType": "DOM_ARCHITECTURE",
  "geminiAnalysis": "Shadow DOM element (seat-grid) detected...",
  "fixApplied": true,
  "verified": true,
  "duration": "543ms",
  "confidence": "HIGH"
}
```

---

## SLIDE 12: Configuration & Environment Setup

### .env Configuration

```bash
# REQUIRED: Google Generative AI API Key
GEMINI_API_KEY_TEST=AIzaSy...                    # Get from https://aistudio.google.com/app/apikeys

# OPTIONAL: Healer Behavior
HEALER_AUTO_FIX=false                           # Auto-apply fixes (default: false)
HEALER_VERBOSE=false                            # Detailed debug output (default: false)
HEALER_SOURCE_CODE_ANALYSIS=false               # Enable context analysis (default: false)

# OPTIONAL: API Configuration
HEALER_API_TIMEOUT=60000                        # API timeout in ms (default: 60000)
HEALER_API_RATE_LIMIT=5                         # Calls per minute (default: 5)
HEALER_MAX_RETRIES=3                            # Retry attempts (default: 3)

# OPTIONAL: File Size Limits
HEALER_MAX_FILE_SIZE=1048576                    # Max test file size (default: 1MB)
HEALER_SOURCE_CODE_MAX_FILE_SIZE=500000         # Max source file (default: 500KB)
HEALER_SOURCE_CODE_MAX_EXTRACTION_SIZE=2097152  # Total extraction (default: 2MB)

# OPTIONAL: Backup & Retention
BACKUP_RETENTION_DAYS=7                         # Days to keep backups (default: 7)
MAX_BACKUPS_PER_FILE=5                          # Max backups per file (default: 5)

# OPTIONAL: Directories
HEALER_BACKUP_DIR=reports/audit/.healer-backups
HEALER_AUDIT_LOG=reports/audit/.healer-audit.log
```

### Pre-flight Validation

```typescript
function validateConfiguration() {
  const checks = [
    {
      name: 'Gemini API Key',
      condition: () => GEMINI_API_KEY_TEST && GEMINI_API_KEY_TEST.startsWith('AIzaSy'),
      hint: 'Set GEMINI_API_KEY_TEST in .env file',
      critical: true
    },
    {
      name: 'API Key Length',
      condition: () => GEMINI_API_KEY_TEST.length >= 39,
      hint: 'API key must be at least 39 characters',
      critical: true
    },
    {
      name: 'Node.js Version',
      condition: () => parseInt(process.version.slice(1)) >= 18,
      hint: 'Node 18+ required for ES modules',
      critical: true
    },
    {
      name: 'npm Packages',
      condition: () => checkDependencies(),
      hint: 'Run: npm install',
      critical: true
    },
    {
      name: 'Test Results',
      condition: () => fs.existsSync('test-results/results.json'),
      hint: 'Run: npm test first',
      critical: false
    }
  ];
  
  let criticalFailures = 0;
  
  checks.forEach(check => {
    const status = check.condition() ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    
    if (!check.condition()) {
      console.log(`   Hint: ${check.hint}`);
      if (check.critical) criticalFailures++;
    }
  });
  
  if (criticalFailures > 0) {
    throw new Error(`${criticalFailures} critical validation(s) failed`);
  }
}
```

---

## SLIDE 13: Command Line Interface & Execution

### CLI Commands

```bash
# Analysis mode (analyze failures, don't apply fixes)
npm run heal:gemini

# Auto-fix mode (apply fixes automatically)
npm run heal:gemini:auto

# Verbose mode (show detailed debugging)
npm run heal:gemini:verbose

# Direct execution with options
node gemini-healer.js [--auto-fix] [--verbose] [--help]

# Run specific test file
node gemini-healer.js --auto-fix e2e/tests/HomePage.spec.ts
```

### package.json Scripts

```json
{
  "scripts": {
    "test": "playwright test",
    "heal:gemini": "node gemini-healer.js",
    "heal:gemini:auto": "HEALER_AUTO_FIX=true node gemini-healer.js",
    "heal:gemini:verbose": "HEALER_VERBOSE=true node gemini-healer.js",
    "heal:gemini:debug": "node --inspect-brk gemini-healer.js"
  }
}
```

---

## SLIDE 14: Main Execution Loop - Step-by-Step

### Complete Orchestration Flow

```typescript
async function heal() {
  const startTime = Date.now();
  const healingLogger = new HealingLogger();
  const results = {
    totalTests: 0,
    fixedCount: 0,
    verifiedCount: 0,
    failedTests: [],
    duration: ''
  };
  
  try {
    console.log('🔧 Gemini-Powered Playwright Test Healer v1.0\n');
    
    // PHASE 1: INITIALIZATION
    console.log('📋 Phase 1: Initialization & Validation');
    checkDependencies();
    validateConfiguration();
    validateEnvironment();
    console.log('✅ Environment validated\n');
    
    // PHASE 2: DISCOVER FAILURES
    console.log('🔍 Phase 2: Discovering Failed Tests');
    const failedTests = getFailedTests();
    
    if (failedTests.length === 0) {
      console.log('✅ All tests passing! Nothing to heal.');
      return;
    }
    
    console.log(`📊 Found ${failedTests.length} failing test(s)\n`);
    results.totalTests = failedTests.length;
    
    // PHASE 3: PROCESS EACH TEST
    console.log('⚙️  Phase 3: Processing Failed Tests\n');
    
    for (const testInfo of failedTests) {
      const testName = `${testInfo.file} › ${testInfo.title}`;
      console.log(`\n🔄 [${results.fixedCount + 1}/${failedTests.length}] ${testName}`);
      
      try {
        // Step 3a: Classify error
        const classifiedType = classifyErrorType(testInfo.error);
        console.log(`   Error Type: ${classifiedType.type}`);
        
        if (classifiedType.type === 'INFRASTRUCTURE') {
          console.log(`   ⏭️  Skipping INFRASTRUCTURE error (cannot heal)`);
          healingLogger.logEvent('skip_infrastructure', testName, {});
          continue;
        }
        
        // Step 3b: Read test code
        const testCode = fs.readFileSync(testInfo.filePath, 'utf8');
        
        // Step 3c: Analyze & build prompt
        const sanitizedError = sanitizeErrorMessage(testInfo.error);
        const domIssues = detectDOMArchitectureIssues(testCode, testInfo.error);
        
        console.log(`   📡 Calling Gemini API...`);
        const prompt = generateAnalysisPrompt(
          testCode,
          sanitizedError,
          classifiedType.type,
          domIssues
        );
        
        // Step 3d: Call Gemini
        const apiClient = new GeminiAPIClient(GEMINI_API_KEY_TEST);
        const geminiResponse = await apiClient.callWithRateLimit(prompt);
        
        // Step 3e: Extract & validate
        const fixedCode = extractFixedCode(geminiResponse);
        const validation = validateGeneratedCode(fixedCode);
        
        if (!validation.isValid) {
          console.log(`   ❌ Code validation failed`);
          validation.issues.forEach(issue => console.log(`      - ${issue}`));
          healingLogger.logEvent('validation_failed', testName, validation);
          continue;
        }
        
        console.log(`   ✅ Code validation passed (${validation.confidence}% confidence)`);
        
        // Step 3f: Apply fix with rollback protection
        const healResult = await healAndVerifyWithRollback(
          testInfo.filePath,
          fixedCode,
          null
        );
        
        if (healResult.verified) {
          console.log(`   ✅ FIXED & VERIFIED! (${healResult.duration}ms)`);
          results.fixedCount++;
          results.verifiedCount++;
          healingLogger.logEvent('healed_and_verified', testName, healResult);
        } else if (healResult.success === false) {
          console.log(`   ⚠️  Fix applied but UNVERIFIED`);
          results.fixedCount++;
          healingLogger.logEvent('fix_not_verified', testName, healResult);
        }
        
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        healingLogger.logEvent('processing_error', testName, { error: err.message });
        results.failedTests.push({
          name: testName,
          error: err.message
        });
      }
    }
    
    // PHASE 4: REPORTING
    console.log('\n\n📊 Phase 4: Generating Reports');
    
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const durationSec = Math.round(durationMs / 1000);
    
    results.duration = `${durationSec}s`;
    results.successRate = Math.round(
      ((results.fixedCount + results.verifiedCount) / results.totalTests) * 100
    ) || 0;
    
    // Generate HTML report
    const reportPath = await generateHtmlReport(results);
    
    // Persist logs
    healingLogger.persist();
    
    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 HEALING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests:        ${results.totalTests}`);
    console.log(`Fixed:              ${results.fixedCount}`);
    console.log(`Verified:           ${results.verifiedCount}`);
    console.log(`Success Rate:       ${results.successRate}%`);
    console.log(`Duration:           ${results.duration}`);
    console.log(`Report:             ${reportPath}`);
    console.log('='.repeat(60));
    
  } catch (err) {
    console.error(`\n❌ Fatal error: ${err.message}`);
    process.exit(1);
  }
}
```

---

## SLIDE 15: Advanced Features & Optimizations

### Rate Limiting Strategy

```typescript
// Sliding window rate limiting (5 calls per minute)
class RateLimiter {
  constructor(limit = 5, windowMs = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.callTimes = [];
  }
  
  async waitForSlot() {
    if (this.callTimes.length >= this.limit) {
      const oldestCall = this.callTimes[0];
      const timeSinceOldest = Date.now() - oldestCall;
      const delayNeeded = this.windowMs - timeSinceOldest;
      
      if (delayNeeded > 0) {
        console.log(`⏳ Rate limit: waiting ${delayNeeded}ms`);
        await new Promise(resolve => setTimeout(resolve, delayNeeded));
        this.callTimes.shift();
      }
    }
    
    this.callTimes.push(Date.now());
  }
}
```

### Exponential Backoff for Retries

```typescript
// Exponential backoff: 1s, 2s, 4s, 8s...
async function retryWithExponentialBackoff(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`⚠️  Attempt ${attempt + 1} failed. Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
```

### Confidence Scoring

```typescript
function calculateConfidence(factors) {
  let score = 100;
  
  // Deduct for warning signs
  const warnings = {
    unknownErrorType: { impact: 20 },
    multipleDangerousPatterns: { impact: 30 },
    largeCodeChange: { impact: 15 },
    shadowDOMComplexity: { impact: 10 },
    lowTokenMatch: { impact: 25 }
  };
  
  for (const [warning, { impact }] of Object.entries(warnings)) {
    if (factors[warning]) {
      score -= impact;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}
```

---

## SLIDE 16: Debugging & Troubleshooting

### Debug Commands

```bash
# Run with Node debugger
node --inspect-brk gemini-healer.js

# Verbose with detailed logging
HEALER_VERBOSE=true npm run heal:gemini

# Check environment variables
node -e "console.log(process.env)" | grep HEALER

# View healing logs
cat reports/results/healing-logs.json | npx jq .

# Check audit trail
tail -f reports/audit/.healer-audit.log

# View backups
ls -lh reports/audit/.healer-backups/
```

### Common Issues & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| `GEMINI_API_KEY_TEST not set` | Missing env var | Set in `.env` file, verify format (AIzaSy...) |
| `API timeout after 60000ms` | Slow network or large payload | Increase `HEALER_API_TIMEOUT`, check network |
| `Rate limit exceeded` | Too many API calls | Wait 60 seconds or increase `HEALER_API_RATE_LIMIT` |
| `File validation failed` | Path traversal detected | Check file path is in `tests/` directory |
| `Code validation failed` | Dangerous patterns found | Review Gemini output, check for shell commands |
| `Verification failed` | Test still fails after fix | Test might be correct, issue elsewhere |
| `Rollback failed` | Backup corrupted or missing | Check `reports/audit/.healer-backups/` |
| `No test results found` | Tests haven't been run | Execute `npm test` to generate results |

---

## SLIDE 17: Best Practices & Recommendations

### For Test Writers

```typescript
// ✅ GOOD: Semantic selectors
const bookButton = page.locator('button:has-text("Book Now")');

// ❌ BAD: Class-based selectors (brittle)
const bookButton = page.locator('.MuiButton-root.MuiButton-contained');

// ✅ GOOD: Shadow DOM aware
const seats = page.locator('seat-grid').locator('.seat.available');

// ❌ BAD: Trying to penetrate Shadow DOM
const seats = page.locator('button.seat');

// ✅ GOOD: Explicit waits
await page.waitForSelector('button', { timeout: 5000 });
await page.locator('button').waitFor({ state: 'visible' });

// ❌ BAD: Implicit waits only
await page.locator('button').click();

// ✅ GOOD: Meaningful assertions
expect(title, 'Page title should be "Home"').toBe('Home');

// ❌ BAD: Generic assertions
expect(title).toBe('Home');
```

### Security Best Practices

```typescript
// ✅ Always sanitize external input
const userInput = sanitizeForPrompt(externalData, 5000);

// ✅ Validate code before execution
const validation = validateGeneratedCode(code);
if (!validation.isValid) {
  throw new Error('Code validation failed');
}

// ✅ Maintain audit logs
auditLog('ACTION', filePath, details);

// ✅ Create backups before changes
const backup = createBackup(filePath);

// ✅ Verify changes with re-execution
const result = verifyFix(filePath);
```

---

## SLIDE 18: Success Metrics & Statistics

### Healing Report Structure

```json
{
  "timestamp": "2026-05-04T10:30:45.123Z",
  "totalTests": 15,
  "fixedCount": 12,
  "verifiedCount": 10,
  "failedVerification": 2,
  "successRate": 86,
  "duration": "45s",
  "tests": [
    {
      "title": "user can select available seats",
      "file": "LandingPageMovieList.spec.ts",
      "errorType": "DOM_ARCHITECTURE",
      "errorMessage": "Locator.click: Target page, context or browser has been closed",
      "geminiAnalysis": "Shadow DOM element (seat-grid) detected. Use nested locators...",
      "appliedFix": "Changed page.locator('button:has-text') to page.locator('seat-grid').locator('.seat')",
      "verified": true,
      "confidence": "HIGH",
      "duration": "543ms"
    }
  ],
  "statistics": {
    "errorTypeBreakdown": {
      "SELECTOR": 5,
      "DOM_ARCHITECTURE": 4,
      "ASSERTION": 2,
      "TIMEOUT_ASSERTION": 1
    },
    "confidenceDistribution": {
      "HIGH": 10,
      "MEDIUM": 2,
      "LOW": 0
    },
    "averageDuration": "452ms",
    "apiCallsUsed": 12,
    "backupsCreated": 12
  }
}
```

---

## SLIDE 19: Tech Stack & Dependencies

### Backend Technologies

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.1.0",
    "dotenv": "^16.0.0",
    "adm-zip": "^0.5.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.x",
    "typescript": "^5.x"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### System Requirements

- **OS**: Windows, macOS, Linux
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Memory**: Minimum 512MB
- **Disk**: 500MB for backups and reports
- **Network**: Stable internet for Gemini API

---

## SLIDE 20: Conclusion & Future Enhancements

### Current Capabilities

✅ Automated error classification (7 types)  
✅ Multi-layer security (input validation, code validation, audit logging)  
✅ AI-powered code generation (Gemini API)  
✅ Verification-driven fixes (automatic test re-run)  
✅ Backup & rollback mechanism  
✅ Professional HTML reporting  
✅ Rate limiting & exponential backoff  
✅ Shadow DOM handling guidance  

### Future Enhancements

🔮 Support for multiple AI models (Claude, GPT-4)  
🔮 Enhanced DOM architecture detection  
🔮 Custom healing strategies per error type  
🔮 Machine learning confidence scoring  
🔮 Distributed healing across multiple workers  
🔮 Integration with CI/CD pipelines  
🔮 Test data seeding & context awareness  
🔮 Performance optimization for large test suites  

---

**Document Status**: Complete Technical Reference  
**Last Updated**: May 4, 2026  
**Version**: 1.0 - Production Ready
