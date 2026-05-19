# Gemini-Healer: Input Files for Error Analysis

## Overview

The `gemini-healer.js` script analyzes test failures using multiple input sources to provide intelligent test healing. This document explains what files are read, where they come from, and how they're used.

---

## Primary Input Files

### 1. **results.json** (PRIMARY ERROR SOURCE)
**Location**: `reports/results/results.json`  
**Created by**: Playwright test runs (`npm test`)  
**Format**: JSON (Playwright test results format)  
**Purpose**: Contains comprehensive test failure information

**What it contains**:
- Test suite metadata
- Test names and file paths
- Error messages and stack traces
- Test status (pass/fail)
- Error context and logs

**Example structure**:
```json
{
  "suites": [{
    "file": "tests/02_broken_link.spec.ts",
    "tests": [{
      "name": "should navigate to the correct movie detail page",
      "ok": false,
      "results": [{
        "error": "Test timeout of 30000ms exceeded",
        "status": "fail",
        "logs": ["waiting for navigation"]
      }]
    }]
  }]
}
```

**Extracted data**:
- ✅ Error message
- ✅ Error type (timeout, assertion, etc.)
- ✅ Error context/logs
- ✅ Test file location
- ✅ Test name

---

### 2. **trace.zip** (OPTIONAL - DOM/UI CONTEXT)
**Location**: `test-results/<test-failure-dir>/trace.zip`  
**Created by**: Playwright (when `trace: 'on-first-retry'` is configured)  
**Format**: Compressed archive containing trace data  
**Purpose**: Provides DOM snapshots and interaction history

**What it contains**:
```
trace.zip
├── trace.json          ← Contains snapshots and actions (OPTIONAL)
├── network            ← Network requests
└── ... other files
```

**Example trace.json content**:
```json
{
  "snapshots": [{
    "str": "<html>...</html>"  // Full DOM HTML at that moment
  }]
}
```

**Extracted data**:
- ✅ Button text and attributes
- ✅ Form input labels and placeholders
- ✅ Dialog/modal HTML
- ✅ CSS classes used on elements
- ✅ ARIA labels and data-testid attributes
- ✅ Iframe information

---

### 3. **error-context.md** (SUPPLEMENTARY)
**Location**: `test-results/<test-failure-dir>/error-context.md`  
**Created by**: Playwright (automatic error documentation)  
**Format**: Markdown  
**Purpose**: Human-readable error summary

**What it contains**:
- Test name and location
- Error details
- Page snapshot (accessibility tree)
- Instructions for debugging

**Example**:
```markdown
# Error details
Test timeout of 30000ms exceeded.

# Page snapshot
- button "← Back to Movie Lists" [ref=e10]
- heading "Inception" [level=4] [ref=e21]
```

---

### 4. **Test Source Files** (FALLBACK)
**Location**: `tests/*.spec.ts`  
**Format**: TypeScript/JavaScript  
**Purpose**: Analyze test intent and expected behavior

**What it extracts**:
- ✅ What selectors the test is looking for
- ✅ What text/labels the test expects
- ✅ Test structure and assertions
- ✅ Navigation patterns

---

### 5. **Application Source Files** (ADVANCED)
**Location**: `../movieapp/frontend/src/**/*.tsx`  
**Format**: React/TypeScript components  
**Purpose**: Understand UI structure and verify test expectations

**What it extracts** (when `HEALER_SOURCE_CODE_ANALYSIS=true`):
- ✅ Component labels (from JSX)
- ✅ Button names and aria-labels
- ✅ Form placeholders
- ✅ Heading text
- ✅ Data-testid values

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────┐
│        Run Tests (npm test)                      │
└──────────────┬──────────────────────────────────┘
               │
               ├─→ reports/results/results.json ────┐
               │                                     │
               └─→ test-results/<test-dir>/          │
                   ├─ trace.zip (with trace.json)    │
                   └─ error-context.md               │
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────┐
│   gemini-healer.js: Error Analysis              │
└──────────────┬──────────────────────────────────┘
               │
    ┌──────────┼──────────┬────────────────┐
    ▼          ▼          ▼                 ▼
 results.   trace.zip  error-        test source
 json    (DOM/UI)    context.md      files
    │          │          │                 │
    └──────────┼──────────┴─────────────────┘
               │
               ▼
        Extract Error Info
        Extract UI Elements
        Extract Test Intent
               │
               ▼
        Send to Gemini API
               │
               ▼
        Generate Fixed Test
               │
               ▼
      Apply Fix & Verify
```

---

## What the "trace.json not found in zip" Message Means

### Status
✅ **NOT AN ERROR** - Informational message only  
🔹 **Severity**: Low  
📝 **Why it appears**: The trace.zip file exists but doesn't contain `trace.json` inside

### Why it happens
1. **Playwright trace capture disabled**: If `trace: 'on-first-retry'` is not in `playwright.config.ts`
2. **Trace not generated**: Test failure occurred before trace generation
3. **Older Playwright version**: May not generate detailed trace.json

### What happens when trace.json is missing

The healer gracefully falls back to other sources:

```javascript
// In extractElementsFromTrace() function:
if (!traceEntry) {
  if (HEALER_VERBOSE) console.log('📋 trace.json not found in zip');
  return result;  // Return with empty arrays, not an error
}
```

**Fallback Analysis Sources** (in order of preference):
1. ✅ error-context.md (Playwright's page snapshot)
2. ✅ results.json (error message and context)
3. ✅ Test file source code (what test is looking for)
4. ✅ Application source code (if enabled)

---

## Summary of Input Files Used in Your Run

### For test: `02_broken_link.spec.ts`

**Required Files** (✅ All present):
```
reports/results/results.json
├─ Error: "Test timeout of 30000ms exceeded"
├─ Type: NAVIGATION
└─ File: tests/02_broken_link.spec.ts

test-results/02_broken_link-Frontend-na-440b3.../
├─ trace.zip  ✅ Found
│  └─ trace.json ⚠️  Not found (but not critical)
└─ error-context.md  ✅ Found
   └─ Page snapshot with DOM elements
```

**Optional Files** (when trace.json is missing):
```
tests/02_broken_link.spec.ts
├─ getByRole('button', { name: /Book Now/i })
├─ page.waitForURL(...)
└─ expect(page.url()).toMatch(...)

movieapp/frontend/src/...
├─ Component labels
├─ Button names
└─ Navigation paths
```

---

## File Size Limits

The healer respects these limits to prevent memory issues:

| File | Limit | Variable |
|------|-------|----------|
| results.json | 1 MB | `HEALER_MAX_FILE_SIZE` |
| trace.zip | Unlimited | (decompressed) |
| source code per file | 500 KB | `HEALER_SOURCE_CODE_MAX_FILE_SIZE` |
| total source extraction per session | 2 MB | `HEALER_SOURCE_CODE_MAX_EXTRACTION_SIZE` |

---

## Configuration for Improved Trace Capture

To ensure `trace.json` is always available, update `playwright.config.ts`:

```typescript
// playwright.config.ts
export default defineConfig({
  // ...
  use: {
    // ... other settings
    trace: 'on-first-retry',  // Captures full trace on test failure
  },
  
  // OR for all tests (uses more storage):
  // trace: 'on',
  
  // For debugging:
  // trace: 'retain-on-failure',  // Keeps trace even if test passes
});
```

---

## Advanced: Enable Source Code Analysis

To analyze application source code for better healing:

```bash
# Set environment variable
export HEALER_SOURCE_CODE_ANALYSIS=true
npm run heal:gemini:verbose
```

This enables extraction from:
- React component labels
- JSX button names
- Form field labels
- Custom components

---

## Troubleshooting Missing Input Files

| Issue | Solution |
|-------|----------|
| `results.json not found` | Run `npm test` first to generate test results |
| `trace.zip not found` | Ensure `trace: 'on-first-retry'` is in `playwright.config.ts` |
| `trace.json not found (in zip)` | Update Playwright to latest version; re-run tests |
| `error-context.md not found` | Playwright generates this automatically; check file permissions |
| No source code extracted | Set `HEALER_SOURCE_CODE_ANALYSIS=true` in `.env` |

---

## Summary

The gemini-healer uses a **layered approach** to error analysis:

1. **Primary**: results.json (always required)
2. **Secondary**: trace.zip with trace.json (when available)
3. **Tertiary**: error-context.md (always available)
4. **Fallback**: Test and application source code (optional)

The "trace.json not found in zip" message is **non-critical** and just means the healer will rely on other data sources (which is fine for most test failures).

All the information needed for intelligent healing is already present from the other sources!
