# Self-Healing E2E Test System - Complete Guide

## Overview

The self-healing system uses Gemini AI (via Vertex AI) to automatically detect and fix failing tests. It captures test failures with full context (screenshots, DOM snapshots, error traces) and generates patches intelligently.

---

## Understanding Playwright Traces

### What Are Playwright Traces?

Playwright traces are **INPUT data** for analyzing test failures, not output. They contain:

- **Step-by-Step Execution**: Every action the test performed
- **Screenshots**: Visual snapshots at each step
- **DOM Snapshots**: The HTML/DOM state at critical moments
- **Network Requests**: All API calls made during the test
- **Console Logs**: Browser console output and errors

### How Traces Flow in Self-Healing

```
1. Test Runs & Fails
                ↓
2. Playwright Captures Trace File
                ↓
3. Manual-Heal Script Extracts:
   - Error message
   - Stack trace
   - Test output
                ↓
4. Gemini AI Receives Failure Context
                ↓
5. AI Generates Accurate Patches
                ↓
6. Patch Applicator Applies Fixes
                ↓
7. Test Re-runs to Validate
```

**Key Point**: Without traces and error context, Gemini generates patches based on assumptions, which often fail to match the actual code.

---

## Fixed Issues

### 1. **Patch Mismatch Problem (Now Fixed)**

**Before**: Patches failed with "Original string not found"
- Reason: No real test failure context
- Gemini generated patches blindly
- Patches didn't match actual code

**After**: 
- Manual-heal script **runs the test first**
- Captures **real error messages**
- Passes context to Gemini
- Patch applicator has **6 matching strategies**

### 2. **Manual-Heal Script Improvements**

**New Flow**:
```
node src/manual-heal.js <testFile> <testName>
    ↓
1. Runs test to capture failure
2. Parses JSON output for error details
3. Passes real context to orchestrator
4. Applies patches with AI suggestions
5. Re-runs test to validate fix
```

**Better Matching Strategies** (6 total):
1. Exact string match
2. Trimmed fuzzy match
3. Whitespace-normalized match
4. Remove async/await variations
5. Partial line matching
6. Case-insensitive semantic matching

### 3. **Removed Dead Code**

- Removed hardcoded npx paths (platform-specific)
- Removed unused imports (spawn cleanup)
- Simplified argument parsing
- Removed unnecessary async wrappers

---

## How to Use the Self-Healing System

### Method 1: Manual Healing (with Real Test Failure)

```bash
# Terminal 1: Start backend
cd movieapp/backend && npm run dev

# Terminal 2: Start frontend
cd movieapp/frontend && npm start

# Terminal 3: Run manual healing
cd e2e
node src/manual-heal.js tests/gemini-pro-demo.spec.ts "should display movie list with cards"
```

**What happens**:
1. Script runs the test
2. Captures error + stack trace
3. Sends context to Gemini
4. Gemini suggests fixes
5. Patches are applied
6. Test re-runs to validate

### Method 2: Automated E2E Test Healing

```bash
cd e2e
npm test  # Runs all tests with self-healing on failure
```

---

## Environment Setup

Ensure `.env` is configured:

```bash
# GCP Configuration
GCP_PROJECT_ID=self-healing-vertex-ai
GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./secrets/self-healing-vertex-ai-64a146d79b76.json

# Gemini Model
GEMINI_MODEL=gemini-2.5-pro
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.2
GEMINI_TOP_P=0.85
```

---

## Common Scenarios & Fixes

### Scenario 1: "Element not found" Error

**What Gemini Sees**:
- Before: `page.getByRole('button', { name: 'Book' })`
- After: Button doesn't exist at that selector

**What Gemini Generates**:
```javascript
// BEFORE
page.getByRole('button', { name: /Book/i })

// AFTER
page.getByRole('button', { name: /Book Now/i }).first()
// or
page.locator('[data-testid="book-btn"]')
```

### Scenario 2: "Element not visible" Error

**Fix Strategy**:
```javascript
// Add wait for visibility
await page.getByRole('button', { name: /Book/i }).waitFor({ state: 'visible' });
await page.getByRole('button', { name: /Book/i }).click();
```

### Scenario 3: Timing Issues

**Fix Strategy**:
```javascript
// Add explicit waits
await page.waitForLoadState('networkidle');
await page.getByRole('button', { name: /Book/i }).click();
```

---

## Healing Confidence Scores

Gemini assigns confidence scores to patches:

| Score | Meaning | Action |
|-------|---------|--------|
| 0.95+ | data-testid or aria-label found | Auto-apply |
| 0.85-0.94 | Role selector with exact match | Auto-apply |
| 0.70-0.84 | CSS class selector (stable) | Auto-apply |
| 0.50-0.69 | Fallback selector | Requires approval |
| <0.50 | No viable selector found | Requires approval |

---

## Troubleshooting

### Issue: "GCP_PROJECT_ID environment variable is not set"

**Fix**:
```bash
# Ensure .env file exists in e2e directory
echo "GCP_PROJECT_ID=self-healing-vertex-ai" >> .env
```

### Issue: "GOOGLE_APPLICATION_CREDENTIALS file not found"

**Fix**:
```bash
# Verify credentials file exists
ls -la ./secrets/self-healing-vertex-ai-64a146d79b76.json

# Update .env with correct path
GOOGLE_APPLICATION_CREDENTIALS=./secrets/self-healing-vertex-ai-64a146d79b76.json
```

### Issue: "Patch failed" Error

**Causes**:
1. Test file has been modified (patches outdated)
2. AI generated patch doesn't match code
3. Whitespace/indentation mismatch

**Fix**:
- Patch applicator now has 6 strategies
- If still failing, check the debug output
- Verify test file content manually

---

## Architecture Components

### `manual-heal.js`
- Entry point for manual healing
- Runs test → captures error → sends to orchestrator

### `orchestrator.js`
- Coordinates all healing stages
- Uses Gemini for AI analysis
- Manages patch application & validation

### `patch-applicator.js`
- Applies code patches to test files
- 6 matching strategies for robustness
- Backup & rollback capability

### `gemini-client.js`
- Wrapper around Vertex AI Gemini
- Handles API communication
- Manages credentials & config

---

## Next Steps

1. **Set up backend & frontend** (see README)
2. **Run failing tests** first to capture context
3. **Use manual-heal** to trigger AI healing
4. **Monitor patch application** via logs
5. **Review healed code** before committing

---

## Quick Reference

```bash
# Run manual healing
cd e2e
node src/manual-heal.js <testFile> <testName>

# View recent test results
cat test-results/.last-run.json

# Review patches applied
ls artifacts/patches/

# Check healing logs
tail -f [2026-03-22 ....] info logs
```

---

## Key Takeaways

✅ **Playwright traces are INPUT** for failure analysis  
✅ **Real test context** makes patches accurate  
✅ **6 matching strategies** handle code variations  
✅ **Manual healing** now captures test failures properly  
✅ **Patch applicator** is robust and resilient  

The self-healing system is now **production-ready** for automated test maintenance.
