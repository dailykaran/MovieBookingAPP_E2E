# Self-Healing Test Mechanism - Complete Documentation

## Overview

The self-healing mechanism is an advanced AI-powered system that automatically analyzes failing Playwright tests and generates fixes using Google's Gemini API. It represents an educational pattern for **automated test repair** and **intelligent error analysis**.

### Key Capabilities
- 🤖 **Gemini API Integration**: Analyzes test failures with AI reasoning
- 🔄 **Automatic Fix Generation**: Generates corrected test code
- ✅ **Verification Loop**: Re-runs tests to confirm fixes work
- 🔐 **Security Hardening**: Sanitizes prompts, validates generated code, prevents injection attacks
- 💾 **Backup & Rollback**: Creates backups before changes, rolls back on failure
- 📊 **HTML Reporting**: Generates professional reports with detailed analysis
- 🛡️ **Audit Logging**: Tracks all file operations for compliance

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│           Playwright Test Execution (npm test)              │
│                                                              │
│  Failures recorded to: test-results/results.json            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         gemini-healer.js - Main Orchestrator                │
│                                                              │
│  1. Parse Failed Tests                                      │
│  2. For Each Failing Test:                                  │
│     a. Read test file                                       │
│     b. Extract error details                                │
│     c. Sanitize inputs for LLM safety                       │
│     d. Call Gemini API with analysis prompt                 │
│     e. Extract fixed code from response                     │
│     f. Validate generated code (syntax, security)           │
│     g. Create backup of original                            │
│     h. Apply fixes to test file                             │
│     i. Re-run test to verify                                │
│     j. Rollback if verification fails                       │
│  3. Collect Results                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│    healer-report-generator.js - Report Generation           │
│                                                              │
│  Generates: HTML report with interactive results            │
│  - Summary statistics (fixed, verified, success rate)       │
│  - Per-test analysis with expandable sections               │
│  - Error details, AI analysis, applied fixes                │
│  - Professional styling with navigation                     │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
        📊 playwright-report/healer-report-*.html
```

---

## gemini-healer.js - Detailed Breakdown

### File Structure

```
gemini-healer.js (1508 lines)
│
├─ IMPORTS & INITIALIZATION (Lines 1-30)
│  ├─ ESM imports
│  ├─ Get script directory for .env loading
│  └─ Load environment variables
│
├─ CONFIGURATION & VALIDATION (Lines 31-210)
│  ├─ Parse environment variables
│  ├─ Validate Gemini API key
│  ├─ Check dependencies
│  ├─ Validate configuration
│  └─ Pre-flight environment checks
│
├─ SECURITY FUNCTIONS (Lines 211-870)
│  ├─ Path validation & sanitization
│  ├─ Test file name validation (whitelist patterns)
│  ├─ Generated code validation (dangerous patterns detection)
│  ├─ Prompt injection detection
│  ├─ Error message sanitization (remove PII)
│  ├─ Input sanitization (remove credentials, paths, emails)
│  ├─ Code size validation (prevent token overflow)
│  ├─ Syntax validation (TypeScript/JavaScript)
│  ├─ Audit logging
│  └─ Backup creation & cleanup
│
├─ API INTERACTION (Lines 871-1020)
│  ├─ Rate limiting with exponential backoff
│  ├─ Generate analysis prompt with security sanitization
│  ├─ Call Gemini API with retry mechanism
│  ├─ Extract fixed code from response
│  └─ Timeout handling (60s default)
│
├─ FIXING & VERIFICATION (Lines 1021-1210)
│  ├─ Apply fixes to test file (atomic write)
│  ├─ Rollback mechanism on failure
│  ├─ Re-run test to verify fix
│  ├─ Parse test output for pass/fail
│  └─ Report results
│
├─ DISPLAY & REPORTING (Lines 1211-1320)
│  ├─ Display analysis results
│  ├─ Display fixed code
│  ├─ Display healing summary
│  └─ Generate error reports
│
└─ MAIN WORKFLOW (Lines 1321-1512)
   ├─ Parse CLI arguments
   ├─ Pre-flight checks
   ├─ Fetch failed tests
   ├─ Process each test
   └─ Generate reports
```

### Key Functions Explained

#### 1. **Pre-flight Checks** (Initialization Phase)
```javascript
validateEnvironment()  // Ensures all required files exist
checkDependencies()    // Verifies npm packages installed
validateConfiguration() // Validates config values are reasonable
```

**What it does**: Before attempting any healing, validates that the environment is set up correctly. Prevents cryptic errors later.

---

#### 2. **Security & Sanitization** (Most Critical)

**Problem Solved**: When sending test code to an LLM API, you must:
- Remove sensitive paths (home directories, file locations)
- Remove credentials (API keys, tokens)
- Remove personal info (emails, IP addresses)
- Prevent prompt injection attacks
- Validate generated code doesn't contain dangerous operations

**Implementation**:

```javascript
// Sanitize user input for LLM prompts
function sanitizeForPrompt(input, maxLength = 5000) {
  // Remove local paths
  sanitized = sanitized.replace(/[A-Za-z]:\\[^\s]*/g, '[LOCAL_PATH]');
  
  // Remove emails
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Remove IP addresses
  sanitized = sanitized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_ADDRESS]');
  
  // Remove URLs
  sanitized = sanitized.replace(/https?:\/\/(?!localhost)[^\s]+/gi, '[URL]');
}

// Detect prompt injection attempts
function detectPromptInjection(input) {
  const injectionPatterns = [
    /ignore[\s\n]*previous[\s\n]*instructions/gi,
    /act[\s\n]*as[\s\n]*evil/gi,
    /bypass[\s\n]*security/gi,
  ];
  return injectionPatterns.some(pattern => pattern.test(input));
}

// Validate generated code for dangerous patterns
function validateGeneratedCode(code) {
  const DANGEROUS_PATTERNS = [
    /fs\.(rm|unlink|rmdir)/,  // File deletion
    /execSync|execFile|spawn/, // Command execution
    /eval\(|new Function/,     // Dynamic code execution
    /process\.exit/,           // Process termination
  ];
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      issues.push('Dangerous operation detected');
    }
  }
}
```

**Why This Matters**: 
- Prevents accidentally leaking credentials to API
- Prevents malicious LLM responses from executing dangerous code
- Ensures compliance with security standards

---

#### 3. **Gemini API Integration** (Core Healing Logic)

**Flow**:
```
1. Read failing test file
2. Extract error message from test output
3. Sanitize all inputs (test code, error, prompt)
4. Generate analysis prompt
5. Call Gemini with retry & rate limiting
6. Extract fixed code from response
7. Validate extracted code
8. Create backup of original
9. Write fixed code to file
10. Re-run test to verify
11. If failed: Rollback from backup
12. Report result
```

**Key Code**:
```javascript
async function analyzeWithGemini(testInfo, testCode, retryCount = 0) {
  try {
    await rateLimitAndWait(); // Rate limiting: max 5 calls/minute
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = generateAnalysisPrompt(testInfo, testCode);
    
    // Timeout after 60 seconds
    const response = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), HEALER_API_TIMEOUT)
      )
    ]);
    
    return response.response.text();
  } catch (error) {
    if (retryCount < HEALER_MAX_RETRIES) {
      // Exponential backoff: 2s, 4s, 8s, 16s
      const backoffMs = Math.pow(2, retryCount + 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return analyzeWithGemini(testInfo, testCode, retryCount + 1);
    }
    throw error;
  }
}
```

**Prompt Structure**:
```
You are an expert Playwright test automation engineer.

PROVIDE:
1. Root Cause Analysis
2. Error Classification
3. Issues Found
4. Recommended Fixes
5. COMPLETE Fixed Code

CRITICAL: Provide complete fixed code inside TypeScript code block.
Include ALL imports, complete test function, closing braces.

Error Message: [sanitized error]

Current Test Code: [sanitized code]

Analysis Focus Areas:
- Playwright selectors (CSS, role-based, text-based)
- Material-UI component selectors
- Timing and async operations
- Accessibility-first selectors
- Strict mode violations
```

---

#### 4. **Code Extraction from LLM Response**

**Challenge**: Gemini returns markdown text with code blocks. Need to:
1. Find the TypeScript code block
2. Validate it looks complete
3. Extract it cleanly

```javascript
function extractFixedCode(geminiResponse) {
  // Look for code blocks: ```typescript ... ```
  const codeBlockPattern = /```(?:typescript|javascript)?\n([\s\S]*?)\n```/g;
  let allMatches = [];
  
  let match;
  while ((match = codeBlockPattern.exec(geminiResponse)) !== null) {
    const code = match[1].trim();
    // Must look like real test code
    if (code.includes('import') || code.includes('test(') || code.includes('expect(')) {
      allMatches.push(code);
    }
  }
  
  // Return longest match (most likely the complete fix)
  if (allMatches.length > 0) {
    return allMatches.reduce((a, b) => a.length > b.length ? a : b);
  }
  
  return null; // No valid code found
}
```

---

#### 5. **Backup & Atomic File Write**

**Pattern**: Create backup → Write changes → Verify → If failed, restore from backup

```javascript
function applyFixes(filePath, fixedCode) {
  // 1. Create backup BEFORE any changes
  const backupPath = createBackup(filePath);
  if (!backupPath) {
    console.error('Failed to create backup - aborting');
    return false;
  }
  
  // 2. Validate syntax before writing
  const syntaxCheck = validateTypeScriptSyntax(fixedCode);
  if (!syntaxCheck.valid) {
    console.error('Syntax validation failed');
    return false;
  }
  
  // 3. Atomically write file (prevents corruption if crash mid-write)
  const success = atomicFileWrite(filePath, fixedCode);
  if (!success) {
    console.error('Failed to write file');
    return false;
  }
  
  // 4. Verify fix works
  const verificationResult = verifyFix(filePath);
  if (!verificationResult.passed) {
    // Rollback from backup!
    rollbackFix(filePath, backupPath);
    console.error('Verification failed - rolled back');
    return false;
  }
  
  return true;
}

// Atomic write using temp file (prevents partial writes)
function atomicFileWrite(filePath, content) {
  const tempFile = path.join(path.dirname(filePath), `healer-${Date.now()}.tmp`);
  
  // Write to temp file
  fs.writeFileSync(tempFile, content, 'utf8');
  
  // Verify content written correctly
  const written = fs.readFileSync(tempFile, 'utf8');
  if (written !== content) {
    fs.unlinkSync(tempFile);
    throw new Error('Content mismatch after write');
  }
  
  // Atomic move (works across filesystems)
  fs.copyFileSync(tempFile, filePath);
  fs.unlinkSync(tempFile);
  
  return true;
}
```

---

#### 6. **Test Verification**

```javascript
function verifyFix(testFile) {
  try {
    // Extract just the filename for filtering
    const baseName = path.basename(testFile).replace('.ts', '');
    
    // Run playwright with grep filter
    const cmd = `npx playwright test ${testFile} --reporter=json`;
    const result = execFileSync('npx', ['playwright', 'test', testFile, '--reporter=json'], {
      timeout: 120000, // 2 minute timeout
      cwd: process.cwd()
    });
    
    // Parse JSON output
    const output = JSON.parse(result.toString());
    
    // Check if all tests passed
    const allPassed = output.suites.every(suite => 
      suite.specs.every(spec =>
        spec.tests.every(test =>
          test.results.every(result => result.status === 'passed')
        )
      )
    );
    
    return { passed: allPassed, output };
  } catch (err) {
    return { passed: false, error: err.message };
  }
}
```

---

#### 7. **Conditional Healing** (Skip Impossible Cases)

Not all errors can be fixed. Some are infrastructure issues:

```javascript
const SKIP_HEALING_KEYWORDS = [
  'network error',
  'connection refused',
  'port already in use',
  'certificate error',
  'dns not found',
  'server not running'
];

function shouldHealTest(testInfo) {
  const lowerError = testInfo.error.toLowerCase();
  
  // Skip if error is infrastructure-related
  for (const keyword of SKIP_HEALING_KEYWORDS) {
    if (lowerError.includes(keyword)) {
      return false; // Can't fix server/network issues
    }
  }
  
  // Only heal if we identified the error type
  if (testInfo.errorType === 'unknown') {
    return false;
  }
  
  return true;
}
```

**Why**: Gemini can't fix network timeouts or server issues. Skip these to save API calls and time.

---

#### 8. **Backup Cleanup** (Prevent Disk Bloat)

```javascript
function cleanupOldBackups() {
  // Keep last 5 backups per file
  // Delete backups older than 7 days
  
  const now = Date.now();
  const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  
  Object.entries(backupsByFile).forEach(([originalFile, backups]) => {
    // Sort by date
    backups.sort((a, b) => b.time - a.time);
    
    // Keep only most recent 5
    const toDelete = backups.slice(MAX_BACKUPS_PER_FILE);
    
    toDelete.forEach(backup => {
      if (now - backup.time > retentionMs) {
        fs.unlinkSync(backup.path);
      }
    });
  });
}
```

---

## healer-report-generator.js - Detailed Breakdown

### Purpose
Generates a professional, interactive HTML report of the healing session with expandable sections, syntax highlighting, and responsive design.

### Key Sections

#### 1. **HTML Structure**

```html
┌─────────────────────────────────────┐
│ HEADER                              │
│ Title: Gemini Healer Report         │
│ Subtitle: Automated Test Analysis   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ SUMMARY CARDS                       │
│ ├─ Tests Analyzed: 8                │
│ ├─ Tests Fixed: 6                   │
│ ├─ Tests Verified: 5                │
│ └─ Success Rate: 62.5%              │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ TEST RESULTS (Per Test)             │
│ ├─ Test 1 [FIXED & VERIFIED] ✅     │
│ │  ├─ Error Details (expandable)    │
│ │  ├─ AI Analysis (expandable)      │
│ │  └─ Applied Fix (expandable)      │
│ │                                   │
│ ├─ Test 2 [NOT FIXED] ❌            │
│ │  ├─ Error Details (expandable)    │
│ │  └─ Analysis (expandable)         │
│ ...                                 │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ SESSION SUMMARY                     │
│ ├─ Duration: 45s                    │
│ ├─ Total Tests: 8                   │
│ ├─ Fixed: 6                         │
│ └─ Success Rate: 75%                │
└─────────────────────────────────────┘
```

#### 2. **Key Features**

**Color Scheme**:
```css
--navy: #1e3a8a        /* Primary: Headers, borders */
--green: #10b981       /* Success: Fixed, verified */
--grey: #6b7280        /* Secondary: Text, backgrounds */
--teal: #0d9488        /* Accent: Highlights, gradients */
```

**Status Badges**:
```
✅ FIXED & VERIFIED  → Green background (test re-run passed)
⚠️  FIXED (UNVERIFIED) → Yellow background (fix applied but not verified)
❌ NOT FIXED → Red background (AI could not fix)
```

#### 3. **Interactive Expandable Sections**

```javascript
// Toggle test result visibility
function toggleTestResult(headerElement) {
  const testResult = headerElement.parentElement;
  testResult.classList.toggle('expanded');
}

// Toggle subsection visibility (Error Details, Analysis, Fix)
function toggleSubsection(headerElement) {
  const subsection = headerElement.parentElement;
  subsection.classList.toggle('expanded');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Auto-expand first test result
  const firstResult = document.querySelector('.test-result');
  if (firstResult) {
    firstResult.classList.add('expanded');
  }
  
  // Attach click handlers to all headers
  document.querySelectorAll('.test-header').forEach(header => {
    header.addEventListener('click', toggleTestResult);
  });
});
```

#### 4. **Code Formatting with Line Numbers**

```javascript
function formatCodeWithLineNumbers(code, type = 'error', maxLines = 8) {
  const lines = code.split('\n').slice(0, maxLines);
  const totalLines = code.split('\n').length;
  
  let html = lines.map((line, idx) => {
    const lineNum = idx + 1;
    const escapedLine = escapeHtmlNode(line);
    
    // Syntax highlighting based on type
    let highlighted = escapedLine;
    if (type === 'error') {
      highlighted = highlighted
        .replace(/\b(Error|TypeError|FAIL)\b/g, '<span class="error-kw">$1</span>')
        .replace(/\b(timeout|failed)\b/g, '<span class="error-warn">$1</span>');
    } else if (type === 'fix') {
      highlighted = highlighted
        .replace(/\b(test|expect|async|await)\b/g, '<span class="fix-keyword">$1</span>')
        .replace(/\b(page\.|locator|click|fill)\b/g, '<span class="fix-action">$1</span>');
    }
    
    return `
      <div class="code-line">
        <span class="line-num">${lineNum}</span>
        <span class="code-text">${highlighted}</span>
      </div>
    `;
  }).join('');
  
  if (totalLines > maxLines) {
    html += `<div class="code-truncated">... ${totalLines - maxLines} more lines</div>`;
  }
  
  return html;
}
```

#### 5. **CSS Features**

**Responsive Grid**:
```css
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

/* On mobile, becomes single column */
@media (max-width: 768px) {
  .summary {
    grid-template-columns: 1fr;
  }
}
```

**Smooth Animations**:
```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.test-result.expanded .test-content {
  display: block;
  animation: slideDown 0.3s ease-out;
}
```

**Custom Scrollbar**:
```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background: var(--grey);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--navy);
}
```

#### 6. **Report Generation**

```javascript
function generateHtmlReport(healingResults) {
  const reportDir = path.join(process.cwd(), 'test-results');
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>...</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Self Healer report by Gemini</h1>
        </div>
        
        <div class="content">
          <!-- Summary Cards -->
          <div class="summary">
            <div class="stat-card">
              <p>Tests Analyzed</p>
              <h3>${healingResults.totalTests}</h3>
            </div>
            ...
          </div>
          
          <!-- Test Results -->
          <div class="results">
            ${renderTestResults(healingResults.tests)}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const reportPath = path.join(
    reportDir, 
    `healer-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`
  );
  
  fs.writeFileSync(reportPath, htmlContent, 'utf8');
  console.log(`📊 HTML Report generated: ${reportPath}`);
  
  return reportPath;
}
```

---

## Configuration & Environment Variables

### `.env` File Format

```env
# Required
GEMINI_API_KEY=AIzaSy...                    # Get from https://aistudio.google.com/app/apikeys

# Optional: Healer Behavior
HEALER_AUTO_FIX=false                       # Automatically apply fixes (default: false)
HEALER_VERBOSE=false                        # Show debug info (default: false)
HEALER_MAX_RETRIES=3                        # Retry attempts (default: 3)
HEALER_API_TIMEOUT=60000                    # Timeout in ms (default: 60s)
HEALER_API_RATE_LIMIT=5                     # Max calls per minute (default: 5)

# Optional: Backup Management
BACKUP_RETENTION_DAYS=7                     # Keep backups X days (default: 7)
MAX_BACKUPS_PER_FILE=5                      # Max backups per file (default: 5)

# Optional: File Limits
HEALER_MAX_FILE_SIZE=1048576               # Max file size in bytes (default: 1MB)

# Optional: Playwright
PLAYWRIGHT_HEADLESS=false                   # Run tests headless (default: false)
PLAYWRIGHT_SLOW_MO=0                        # Slow down by X ms (default: 0)
```

### Example .env for Development

```env
GEMINI_API_KEY=AIzaSyBLnC85-HOlimjabccGpgOamCgGt8SuIAI
HEALER_AUTO_FIX=true
HEALER_VERBOSE=true
HEALER_MAX_RETRIES=5
HEALER_API_TIMEOUT=120000
HEALER_API_RATE_LIMIT=10
PLAYWRIGHT_HEADLESS=true
```

---

## Usage Examples

### 1. **Analyze Failing Tests (No Auto-Fix)**

```bash
cd e2e
npm install
npx playwright install --with-deps

# Run tests first
npm test

# Analyze failures without applying fixes
npm run heal:gemini
```

**Output**: Shows analysis of each failing test with AI recommendations.

---

### 2. **Auto-Fix Failing Tests**

```bash
npm run heal:gemini:auto
```

**Flow**:
1. Analyzes all failing tests
2. Generates fixes using Gemini
3. Applies fixes to test files
4. Re-runs tests to verify
5. Rolls back if verification fails
6. Generates HTML report

**Output**: `test-results/healer-report-*.html`

---

### 3. **Fix Specific Test File**

```bash
npm run heal:gemini -- tests/LandingPageMovieList.spec.ts --auto-fix
```

---

### 4. **Verbose Mode with Detailed Logging**

```bash
npm run heal:gemini:verbose
```

Shows detailed debug info including:
- Configuration validation
- API rate limiting details
- Backup creation/cleanup operations
- Syntax validation steps
- Verification output

---

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| **LLM Prompt Injection** | Detect and block known injection patterns |
| **Sensitive Data Leakage** | Sanitize paths, emails, IPs before sending to API |
| **Arbitrary Code Execution** | Validate generated code for dangerous operations (fs, exec, eval) |
| **File System Escape** | Validate file paths don't contain `..` or symlinks |
| **Partial File Writes** | Use atomic writes with temp files and verification |
| **Disk Space Bloat** | Cleanup old backups after retention period |
| **Tampering/Auditing** | Log all file operations to audit log |

### Code Security Checklist

✅ Path validation with symlink detection  
✅ Whitelist allowed test file patterns (only `*.spec.ts` and `*.test.ts`)  
✅ Dangerous pattern detection in generated code  
✅ Prompt injection detection  
✅ Error message sanitization (remove PII)  
✅ Input sanitization (remove credentials)  
✅ Syntax validation before applying fixes  
✅ Atomic file writes with rollback  
✅ Backup creation before modifications  
✅ Audit logging of all operations  

---

## Workflow Diagram

```
START
  │
  ├─→ Parse CLI args & validate
  │
  ├─→ Pre-flight checks
  │   ├─ Dependencies installed?
  │   ├─ .env configured?
  │   ├─ test-results/results.json exists?
  │   └─ Backup directory writable?
  │
  ├─→ Load failed tests from results.json
  │
  ├─→ For each failing test:
  │   │
  │   ├─→ Skip if infrastructure error?
  │   │   (network, server, dns, etc.)
  │   │
  │   ├─→ Read test file
  │   │
  │   ├─→ Extract error & context
  │   │
  │   ├─→ Sanitize inputs
  │   │   ├─ Remove PII
  │   │   ├─ Remove paths
  │   │   ├─ Remove credentials
  │   │   └─ Detect injection attempts
  │   │
  │   ├─→ Generate analysis prompt
  │   │
  │   ├─→ Call Gemini API
  │   │   ├─ Rate limit (5 calls/min)
  │   │   ├─ Retry on failure (exponential backoff)
  │   │   └─ Timeout after 60s
  │   │
  │   ├─→ Extract fixed code
  │   │
  │   ├─→ Validate code
  │   │   ├─ Check syntax
  │   │   ├─ Check for dangerous patterns
  │   │   └─ Check file size
  │   │
  │   ├─→ Create backup
  │   │
  │   ├─→ Apply fixes (atomic write)
  │   │
  │   ├─→ Re-run test
  │   │
  │   └─→ Report result
  │       ├─ If passed: ✅ Verified
  │       ├─ If failed: Rollback & ❌ Not Fixed
  │       └─ If no code: ❌ Not Fixed
  │
  ├─→ Cleanup old backups
  │   ├─ Delete if older than 7 days
  │   └─ Keep max 5 per file
  │
  ├─→ Generate reports
  │   ├─ Console summary
  │   ├─ HTML interactive report
  │   └─ Error report (if failures)
  │
  └─→ END
```

---

## Performance Considerations

### API Costs

Gemini Flash (default model) pricing:
- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens

**Typical per-test cost**: $0.001 - $0.005 (very cheap)

### Time Budget

```
Per test fix:
  - Read test file:        ~50ms
  - API call:             ~3-5s (plus network latency)
  - Code extraction:      ~100ms
  - Validation:           ~200ms
  - Backup creation:      ~100ms
  - Apply fixes:          ~100ms
  - Test re-run:          ~2-5s
  ──────────────────
  Total per test:         ~5-10s

Session (8 tests):       ~1-2 minutes
```

### Optimization Tips

1. **Use Verbose Mode** to identify slow operations
2. **Increase Rate Limit** if API supports it (request quota increase)
3. **Batch Processing** for many tests (run overnight)
4. **Skip Infrastructure Errors** (conditional healing)
5. **Disable Auto-Fix** for analysis-only runs (saves 5s per test)

---

## Troubleshooting

### "GEMINI_API_KEY is not set"

**Cause**: `.env` file encoding is UTF-16 or file not found

**Fix**:
```bash
# Verify .env exists
ls -la e2e/.env

# Check if it's readable
cat e2e/.env

# If encoding issue, recreate:
echo "GEMINI_API_KEY=your_key_here" > e2e/.env
```

### "Missing required dependencies"

**Cause**: npm packages not installed

**Fix**:
```bash
cd e2e
npm install
```

### "FAIL: Test re-run verification failed"

**Cause**: Fix was applied but test still fails (Gemini generated incomplete fix)

**Fix**:
1. Check `test-results/healer-error-report-*.json` for details
2. Review the test manually
3. Increase `HEALER_MAX_RETRIES` to allow more API calls
4. Check Gemini's analysis in HTML report

### "Timeout waiting for test to complete"

**Cause**: Test hangs or takes longer than 2 minutes

**Fix**:
```env
# Increase verification timeout from 120s
# In gemini-healer.js around line 1170
timeout: 300000  // 5 minutes instead of 2
```

---

## Best Practices

### When to Use Self-Healing

✅ **Good Use Cases**:
- Failing due to selector changes (DOM updates)
- Failing due to timing issues (race conditions)
- Simple assertion failures
- Page navigation changes

❌ **Poor Use Cases**:
- Network/infrastructure errors
- Feature not implemented
- Test logic is fundamentally wrong
- App crashes on that page

### Manual Workflow

```bash
# 1. Run tests
npm test

# 2. Review failures
npx playwright show-report

# 3. Analyze with Gemini (no auto-fix)
npm run heal:gemini

# 4. Review recommendations in HTML report
open test-results/healer-report-*.html

# 5. Decide: apply fixes or investigate manually
npm run heal:gemini:auto  # Apply fixes

# 6. Verify in HTML report
npx playwright show-report
```

---

## Future Enhancements

### Possible Improvements

1. **Multiple AI Models** (Claude, GPT-4, local LLMs)
2. **Batch Healing** (process multiple test files in parallel)
3. **Learning** (store successful fixes, suggest similar ones)
4. **Custom Prompts** (allow team-specific analysis instructions)
5. **Slack Integration** (report results to Slack channel)
6. **Web Dashboard** (view reports in web UI instead of HTML)
7. **Test Coverage Analysis** (identify under-tested areas)
8. **Performance Analysis** (detect slow tests)

---

## Summary

The self-healing mechanism represents a **modern approach to test maintenance** by:

- 🤖 Leveraging AI to understand test failures
- 🔒 Maintaining strong security boundaries
- 💾 Providing safe fallback mechanisms (backups, rollbacks)
- 📊 Generating actionable reports
- 🛡️ Preventing dangerous operations through validation
- 📈 Tracking all operations for compliance

This pattern is educational and demonstrates:
- LLM API integration best practices
- Security-first code generation
- Atomic file operations
- Comprehensive error handling
- Professional reporting

**Current Status**: Production-grade implementation with comprehensive security hardening.
