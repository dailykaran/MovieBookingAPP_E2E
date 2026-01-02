# Gemini Healer - Complete Guide

## 🎯 Introduction

**Gemini Healer** is an intelligent test automation healing system that uses Google's Generative AI to analyze failing Playwright tests, generate fixes, and apply them automatically. It's designed for teams that want to reduce manual test maintenance through AI-assisted debugging.

### Key Benefits
- 🤖 **AI Analysis**: Intelligent root cause analysis for test failures
- 🔧 **Automated Fixes**: Generate and apply fixes automatically
- ✅ **Verification**: Re-run tests to confirm fixes work
- 🔙 **Safe Rollback**: Automatic rollback if fixes fail
- 📊 **Professional Reports**: Beautiful interactive HTML reports
- 🔐 **Secure**: Comprehensive security validation and audit trails

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 14+ 
- npm or yarn
- Playwright installed
- Google Generative AI API key

### Step 1: Install Dependencies
```bash
cd e2e
npm install
```

### Step 2: Configure API Key
Create a `.env` file in the `e2e` directory:
```bash
cp .env.example .env
```

Add your Gemini API key:
```bash
GEMINI_API_KEY=your-api-key-here
```

Get your API key from: https://makersuite.google.com/app/apikey

### Step 3: Run Tests
```bash
npm test
```

This generates `test-results/results.json` with test execution details.

### Step 4: Run Healer
```bash
node gemini-healer.js --auto-fix -v
```

---

## 🚀 Quick Start

### Basic Commands

**Analyze failing tests (no auto-fix):**
```bash
node gemini-healer.js
```

**Analyze and auto-apply fixes:**
```bash
node gemini-healer.js --auto-fix
```

**With verbose logging:**
```bash
node gemini-healer.js --auto-fix -v
```

**Heal specific test file:**
```bash
node gemini-healer.js localhost-3000.spec.ts --auto-fix
```

**Show help:**
```bash
node gemini-healer.js --help
```

### What Happens When You Run It

```
1. Pre-flight Checks
   ├─ Verify dependencies installed
   ├─ Validate configuration
   └─ Check environment setup

2. Test Analysis
   ├─ Read test-results/results.json
   ├─ Extract failed tests
   └─ Classify error types

3. AI Analysis (Per Test)
   ├─ Send to Gemini API
   ├─ Get root cause analysis
   └─ Receive fixed code

4. Fix Application (if --auto-fix)
   ├─ Create backup
   ├─ Validate code
   ├─ Apply fix
   └─ Re-run test for verification

5. Report Generation
   ├─ Generate HTML report
   ├─ Create error report
   └─ Save audit log
```

---

## 🔧 Configuration

### Environment Variables

**Essential:**
```bash
GEMINI_API_KEY=your-key-here    # Required: Gemini API authentication
```

**Behavior:**
```bash
HEALER_AUTO_FIX=true            # Auto-apply fixes (default: env var only)
HEALER_VERBOSE=true             # Detailed debug output (default: env var only)
```

**Performance:**
```bash
HEALER_MAX_RETRIES=3            # Retry failed API calls (default: 3)
HEALER_API_TIMEOUT=60000        # API timeout in milliseconds (default: 60s)
HEALER_API_RATE_LIMIT=5         # API calls per minute (default: 5)
HEALER_MAX_FILE_SIZE=1048576    # Max test file size in bytes (default: 1MB)
```

**Backup & Storage:**
```bash
HEALER_BACKUP_DIR=.healer-backups       # Backup directory (default)
HEALER_AUDIT_LOG=.healer-audit.log      # Audit log file (default)
BACKUP_RETENTION_DAYS=7                 # Keep backups for 7 days
MAX_BACKUPS_PER_FILE=5                  # Max 5 backups per file
```

### Example .env File
```bash
# API Configuration
GEMINI_API_KEY=AIzaSyD...your-key-here...

# Healing Behavior
HEALER_AUTO_FIX=true
HEALER_VERBOSE=false

# API Performance
HEALER_MAX_RETRIES=3
HEALER_API_TIMEOUT=60000
HEALER_API_RATE_LIMIT=5

# File Limits
HEALER_MAX_FILE_SIZE=1048576

# Backup Configuration
BACKUP_RETENTION_DAYS=7
MAX_BACKUPS_PER_FILE=5
```

---

## 📊 How It Works

### 1. Test Detection

**Process:**
1. Read `test-results/results.json` from Playwright execution
2. Extract failing tests from suites
3. For each failure:
   - Get test file path
   - Extract error message
   - Classify error type
   - Get error context/location

**Supported Test Files:**
- `*.spec.ts` / `*.spec.tsx`
- `*.test.ts` / `*.test.tsx`

**Security Check:**
- Path traversal prevention
- Symbolic link blocking
- File size validation (1MB default)

---

### 2. Error Classification

The system automatically identifies error types:

| Error Type | Keywords | Healing |
|-----------|----------|---------|
| `timeout` | timeout, Timeout, TIMEOUT | ✅ Heal |
| `strict_mode` | strict mode, resolved to | ✅ Heal |
| `assertion` | expect, assertion | ✅ Heal |
| `not_found` | not found, 404 | ✅ Heal |
| `unknown` | other errors | ⚠️ Conditional |

**Skipped (Infrastructure Issues):**
```
❌ network error      ❌ connection refused
❌ configuration      ❌ port in use
❌ certificate/SSL    ❌ DNS/host not found
```

---

### 3. AI Analysis

**Gemini Model Used:** `gemini-2.5-flash`

**Analysis Includes:**
1. Root cause identification
2. Error classification
3. Issues found in code
4. Recommended fixes
5. Complete fixed code

**Example Prompt:**
```
You are an expert Playwright test automation engineer. Analyze this failing test:

Error Type: timeout
Error Message:
```
Timeout waiting for element
```

Current Test Code:
```typescript
test('Load product details', async ({ page }) => {
  await page.goto('/products/1');
  await page.click('[data-testid="price-tag"]');
});
```

Focus on:
- Playwright selectors (CSS, role-based, text-based)
- Material-UI components (.MuiBox-root, etc.)
- Async/timing operations
- Accessibility selectors
```

---

### 4. Code Extraction & Validation

**Extraction Process:**
1. Parse code blocks from Gemini response
2. Look for: ` ```typescript ` or ` ```javascript `
3. Verify blocks contain:
   - `import` statements
   - `test()` or `it()` function
   - `expect()` assertions

**Validation Checks:**
- Matching braces: `{` and `}`
- Matching parentheses: `(` and `)`
- No dangerous patterns (fs.rm, eval, etc.)
- No suspicious imports (fs, child_process, os)
- Complete and compilable code

---

### 5. Fix Application

**Before Applying:**
1. Create timestamped backup
2. Run security validation
3. Check code patterns

**Apply:**
1. Write file atomically (temp file pattern)
2. Log modification to audit trail
3. Verify content written correctly

**After Applying:**
1. Re-run specific test: `npx playwright test tests/{file}`
2. Parse test output for pass/fail
3. If failed: Rollback from backup automatically

---

### 6. Verification

The system re-runs the test to confirm the fix works:

```bash
npx playwright test tests/localhost-3000.spec.ts \
  --reporter=list \
  --reporter=json \
  --reporter-output=playwright-report/verify-results.json
```

**Success Criteria:**
- Test passes (1+ passes, 0 fails)
- OR "No tests found" (assumed valid)

**Failure Handling:**
- Automatic rollback to backup
- Test marked as unverified
- Logged for manual review

---

## 📝 Reports & Output

### HTML Report

**Location:** `test-results/healer-report-{timestamp}.html`

**Contains:**
- Header with branding (✨ Self Healer report by Gemini)
- Summary cards (Tests analyzed, fixed, verified, success rate)
- Test results grouped by suite
- Expandable details for each test:
  - Error details with syntax highlighting
  - AI analysis with bullet points
  - Applied/suggested fix with code highlighting
  - Verification status
- Session summary with metrics
- Professional footer

**Features:**
- Fully responsive (mobile-friendly)
- Dark navy/green color scheme
- Expandable/collapsible sections
- Syntax highlighting for code
- Resizable content areas
- Interactive scrolling

**Open Report:**
```bash
# On Windows
start "test-results/healer-report-2026-01-02T18-30-45-123Z.html"

# On macOS
open "test-results/healer-report-2026-01-02T18-30-45-123Z.html"

# On Linux
xdg-open "test-results/healer-report-2026-01-02T18-30-45-123Z.html"
```

---

### Error Report

**Location:** `test-results/healer-error-report-{timestamp}.json`

**Format:**
```json
{
  "timestamp": "2026-01-02T18:30:45.123Z",
  "totalFailed": 2,
  "errors": [
    {
      "file": "localhost-3000.spec.ts",
      "title": "Load product details",
      "errorType": "timeout",
      "errorSummary": "Timeout waiting for element...",
      "reason": "Test verification failed"
    }
  ],
  "recommendations": [
    "Review error messages for patterns",
    "Check if errors are infrastructure-related",
    "Consider increasing HEALER_API_TIMEOUT",
    "Verify test file syntax is correct",
    "Check Gemini API is responding correctly"
  ]
}
```

---

### Audit Log

**Location:** `.healer-audit.log`

**Format:** JSON lines (one entry per line)

**Example Entry:**
```json
{"timestamp":"2026-01-02T18:30:45.123Z","action":"FILE_MODIFIED","filePath":"localhost-3000.spec.ts","userId":"username","details":"Backup: .healer-backups/localhost-3000.spec.ts.1704201045123.bak","pid":12345}
```

**Actions Logged:**
- `FILE_READ` - Test file read
- `BACKUP_CREATED` - Backup created
- `FILE_MODIFIED` - Test file updated
- `ROLLBACK_PERFORMED` - Fix rolled back
- `TEST_VERIFIED` - Test passed
- `TEST_FAILED` - Test failed
- `BACKUP_DELETED` - Old backup cleaned

---

## 🔐 Security Features

### Input Validation

**Path Validation:**
- No directory traversal (`../`)
- No symbolic links
- Must be in tests directory
- File size limit (1MB default)

**File Name Validation:**
- Only alphanumeric, dots, hyphens, slashes
- Must match pattern: `*.spec.ts`, `*.test.ts`, etc.

**CLI Arguments:**
- Sanitized before use
- No special characters allowed

---

### Code Security

**Before Execution, Scan For:**
- ❌ File operations: `fs.rm`, `fs.unlink`, `execSync`
- ❌ Process operations: `process.exit`, `child_process`
- ❌ Dynamic code: `eval()`, `new Function()`, `require()`, `import()`
- ❌ Suspicious imports: `fs`, `os`, `child_process`

**Required Patterns:**
- ✅ Must have `test()` or `it()` function
- ✅ Must have `expect()` assertion
- ✅ Must have import statements

---

### File Operations

**Atomic Writes:**
1. Write to temporary file
2. Verify content
3. Copy to target location
4. Delete temp file
5. Purpose: Prevent partial writes/corruption

**Backup Management:**
- Automatic backup before modification
- Timestamp format: `{filename}.{timestamp}.bak`
- Retention: 7 days (configurable)
- Max per file: 5 backups (configurable)
- Auto-cleanup of old backups

---

### HTML Escaping

All user-generated content in HTML reports is escaped:
```javascript
& → &amp;    < → &lt;    > → &gt;    " → &quot;    ' → &#039;
```

Purpose: Prevent XSS attacks

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. "GEMINI_API_KEY is not set"
**Solution:**
```bash
# Create .env file
echo "GEMINI_API_KEY=your-key-here" > .env

# Get key from: https://makersuite.google.com/app/apikey
```

#### 2. "Timeout after 60000ms"
**Solution:**
```bash
# Increase timeout in .env
HEALER_API_TIMEOUT=120000  # 2 minutes
```

#### 3. "Rate limit reached"
**Solution:**
```bash
# Reduce API call rate
HEALER_API_RATE_LIMIT=3    # 3 calls per minute
# Or increase rate limit window
```

#### 4. "File exceeds max size"
**Solution:**
```bash
# Increase max file size
HEALER_MAX_FILE_SIZE=2097152  # 2MB
```

#### 5. "No test results found"
**Solution:**
```bash
# Run tests first
npm test

# Then run healer
node gemini-healer.js --auto-fix
```

#### 6. "No import statements found"
**Solution:**
- Check generated code has imports
- Ensure test file is valid TypeScript
- Review Gemini response in verbose mode

#### 7. "Test still failing after fix"
**Solution:**
- Check if error is infrastructure-related
- Review AI analysis in HTML report
- Increase `HEALER_API_TIMEOUT`
- Manually review and fix the test

---

## 📚 Best Practices

### 1. Run Tests First
Always run Playwright tests before running Healer:
```bash
npm test
node gemini-healer.js --auto-fix
```

### 2. Use Verbose Mode While Learning
```bash
node gemini-healer.js --auto-fix -v
```

### 3. Review Before Auto-Fix
First run without `--auto-fix` to see analysis:
```bash
node gemini-healer.js -v
```

Then apply fixes manually or use `--auto-fix`.

### 4. Check Reports
Always review the HTML report after healing:
```bash
# Windows
start test-results/healer-report-*.html

# macOS/Linux
open test-results/healer-report-*.html
```

### 5. Monitor API Usage
- Track API calls to stay within quotas
- Adjust `HEALER_API_RATE_LIMIT` if needed
- Check Google API dashboard

### 6. Backup Important Tests
Keep backups of critical test files:
```bash
cp tests/critical.spec.ts tests/critical.spec.ts.backup
```

### 7. Review Audit Log
Periodically check what was changed:
```bash
tail -20 .healer-audit.log
```

---

## 🔄 Workflow Examples

### Example 1: One-Time Healing Session
```bash
# 1. Run tests
npm test

# 2. Analyze with Healer (no auto-fix)
node gemini-healer.js -v

# 3. Review analysis and fixes

# 4. Apply auto-fix
node gemini-healer.js --auto-fix -v

# 5. Check report
start test-results/healer-report-*.html
```

### Example 2: Continuous Integration
```bash
# In CI/CD pipeline:
npm test
node gemini-healer.js --auto-fix

# Generate artifact
mkdir -p artifacts
cp test-results/healer-report-*.html artifacts/
cp test-results/healer-error-report-*.json artifacts/
```

### Example 3: Specific Test Healing
```bash
# Run single test
npx playwright test tests/specific-test.spec.ts

# Heal that specific test
node gemini-healer.js specific-test.spec.ts --auto-fix -v

# Review result
start test-results/healer-report-*.html
```

---

## 📊 Understanding Results

### Success Indicators
✅ **Fixed & Verified** - Test passes after fix (best outcome)
⚠️ **Fixed (Unverified)** - Fix applied but test not re-run
❌ **Not Fixed** - Fix not generated or test failed after fix

### Metrics
- **Tests Analyzed**: Total failing tests processed
- **Tests Fixed**: Fixes applied and validated
- **Tests Verified**: Fixes confirmed by re-running tests
- **Success Rate**: Verified / Total × 100%

---

## 🚪 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - all checks passed |
| 1 | Failure - configuration/environment error |
| 2 | Failure - API error or timeout |

---

## 📖 Next Steps

1. **Read DOCUMENTATION_INDEX.md** - Overview of all features
2. **Read QUICK_REFERENCE.md** - Quick lookup guide
3. **Check HTML Report** - See actual healing results
4. **Review Audit Log** - Track changes made
5. **Monitor Test Suite** - Ensure all tests pass

---

## 💡 Tips & Tricks

### Tip 1: Faster Healing
Use shorter timeout for faster iterations:
```bash
HEALER_API_TIMEOUT=30000 node gemini-healer.js --auto-fix
```

### Tip 2: Test a Single File
```bash
node gemini-healer.js specific-test.spec.ts --auto-fix
```

### Tip 3: Keep Verbose Logs
Save output for analysis:
```bash
node gemini-healer.js --auto-fix -v > healing-session.log 2>&1
```

### Tip 4: Compare Before/After
```bash
# Check backup
cat .healer-backups/test-file.spec.ts.{timestamp}.bak

# Compare with current
diff .healer-backups/test-file.spec.ts.{timestamp}.bak tests/test-file.spec.ts
```

### Tip 5: Disable Auto-Fix for Review
```bash
# First: Analyze only
node gemini-healer.js -v

# Review output and HTML report
# Then: Apply fixes
node gemini-healer.js --auto-fix
```

---

## 📞 Support & Resources

- **Google Generative AI**: https://ai.google.dev/
- **Playwright Docs**: https://playwright.dev/
- **API Key**: https://makersuite.google.com/app/apikey
- **Issues**: Check `.healer-audit.log` for action history

---

## 📋 Checklist for First Run

- [ ] Node.js installed (v14+)
- [ ] Playwright tests set up
- [ ] Gemini API key obtained
- [ ] `.env` file created with API key
- [ ] `npm install` completed
- [ ] `npm test` runs successfully
- [ ] `test-results/results.json` exists
- [ ] Read this guide
- [ ] Run `node gemini-healer.js --help`
- [ ] Run first healing: `node gemini-healer.js --auto-fix -v`
- [ ] Review HTML report
- [ ] Check `.healer-audit.log`

---

**Happy Healing! 🚀**
