# Gemini Healer - Quick Reference

## ⚡ Command Syntax

### Basic Commands
```bash
# Analyze failing tests (no auto-fix)
node gemini-healer.js

# Analyze and apply fixes
node gemini-healer.js --auto-fix

# Verbose logging
node gemini-healer.js --auto-fix -v

# Analyze specific test file
node gemini-healer.js localhost-3000.spec.ts --auto-fix

# Show help
node gemini-healer.js --help
```

### Combined Options
```bash
# All features enabled
node gemini-healer.js --auto-fix --verbose

# Short form
node gemini-healer.js -a -v

# Specific file with verbose
node gemini-healer.js specific-test.spec.ts --auto-fix -v
```

---

## 🔧 Environment Variables

### Essential
```bash
GEMINI_API_KEY=your-api-key-here
```

### Behavior
```bash
HEALER_AUTO_FIX=true              # Auto-apply fixes
HEALER_VERBOSE=true               # Debug logging
```

### Timeouts & Limits
```bash
HEALER_MAX_RETRIES=3              # Retry attempts
HEALER_API_TIMEOUT=60000          # 60 second timeout
HEALER_API_RATE_LIMIT=5           # 5 calls per minute
HEALER_MAX_FILE_SIZE=1048576      # 1MB max file size
```

### Storage
```bash
HEALER_BACKUP_DIR=.healer-backups
HEALER_AUDIT_LOG=.healer-audit.log
BACKUP_RETENTION_DAYS=7
MAX_BACKUPS_PER_FILE=5
```

### Example .env
```bash
GEMINI_API_KEY=AIzaSyD...
HEALER_AUTO_FIX=true
HEALER_VERBOSE=false
HEALER_MAX_RETRIES=3
HEALER_API_TIMEOUT=60000
HEALER_API_RATE_LIMIT=5
BACKUP_RETENTION_DAYS=7
```

---

## 📁 File Locations

### Configuration
```
.env                    API key and settings
.env.example           Template (copy to .env)
playwright.config.ts   Playwright setup
```

### Generated Reports
```
test-results/healer-report-{timestamp}.html       Main HTML report
test-results/healer-error-report-{timestamp}.json Error details
test-results/results.json                          Test results
.healer-audit.log                                  All operations
```

### Backups
```
.healer-backups/{filename}.{timestamp}.bak   Backup files
```

### Source Code
```
gemini-healer.js              Main healing engine
healer-report-generator.js    Report generation
package.json                  Dependencies
```

---

## 🔄 Setup Steps

```bash
# 1. Navigate to e2e directory
cd e2e

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Or create manually and add:
# GEMINI_API_KEY=your-key-here

# 4. Run tests
npm test

# 5. Run healer
node gemini-healer.js --auto-fix -v

# 6. View report (Windows)
start test-results/healer-report-*.html
```

---

## 📊 Status Badges

| Badge | Meaning | Status |
|-------|---------|--------|
| ✅ FIXED & VERIFIED | Test passes after fix | Success |
| ⚠️ FIXED (UNVERIFIED) | Fix applied, not verified | Warning |
| ❌ NOT FIXED | Fix not applied | Failed |

---

## 📈 Metrics

### From HTML Report
- **Tests Analyzed**: Total failing tests
- **Tests Fixed**: Fixes applied
- **Tests Verified**: Fixes confirmed working
- **Success Rate**: Verified / Total × 100%

---

## 🔐 Security Checks

### Automatic Security Validations
- ✅ Path traversal prevention
- ✅ Symbolic link blocking
- ✅ File size limits
- ✅ Dangerous pattern scanning
- ✅ Code syntax validation
- ✅ HTML escaping (XSS prevention)

### Dangerous Patterns Detected
```
❌ fs.rm, fs.unlink, execSync
❌ process.exit, child_process
❌ eval(), new Function()
❌ require(), import() (dynamic)
❌ imports: fs, os, child_process
```

### Required Code Patterns
```
✅ test() or it() function
✅ expect() assertions
✅ import statements
```

---

## ❌ Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Configuration/environment error |

---

## 🐛 Error Codes & Messages

### API Errors
```
"GEMINI_API_KEY format appears invalid"
→ Check API key format and get new one

"Gemini API timeout after 60000ms"
→ Increase HEALER_API_TIMEOUT in .env

"Rate limit reached"
→ Reduce HEALER_API_RATE_LIMIT or wait
```

### File Errors
```
"Path traversal detected"
→ Use relative paths only

"File exceeds max size"
→ Increase HEALER_MAX_FILE_SIZE

"Cannot read symbolic links"
→ Use regular files, not symlinks
```

### Validation Errors
```
"Mismatched braces/parentheses"
→ Check generated code syntax

"No test function found"
→ Ensure test() or it() in code

"No import statements"
→ Add required imports to code
```

---

## 🎯 Error Types (Auto-Classified)

| Type | Healing |
|------|---------|
| `timeout` | ✅ Yes |
| `strict_mode` | ✅ Yes |
| `assertion` | ✅ Yes |
| `not_found` | ✅ Yes |
| `network error` | ❌ Skip |
| `infrastructure` | ❌ Skip |
| `configuration` | ❌ Skip |

---

## 💡 Common Tasks

### Task: Heal All Failing Tests
```bash
npm test
node gemini-healer.js --auto-fix -v
start test-results/healer-report-*.html
```

### Task: Review Before Fixing
```bash
node gemini-healer.js -v
# Review output, then:
node gemini-healer.js --auto-fix
```

### Task: Heal Specific Test
```bash
node gemini-healer.js specific-test.spec.ts --auto-fix
```

### Task: Check What Changed
```bash
cat .healer-audit.log
# Or view specific test backup:
cat .healer-backups/test-file.spec.ts.*.bak
```

### Task: Restore from Backup
```bash
# Find backup file
ls .healer-backups/

# Copy it back
cp .healer-backups/test-file.spec.ts.{timestamp}.bak tests/test-file.spec.ts
```

### Task: Clean Old Backups
```bash
# Automatic cleanup runs on each heal
# Manual cleanup:
rm .healer-backups/*
```

---

## 📋 Troubleshooting Checklist

**Issue: API key not working**
- [ ] .env file created
- [ ] API key pasted correctly
- [ ] No spaces around = sign
- [ ] Key is still valid (check dashboard)

**Issue: Test verification fails**
- [ ] Increase timeout: HEALER_API_TIMEOUT=120000
- [ ] Check test is not infrastructure-dependent
- [ ] Run test manually: npx playwright test tests/...
- [ ] Review HTML report for AI analysis

**Issue: Rate limit errors**
- [ ] Reduce HEALER_API_RATE_LIMIT=3
- [ ] Wait before running again
- [ ] Check API dashboard for quota

**Issue: No failing tests found**
- [ ] Run tests first: npm test
- [ ] Check test-results/results.json exists
- [ ] Run healer: node gemini-healer.js

**Issue: File size exceeded**
- [ ] Increase HEALER_MAX_FILE_SIZE=2097152
- [ ] Or split large test files

---

## 🔍 Debugging Tips

### Enable Verbose Mode
```bash
node gemini-healer.js --auto-fix -v > debug.log 2>&1
```

### Check Audit Log
```bash
# View last 20 operations
tail -20 .healer-audit.log

# View all FILE_MODIFIED operations
grep FILE_MODIFIED .healer-audit.log
```

### Compare Before/After
```bash
# Get backup timestamp
ls .healer-backups/

# Compare files
diff .healer-backups/test-file.spec.ts.{timestamp}.bak tests/test-file.spec.ts
```

### Check Error Report
```bash
cat test-results/healer-error-report-*.json
```

### View HTML Report Directly
```bash
# Windows
start test-results/healer-report-*.html

# macOS
open test-results/healer-report-*.html

# Linux
xdg-open test-results/healer-report-*.html
```

---

## 📚 Configuration Presets

### Conservative (Safe, Slow)
```bash
HEALER_MAX_RETRIES=5
HEALER_API_TIMEOUT=120000
HEALER_API_RATE_LIMIT=2
BACKUP_RETENTION_DAYS=14
MAX_BACKUPS_PER_FILE=10
```

### Balanced (Recommended)
```bash
HEALER_MAX_RETRIES=3
HEALER_API_TIMEOUT=60000
HEALER_API_RATE_LIMIT=5
BACKUP_RETENTION_DAYS=7
MAX_BACKUPS_PER_FILE=5
```

### Aggressive (Fast, Bold)
```bash
HEALER_MAX_RETRIES=1
HEALER_API_TIMEOUT=30000
HEALER_API_RATE_LIMIT=10
BACKUP_RETENTION_DAYS=3
MAX_BACKUPS_PER_FILE=2
```

---

## 🎨 Report Structure

### HTML Report Sections
```
Header
  ✨ Self Healer report by Gemini
  Automated Test Analysis & Fixing Session

Summary Cards (4 columns)
  Tests Analyzed  | Tests Fixed | Tests Verified | Success Rate %

Test Results (Grouped by Suite)
  Suite Name
    └─ Test Case 1
       ├─ Status Badge
       ├─ Error Details (expandable)
       ├─ AI Analysis (expandable)
       ├─ Applied Fix (expandable)
       └─ Verification Status

Session Summary
  Duration | Total Analyzed | Fixed | Verified | Success Rate | Timestamp

Footer
  Branding & timestamp
```

---

## 🎯 Expected Output

### Console Output (Verbose)
```
╔═══════════════════════════════════════════════════════════════════════╗
║    🔧 Gemini-Powered Playwright Test Healer - Enhanced Edition         ║
║       Intelligent Test Analysis & Automated Fixing                     ║
╚═══════════════════════════════════════════════════════════════════════╝

✅ All environment checks passed

⚙️  Configuration:
   Auto-Fix: ✅ Enabled
   Verbose: ✅ Enabled
   API Key: ✅ Configured

📊 Analyzing test failures...

Found 2 failing test(s):

  1. localhost-3000.spec.ts › Load product details
     Error Type: timeout
     Error: Timeout waiting for element...

  2. localhost-3000.spec.ts › Add to cart
     Error Type: assertion
     Error: expect(value).toBe(expected)...

═══════════════════════════════════════════════════════════════════════
🔍 Healing: localhost-3000.spec.ts
   Test: Load product details
   Type: timeout
═══════════════════════════════════════════════════════════════════════

📡 Sending to Gemini API for analysis...

📋 ANALYSIS FOR: Load product details
═══════════════════════════════════════════════════════════════════════
...analysis output...
═══════════════════════════════════════════════════════════════════════

✅ Fixed code extracted successfully

✅ FIXED CODE FOR: Load product details
═══════════════════════════════════════════════════════════════════════
...code output with syntax highlighting...
═══════════════════════════════════════════════════════════════════════

🔧 Applying fixes...
✅ Test file updated with fixes
🧪 Re-running test to verify fix...
✅ Test verification shows passing
✅ Test passed after healing!

[Repeat for each test...]

╔═══════════════════════════════════════════════════════════════════════╗
╚═══════════════════════════════════════════════════════════════════════╝

📊 HEALING SESSION SUMMARY
═════════════════════════════════════════════════════════════════════════

📊 Tests Analyzed          : 2
✅ Fixed                   : 2
🔍 Verified                : 2
🎯 Success Rate            : 100%

⏱️  Duration: 45s

═════════════════════════════════════════════════════════════════════════

📋 DETAILED RESULTS (2 tests):

[ 1] ✅ FIXED & VERIFIED    | localhost-3000.spec.ts › Load product details
[ 2] ✅ FIXED & VERIFIED    | localhost-3000.spec.ts › Add to cart

✅ Healing session complete!
📊 HTML Report generated: test-results/healer-report-2026-01-02T18-45-30-123Z.html
📄 Error report saved: test-results/healer-error-report-1704201930123.json
```

---

## 🚀 Performance Tips

### Faster Execution
```bash
# Reduce timeout for faster iterations
HEALER_API_TIMEOUT=30000 node gemini-healer.js --auto-fix

# Reduce retries
HEALER_MAX_RETRIES=1 node gemini-healer.js --auto-fix

# Target specific test
node gemini-healer.js specific-test.spec.ts --auto-fix
```

### Lower API Cost
```bash
# Increase rate limit interval
HEALER_API_RATE_LIMIT=3 node gemini-healer.js --auto-fix

# Heal one test at a time
node gemini-healer.js test1.spec.ts --auto-fix
# Wait, then:
node gemini-healer.js test2.spec.ts --auto-fix
```

---

## 📞 Getting Help

### Check Logs
```bash
# Audit log
cat .healer-audit.log

# Error report
cat test-results/healer-error-report-*.json

# Full output
node gemini-healer.js --auto-fix -v > session.log 2>&1
cat session.log
```

### Reset & Retry
```bash
# Remove old backups (keep current code safe!)
rm .healer-backups/*

# Clear audit log
rm .healer-audit.log

# Try again
npm test
node gemini-healer.js --auto-fix -v
```

---

## ✅ Pre-Run Checklist

- [ ] Node.js installed (v14+)
- [ ] `npm install` completed
- [ ] `.env` file created
- [ ] GEMINI_API_KEY set correctly
- [ ] `npm test` runs successfully
- [ ] `test-results/results.json` exists
- [ ] Read GEMINI_HEALER_GUIDE.md
- [ ] Ready to run!

---

## 🎓 Learning Resources

**Official Docs:**
- Google AI: https://ai.google.dev/
- Playwright: https://playwright.dev/
- API Key: https://makersuite.google.com/app/apikey

**Code Explanation:**
- Read: CODE_EXPLANATION.md
- Deep dive into implementation

**Complete Guide:**
- Read: GEMINI_HEALER_GUIDE.md
- Comprehensive user guide

---

## 📝 Examples

### Example 1: First Time Setup
```bash
cd e2e
npm install
echo "GEMINI_API_KEY=your-key" > .env
npm test
node gemini-healer.js --auto-fix -v
start test-results/healer-report-*.html
```

### Example 2: CI/CD Pipeline
```bash
npm test
node gemini-healer.js --auto-fix
cp test-results/healer-report-*.html artifacts/report.html
```

### Example 3: Quick Healing
```bash
node gemini-healer.js --auto-fix && \
  start test-results/healer-report-*.html
```

---

## 🔗 Command Quick Copy

```bash
# Analyze only (safest)
node gemini-healer.js -v

# Analyze with fixes
node gemini-healer.js --auto-fix -v

# Specific test
node gemini-healer.js localhost-3000.spec.ts --auto-fix -v

# Create env file
cp .env.example .env

# View report (Windows)
start test-results/healer-report-*.html

# View backups
ls .healer-backups/

# Check operations
tail -20 .healer-audit.log

# Run tests first
npm test

# Install deps
npm install
```

---

**Quick Reference v1.0**  
**Last Updated:** January 2, 2026  
**For Complete Guide:** See GEMINI_HEALER_GUIDE.md
