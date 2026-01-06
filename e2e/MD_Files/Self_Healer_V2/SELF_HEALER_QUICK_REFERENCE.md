# Self-Healer Quick Reference Card

## 🚀 Quick Start (5 minutes)

### Installation
```bash
cd e2e
npm install
npx playwright install --with-deps
```

### Configure .env
```env
GEMINI_API_KEY=AIzaSy...  # Get from https://aistudio.google.com/app/apikeys
HEALER_AUTO_FIX=true
HEALER_VERBOSE=true
```

### Run Healer
```bash
# Analyze failures (no changes)
npm run heal:gemini

# Auto-fix and verify
npm run heal:gemini:auto

# View report
open test-results/healer-report-*.html
```

---

## 📋 Command Reference

| Command | Purpose | Output |
|---------|---------|--------|
| `npm test` | Run Playwright tests | `test-results/results.json` |
| `npm run heal:gemini` | Analyze failures with AI | Console + HTML report |
| `npm run heal:gemini:auto` | Auto-fix + verify fixes | Console + HTML report + fixed tests |
| `npm run heal:gemini:verbose` | Same as auto-fix with debug info | Detailed logs |
| `npx playwright show-report` | View test execution report | Browser opens report |

---

## 🔑 Key Concepts

### The Healing Process
```
1. Failing Test
   ↓
2. Extract Error Message
   ↓
3. Sanitize for Safety
   ↓
4. Send to Gemini API
   ↓
5. Get AI Analysis + Fix
   ↓
6. Validate Generated Code
   ↓
7. Create Backup
   ↓
8. Apply Fix to Test File
   ↓
9. Re-run Test
   ↓
10. Report Result (✅ Fixed or ❌ Failed)
```

### Three Outcomes per Test

| Outcome | Badge | Meaning |
|---------|-------|---------|
| ✅ FIXED & VERIFIED | 🟢 Green | Test passed after fix applied |
| ⚠️ FIXED (UNVERIFIED) | 🟡 Yellow | Fix applied but test still fails |
| ❌ NOT FIXED | 🔴 Red | AI couldn't generate valid fix |

---

## 🔒 Security Assurances

✅ **PII Removed**: Paths, emails, IPs sanitized before API call  
✅ **No Dangerous Code**: Generated code validated for `fs.`, `exec`, `eval`  
✅ **Injection Protected**: Known prompt injection patterns detected  
✅ **Backups Created**: Original test file backed up before changes  
✅ **Rollback Ready**: Failed fixes rolled back automatically  
✅ **Audit Trail**: All operations logged  

---

## ⚙️ Configuration Cheat Sheet

```env
# REQUIRED
GEMINI_API_KEY=...

# OPTIONAL - Behavior
HEALER_AUTO_FIX=true              # Auto-apply fixes
HEALER_VERBOSE=true               # Debug output
HEALER_MAX_RETRIES=3              # Retry failed API calls
HEALER_API_TIMEOUT=60000          # API timeout (ms)
HEALER_API_RATE_LIMIT=5           # Max calls/min

# OPTIONAL - Storage
BACKUP_RETENTION_DAYS=7           # Keep backups 7 days
MAX_BACKUPS_PER_FILE=5            # Max 5 backups per file

# OPTIONAL - Limits
HEALER_MAX_FILE_SIZE=1048576      # Max 1MB files
```

### Recommended Settings
```env
# Development
HEALER_AUTO_FIX=true
HEALER_VERBOSE=true
HEALER_MAX_RETRIES=5

# CI/CD
HEALER_AUTO_FIX=true
HEALER_VERBOSE=false
HEALER_API_RATE_LIMIT=10
```

---

## 📊 Performance Stats

| Metric | Value | Notes |
|--------|-------|-------|
| Time per test | 5-10s | Includes API call + verification |
| API cost per test | $0.001-$0.005 | Very cheap (Gemini Flash) |
| Session time (8 tests) | 1-2 min | Includes pre-flight checks |
| Typical success rate | 70-80% | Depends on error type |
| Backup disk usage | ~10MB | 5 backups × 8 tests × 250KB |

---

## 🐛 Troubleshooting Quick Fixes

### ❌ "GEMINI_API_KEY is not set"
```bash
# Check .env exists
ls -la e2e/.env

# Recreate if broken (file might be UTF-16)
echo "GEMINI_API_KEY=AIzaSy..." > e2e/.env
```

### ❌ "Missing required dependencies"
```bash
cd e2e
npm install
```

### ❌ "Timeout waiting for test"
The test takes >2 minutes. Either:
- Test is genuinely slow (increase timeout in healer code)
- Test hangs (fix the test manually)

### ❌ "Fix applied but test still fails"
Gemini generated incomplete fix. Options:
1. Review error in HTML report
2. Fix test manually
3. Try increasing HEALER_MAX_RETRIES

---

## ✅ When to Use Self-Healing

### ✅ Good Use Cases
```
Test Error: "locator '...button' not found"
→ DOM changed, Gemini can suggest new selector ✅

Test Error: "Timeout waiting for navigation"
→ Race condition, Gemini can add waitFor() ✅

Test Error: "Expected 'Active' but got 'Pending'"
→ Assertion outdated, Gemini can update it ✅
```

### ❌ Skip Healing (Infrastructure Issues)
```
Test Error: "Connection refused"
→ Server not running, can't fix in test ❌

Test Error: "ENOTFOUND api.example.com"
→ DNS issue, not test problem ❌

Test Error: "Certificate verification failed"
→ SSL issue, not test logic ❌
```

---

## 🎯 Success Tips

### Before Running Healer
1. ✅ Make sure backend is running (`npm run dev` in backend/)
2. ✅ Make sure frontend is running (`npm start` in frontend/)
3. ✅ Run tests once to generate results.json
4. ✅ Check .env has valid GEMINI_API_KEY

### After Healer Completes
1. 📊 Review HTML report: `open test-results/healer-report-*.html`
2. ✅ Verify fixed tests pass: `npm test`
3. 💾 Commit fixed test files: `git add tests/` && `git commit`
4. 📝 Document what was fixed

### Best Practices
- Run with `--verbose` first to understand what's happening
- Don't auto-fix immediately—review analysis first
- Keep 1 backup before committing changes
- Run full test suite after healing

---

## 📚 Documentation Files

| File | Purpose | Size |
|------|---------|------|
| `SELF_HEALER_DOCUMENTATION.md` | Complete guide (all details) | 33KB |
| `SELF_HEALER_SUMMARY.md` | This quick reference | 9KB |
| `gemini-healer.js` | Main healer script | 1508 lines |
| `healer-report-generator.js` | Report generation | 600+ lines |

**Start here**: `SELF_HEALER_DOCUMENTATION.md`

---

## 🔗 External Resources

- [Gemini API Docs](https://ai.google.dev)
- [Playwright Docs](https://playwright.dev)
- [Material-UI Testing](https://material-ui.com/guides/testing/)

---

## 📞 Support

**Issue**: Not in quick fix table?  
→ Read [SELF_HEALER_DOCUMENTATION.md](SELF_HEALER_DOCUMENTATION.md) Part 6: Troubleshooting

**Question**: How does X work?  
→ Search [SELF_HEALER_DOCUMENTATION.md](SELF_HEALER_DOCUMENTATION.md) for function name

**Security concern**: Is this safe?  
→ Read [SELF_HEALER_DOCUMENTATION.md](SELF_HEALER_DOCUMENTATION.md) Part 5: Security

---

## 🚀 Example Workflows

### Workflow 1: Analyze & Review (Safest)
```bash
npm run heal:gemini
# Review output
open test-results/healer-report-*.html
# Manually apply changes if satisfied
```

### Workflow 2: Auto-Fix All (Fastest)
```bash
npm run heal:gemini:auto
# Verify results
npx playwright show-report
```

### Workflow 3: Fix One Test File
```bash
npm run heal:gemini -- tests/MyTest.spec.ts --auto-fix
```

### Workflow 4: Debug Mode (Most Verbose)
```bash
npm run heal:gemini:verbose
# Shows every step
```

---

## ✨ Pro Tips

1. **First-time setup**: Run with `HEALER_VERBOSE=true` to see all details
2. **Batch processing**: Run healer before committing changes
3. **Cost optimization**: Use analyze-only mode to reduce API calls
4. **Performance**: Disable auto-fix if you just want analysis
5. **Reliability**: Keep backups for a week (`BACKUP_RETENTION_DAYS=7`)
6. **CI/CD**: Use `--auto-fix` in automation, not in local dev

---

**Last Updated**: January 5, 2026  
**Status**: ✅ Production Ready  
**Gemini Model**: gemini-1.5-flash  
**Supported**: Playwright 1.x with TypeScript tests
