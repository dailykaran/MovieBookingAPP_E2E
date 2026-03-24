# Quick Start: Self-Healing E2E Tests

## TL;DR - What Was Fixed

**Problem**: Patches failed with "Original string not found"
- **Cause**: No real test context was captured
- **Solution**: Script now runs tests first to capture real failures

**Before vs After**:
```
BEFORE: Fake error → Gemini guesses → Patches fail ❌
AFTER:  Real error → Gemini analyzes → Patches work ✅
```

---

## Fast Setup

```bash
# Terminal 1: Backend (port 5000)
cd movieapp/backend && npm run dev

# Terminal 2: Frontend (port 3000)
cd movieapp/frontend && npm start

# Terminal 3: Manual Healing
cd e2e
node src/manual-heal.js tests/gemini-pro-demo.spec.ts "should display movie list with cards"
```

---

## What Each Tool Does

### Playwright Traces
- **INPUT**: Failure context (screenshots, DOM, errors)
- **Purpose**: Help AI understand what went wrong
- **NOT output files** - they inform the analysis

### Gemini AI
- **INPUT**: Error message + stack trace from real test run
- **OUTPUT**: Suggested code patches with confidence scores
- **Process**: Analyzes failure → suggests fixes

### Patch Applicator
- **INPUT**: Patches from Gemini
- **OUTPUT**: Applied code fixes
- **Strategy**: 6 different matching approaches to handle variations

---

## Patch Matching Strategies (6 Total)

When a patch doesn't match exactly:

1. **Exact match** - Direct string comparison
2. **Fuzzy trim** - Trim whitespace and match
3. **Normalize** - Remove all formatting, match core
4. **Remove async** - Try without await keywords
5. **Partial match** - Find key parts of the line
6. **Semantic** - Case-insensitive keyword matching

This handles variations in how Gemini generates patches vs. actual code.

---

## Example Healing Flow

```
Input: 
  node src/manual-heal.js tests/my-test.spec.ts "test name"

↓ Step 1: Run Test
  [2026-03-22 22:15:00] info: Running test: test name

↓ Step 2: Capture Error (if failed)
  [2026-03-22 22:15:10] ✗ Test failed: Button not found

↓ Step 3: Send to Gemini
  [2026-03-22 22:15:15] Dispatching to Gemini with error context

↓ Step 4: Get AI Suggestions
  [2026-03-22 22:15:25] Gemini response: 1 patch (confidence: 0.85)

↓ Step 5: Apply Patch
  [2026-03-22 22:15:26] Patch applied using strategy 3 (normalize)

↓ Step 6: Validate
  [2026-03-22 22:15:35] ✓ Test now passes!

Exit Code: 0 (Success)
```

---

## Troubleshooting

### "Test failed" but patch wasn't applied?
- Patch confidence too low (needs manual review)
- Check the healing logs for confidence score
- Patches with <0.50 confidence require approval

### Patch still didn't match?
- One of 6 strategies should handle it
- If not, there's a mismatch in code logic
- Manually review the suggested patch
- Update test file accordingly

### Environment variables not loading?
- Check `.env` exists in `e2e/` directory
- Verify `GCP_PROJECT_ID=self-healing-vertex-ai`
- Check credentials file exists

---

## Key Changes Made

### `src/manual-heal.js`
✅ Now runs test first
✅ Captures real error messages
✅ Passes context to Gemini
✅ Cleaner, simpler code

### `src/patch-applicator.js`
✅ 6 matching strategies (was 4)
✅ More robust matching
✅ Better error handling

### Documentation
✅ `SELF_HEALING_GUIDE.md` - Complete guide
✅ `PATCH_FIX_SUMMARY.md` - Detailed fix explanation

---

## Common Commands

```bash
# Manual healing for a test
node src/manual-heal.js tests/gemini-pro-demo.spec.ts "should display movie list with cards"

# View test results
cat test-results/.last-run.json

# Check patches applied
ls artifacts/patches/

# Run all tests with healing
npm test
```

---

## Why This Works Now

1. **Real Context**: Tests actually run and capture failures
2. **Smart AI**: Gemini gets real error data to analyze
3. **Robust Matching**: 6 strategies handle code variations
4. **Automatic Validation**: Patches improve test via re-run

---

## Next: Try It Out

```bash
cd e2e
node src/manual-heal.js tests/gemini-pro-demo.spec.ts "should display movie list with cards"
```

Watch as the system:
- Runs the test
- Captures any failures
- Analyzes with Gemini
- Applies patches
- Validates the fix

Enjoy automated test healing! 🚀
