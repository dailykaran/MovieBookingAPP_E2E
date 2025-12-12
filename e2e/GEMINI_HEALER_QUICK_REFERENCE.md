# Gemini Healer - Quick Reference Guide

## 📋 Quick Start

```bash
# 1. Run tests to generate results
npm test

# 2. Heal with auto-fix
npm run heal:gemini:auto

# 3. Check HTML report
test-results/healer-report-*.html
```

---

## 🎯 Command Reference

### Basic Commands

```bash
# Analyze only (no changes)
npm run heal:gemini

# Analyze and auto-fix
npm run heal:gemini:auto

# With verbose output
npm run heal:gemini:auto -- --verbose

# Specific test file
npm run heal:gemini:auto -- localhost-3000

# Show help
node gemini-healer.js --help
```

### Direct Node Execution

```bash
# All variations
node gemini-healer.js                          # Analyze only
node gemini-healer.js --auto-fix               # Auto-fix all
node gemini-healer.js --auto-fix --verbose     # Verbose output
node gemini-healer.js --auto-fix localhost     # Specific file
node gemini-healer.js -a -v                    # Short flags
```

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Required
GEMINI_API_KEY=your_api_key_here

# Optional (defaults to false)
HEALER_AUTO_FIX=true       # Enable auto-fix by default
HEALER_VERBOSE=true        # Enable verbose output
```

### CLI Flags

| Flag | Short | Purpose |
|------|-------|---------|
| `--auto-fix` | `-a` | Apply fixes automatically |
| `--verbose` | `-v` | Show detailed debug output |
| `--help` | `-h` | Display help message |

---

## 📊 Workflow

### Step-by-Step Process

```
1. RUN TESTS
   └─→ npm test
       └─→ Creates: test-results/results.json

2. PARSE FAILURES
   └─→ gem-healer.js reads results.json
       └─→ Extracts failed tests

3. ANALYZE WITH AI
   └─→ For each test:
       ├─→ Read test file
       ├─→ Call Gemini API
       └─→ Get analysis + fixes

4. APPLY FIXES
   └─→ Extract code from response
       ├─→ Validate safety checks
       └─→ Write to test file

5. VERIFY FIXES
   └─→ Run test again
       └─→ Check if passing

6. GENERATE REPORT
   └─→ Create HTML report
       └─→ test-results/healer-report-*.html

7. DISPLAY SUMMARY
   └─→ Show statistics
```

---

## 📁 File Locations

### Input Files
- `test-results/results.json` - Test results (created by npm test)
- `tests/*.spec.ts` - Test files to be healed

### Output Files
- `test-results/healer-report-{timestamp}.html` - HTML report
- `tests/*.spec.ts` - Modified test files (if auto-fix enabled)

### Config Files
- `.env` - Environment variables
- `playwright.config.ts` - Playwright configuration

---

## ✅ Safety Features

### Multi-Layer Validation

```
Layer 1: Code Extraction
└─→ Find ALL code blocks, use LAST one
    └─→ Prevents grabbing wrong example code

Layer 2: Code Validation
└─→ Check for required patterns (import, test, expect)
    └─→ Prevent writing invalid code

Layer 3: Markdown Detection
└─→ Reject analysis text with markdown
    └─→ Prevent file corruption

Layer 4: Completeness Check
└─→ Warn about incomplete code
    └─→ Alert to potential issues

Layer 5: Verification
└─→ Run test after fix
    └─→ Confirm fix actually works
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Missing API Key
```
Error: GEMINI_API_KEY environment variable is not set

Fix:
$env:GEMINI_API_KEY = "your_key_here"
# or
echo "GEMINI_API_KEY=your_key_here" > .env
```

### Issue 2: No Test Results
```
Error: No test results found

Fix:
npm test  # Generate results first
npm run heal:gemini:auto
```

### Issue 3: Code Extraction Failed
```
Error: Could not extract fixed code from Gemini response

Fix:
npm run heal:gemini:auto -- --verbose  # See full response
# or try again (API sometimes times out)
npm run heal:gemini:auto
```

### Issue 4: Test Still Failing After Fix
```
Message: Test still failing after fix. May need manual review.

Possible causes:
- Gemini suggested incorrect fix
- Test requires more specific changes
- Test has data dependencies

Solution:
1. Check HTML report for analysis
2. Manually review and fix
3. Run tests again
```

---

## 📊 Expected Output

### Successful Healing

```
╔═══════════════════════════════════════════════════════════════════════╗
║    🔧 Gemini-Powered Playwright Test Healer                            ║
║       Intelligent Test Analysis & Automated Fixing                     ║
╚═══════════════════════════════════════════════════════════════════════╝

⚙️  Configuration:
   Auto-Fix: ✅ Enabled
   Verbose: ❌ Disabled
   API Key: ✅ Configured

📊 Analyzing test failures...

✅ No failing tests found! All tests are passing.
```

### With Failing Tests (Manual Mode)

```
Found 1 failing test(s):

1. localhost-3000.spec.ts › Load localhost:3000...
   Error Type: timeout
   Error: Error: expect(locator).toBeVisible()...

═══════════════════════════════════════════════════════════════════
🔍 Healing: localhost-3000.spec.ts
   Test: Load localhost:3000...
   Type: timeout
═══════════════════════════════════════════════════════════════════
📡 Sending to Gemini API for analysis...

📋 Analysis Results:
═══════════════════════════════════════════════════════════════════
[Gemini's detailed analysis...]
═══════════════════════════════════════════════════════════════════

✅ Fixed code extracted successfully

⏸️  Auto-fix is disabled.
   Review the analysis above and apply fixes manually...
```

### With Auto-Fix

```
🔧 Applying fixes...
✅ Test file updated with fixes
🧪 Re-running test to verify fix...
✅ Test verification shows passing
✅ Test passed after healing!

═══════════════════════════════════════════════════════════════════
✅ Healing session complete!
═══════════════════════════════════════════════════════════════════

📊 Summary:
   Total Tests: 1
   Fixed: 1
   Verified: 1
   Success Rate: 100%
   Duration: 45s

📊 HTML Report generated: test-results/healer-report-2025-12-12...html
```

---

## 📈 Performance

### Timing Expectations

| Operation | Time |
|-----------|------|
| Per test analysis | 15-30s |
| Code extraction | < 1s |
| Apply fixes | < 1s |
| Verify (run test) | 10-20s |
| Report generation | < 1s |
| **Total per test** | **30-50s** |

### Examples

- 1 failing test: 30-50 seconds
- 2 failing tests: 60-100 seconds
- 3 failing tests: 90-150 seconds

---

## 💡 Best Practices

### Before Healing

```bash
# 1. Ensure all dependencies installed
npm ci
npm install

# 2. Run tests to see what's failing
npm test

# 3. Check API key is valid
echo $env:GEMINI_API_KEY
```

### During Healing

```bash
# 1. Use auto-fix for efficiency
npm run heal:gemini:auto

# 2. Use verbose for debugging
npm run heal:gemini:auto -- --verbose

# 3. Check HTML report
test-results/healer-report-*.html
```

### After Healing

```bash
# 1. Run tests to confirm
npm test

# 2. Review changes
git diff tests/

# 3. Commit if satisfied
git add tests/
git commit -m "Tests fixed by Gemini healer"
```

---

## 🎓 Understanding the Report

### HTML Report Structure

```
┌─ Header ─────────────────────────────┐
│  Gemini Healer Report                │
│  Automated Test Healing Session       │
├─ Summary Cards ──────────────────────┤
│ Tests | Fixed | Verified | Success % │
├─ Test Results ───────────────────────┤
│ For each test:                        │
│  ├─ Status Badge                      │
│  ├─ Alignment Flow (Error→Fix)        │
│  ├─ Error Details                     │
│  ├─ Gemini Analysis                   │
│  └─ Applied Fix                       │
├─ Summary Section ────────────────────┤
│  Duration, counts, timestamp          │
└─ Footer ────────────────────────────┘
```

### Alignment Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ ❌ Error     │ →   │ 🤖 Analysis  │ →   │ ✅ Fix       │
│ (200 chars)  │     │ (200 chars)  │     │ Status       │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Status Badges

```
✅ FIXED & VERIFIED       - Error resolved, test passes
⚠️ FIXED (UNVERIFIED)     - Fix applied, but test still fails
❌ NOT FIXED              - Fix not applied
```

---

## 🔍 Debugging Tips

### Enable Verbose Output

```bash
npm run heal:gemini:auto -- --verbose

# Shows:
# - Full Gemini response
# - Test output
# - Extraction details
# - Verification results
```

### Check HTML Report

```bash
# Open in browser
start test-results/healer-report-*.html

# Look for:
# - Error details
# - Gemini analysis
# - Suggested fix
# - Verification status
```

### Manual Test Run

```bash
# Run specific test
npm test -- tests/localhost-3000.spec.ts

# See actual vs expected behavior
```

---

## 📝 Files Modified by Healer

### After Running gemini-healer.js

- ✅ `tests/*.spec.ts` - Modified if auto-fix enabled
- ✅ `test-results/healer-report-*.html` - New report created
- ❌ No other files modified

### Recovery

```bash
# If something goes wrong
git checkout tests/  # Restore from git
npm test             # Re-run tests
```

---

## 🚀 Advanced Usage

### Healing Specific Test

```bash
npm run heal:gemini:auto -- localhost-3000

# Only heals tests matching "localhost-3000"
```

### Dry Run (Analysis Only)

```bash
npm run heal:gemini

# Shows analysis and suggested fix
# No files modified
```

### Full Debug Mode

```bash
npm run heal:gemini:auto -- --verbose

# Shows:
# - Current test code
# - Full Gemini response
# - Test verification output
# - Pass/fail counts
```

---

## 📞 Getting Help

### Check Documentation

- Full guide: `GEMINI_HEALER_COMPREHENSIVE_GUIDE.md`
- File overview: `HEALER_FILE_OVERWRITE_FIX.md`
- Verification fix: `VERIFICATION_FIX_DETAILS.md`

### Run Help Command

```bash
node gemini-healer.js --help
```

### Check Logs

```bash
npm run heal:gemini:auto -- --verbose 2>&1 | Tee-Object -FilePath debug.log
```

---

## 📊 Statistics

### Files

- `gemini-healer.js` - 569 lines (main orchestrator)
- `healer-report-generator.js` - 290+ lines (HTML generation)
- `GEMINI_HEALER_COMPREHENSIVE_GUIDE.md` - 908 lines (full docs)

### Features

- 12 core functions (gemini-healer.js)
- 2 core functions (healer-report-generator.js)
- 5 safety layers
- 4 error types
- Multiple detail levels in reports

---

## ✨ Summary

**Quick Commands:**
```bash
npm run heal:gemini:auto        # Fix all tests
npm run heal:gemini             # Analyze only
npm run heal:gemini:auto -v     # Verbose mode
```

**Key Points:**
- ✅ Fully automated test healing
- ✅ AI-powered analysis (Gemini 2.5)
- ✅ Multiple safety layers
- ✅ Professional HTML reports
- ✅ ~30-50s per failing test

**Get Started:**
```bash
npm test                  # Generate results
npm run heal:gemini:auto  # Auto-fix all
```
