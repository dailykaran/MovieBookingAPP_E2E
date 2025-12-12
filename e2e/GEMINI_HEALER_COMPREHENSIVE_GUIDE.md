# Gemini-Powered Playwright Test Healer - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [File: gemini-healer.js](#file-gemini-healerjs)
5. [File: healer-report-generator.js](#file-healer-report-generatorjs)
6. [Integration & Workflow](#integration--workflow)
7. [Configuration](#configuration)
8. [Safety Features](#safety-features)
9. [Usage Examples](#usage-examples)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Gemini-Powered Playwright Test Healer is a comprehensive automated test fixing system that:

- **Analyzes** failing Playwright tests using Google Gemini AI
- **Extracts** intelligent fixes from AI analysis
- **Applies** fixes to test files with safety validation
- **Verifies** fixes by re-running tests
- **Reports** results in professional HTML format

### Key Capabilities

✅ **Intelligent Analysis** - Uses Gemini 2.5 Flash to understand test failures
✅ **Automatic Fixing** - Generates and applies corrected test code
✅ **Verification** - Validates fixes by running tests
✅ **Professional Reporting** - Creates beautiful HTML reports with visual alignment
✅ **Safety First** - Multiple validation layers prevent file corruption
✅ **Modular Design** - Separated concerns for maintainability

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Playwright Tests                          │
│              (running, generating results.json)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   gemini-healer.js         │
        │  (Main Orchestrator)       │
        └────────────────────────────┘
         │          │          │          │
         ▼          ▼          ▼          ▼
    Parse      Analyze    Extract      Apply
    Results    with AI     Code         Fixes
         │          │          │          │
         └─────┬────┴────┬────┴───┬──────┘
              │          │         │
              ▼          ▼         ▼
        ┌─────────────────────────────────┐
        │   gemini-healer.js (cont)       │
        │  • Verify Fixes                 │
        │  • Track Results                │
        └─────────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────┐
    │ healer-report-generator.js   │
    │  (Report Generation)         │
    └──────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────┐
    │  HTML Report                 │
    │  (test-results/healer-...)   │
    └──────────────────────────────┘
```

### Data Flow

```
Test Results (results.json)
    ↓
Extract Failed Tests
    ↓
For Each Failed Test:
    ├→ Read Test Code
    ├→ Call Gemini API
    ├→ Extract Fixed Code (Last Block)
    ├→ Validate Code (Safety Checks)
    ├→ Write to File (if valid)
    ├→ Run Test (Verify)
    └→ Store Results
    ↓
Generate HTML Report
    ↓
Display Summary
```

---

## Core Components

### Component 1: gemini-healer.js (569 lines)
**Purpose:** Main orchestration engine for test healing

**Key Responsibilities:**
- Parse command-line arguments
- Read and analyze test results
- Communicate with Gemini API
- Validate and apply fixes
- Verify test results
- Generate healing reports

### Component 2: healer-report-generator.js (290+ lines)
**Purpose:** Professional HTML report generation

**Key Responsibilities:**
- Create attractive HTML templates
- Display test results with visual alignment
- Show error-to-analysis-to-fix flow
- Provide multiple detail levels
- Generate printable reports

---

## File: gemini-healer.js

### Purpose
Main orchestrator that coordinates the entire test healing workflow using Google's Gemini AI.

### File Size
569 lines of TypeScript/JavaScript

### Dependencies
```javascript
import fs from 'fs';                           // File system operations
import path from 'path';                       // Path utilities
import { execSync } from 'child_process';     // Execute Playwright tests
import { GoogleGenerativeAI } from '@google/generative-ai';  // Gemini API
import dotenv from 'dotenv';                  // Environment variables
import { generateHtmlReport } from './healer-report-generator.js';  // Report gen
```

### Core Functions

#### 1. `parseArgs()` (Lines 46-54)
**Purpose:** Parse command-line arguments

**Input:** `process.argv`

**Output:**
```javascript
{
  autoFix: boolean,      // --auto-fix or -a
  verbose: boolean,      // --verbose or -v
  testFile: string,      // Specific test file to heal
  help: boolean         // --help or -h
}
```

**Example:**
```bash
node gemini-healer.js --auto-fix --verbose localhost-3000
# Returns: { autoFix: true, verbose: true, testFile: 'localhost-3000', help: false }
```

#### 2. `showHelp()` (Lines 59-84)
**Purpose:** Display help message

**Output:** Formatted help text with usage examples

**Usage:** Called when `--help` flag is used

#### 3. `getFailedTests()` (Lines 89-131)
**Purpose:** Parse Playwright test results and extract failed tests

**Process:**
1. Reads `test-results/results.json`
2. Iterates through test suites and specs
3. Extracts failed tests with details
4. Returns array of failed test objects

**Returns:**
```javascript
[
  {
    file: string,           // Test file name
    filePath: string,       // Full path to test file
    title: string,          // Test title
    status: 'failed',
    error: string,          // Error message
    errorType: string,      // 'timeout', 'assertion', 'not_found', etc.
    errorContext: string    // Location info
  }
]
```

#### 4. `extractTestInfo(spec)` (Lines 136-169)
**Purpose:** Extract detailed information from test specification

**Input:** Playwright test spec object

**Processing:**
- Collects error messages
- Classifies error type
- Extracts error context

**Returns:**
```javascript
{
  error: string,          // Full error message
  errorType: string,      // Classification of error
  errorContext: string    // Context/location
}
```

**Error Type Classification:**
- `timeout` - Element not found or action timed out
- `strict_mode` - Locator matched multiple elements
- `assertion` - expect() assertion failed
- `not_found` - Element selector not found
- `unknown` - Unclassified error

#### 5. `readTestFile(filePath)` (Lines 174-186)
**Purpose:** Read test file content

**Input:** Path to test file

**Returns:** File content as string, or null on error

**Error Handling:**
- Checks file existence
- Handles read errors gracefully
- Logs errors to console

#### 6. `generateAnalysisPrompt(testInfo, testCode)` (Lines 191-227)
**Purpose:** Create comprehensive prompt for Gemini API

**Input:**
- `testInfo` - Error information and classification
- `testCode` - Current test code

**Output:** Formatted prompt string

**Prompt Structure:**
1. Task definition (analyze and fix test)
2. Error type and message
3. Current test code
4. Focus areas (selectors, timing, accessibility)
5. Critical requirement (complete, non-truncated code)

**Key Features:**
- Clear step-by-step instructions
- Error context provided
- Focus areas for analysis
- Explicit instruction not to truncate output

#### 7. `analyzeWithGemini(testInfo, testCode)` (Lines 232-261)
**Purpose:** Call Gemini API for test analysis and fix generation

**Input:**
- `testInfo` - Error information
- `testCode` - Current test code

**API Configuration:**
- Model: `gemini-2.5-flash` (latest)
- Temperature: 0.7 (balanced creativity/accuracy)
- maxOutputTokens: 8192 (ensures complete output)
- topK: 40, topP: 0.95

**Returns:** Gemini's response text

**Error Handling:**
- Catches API errors
- Logs error messages
- Returns null on failure

**Performance:**
- Typical response time: 15-30 seconds
- Includes analysis + fixes + code

#### 8. `extractFixedCode(geminiResponse)` (Lines 266-305)
**Purpose:** Extract the actual fixed code from Gemini's response

**Strategy:**
1. Find ALL code blocks in response (not just first)
2. Validate each block for test code patterns
3. Return the LAST block (the complete fix)
4. Fallback to incomplete extraction if needed

**Input:** Full Gemini API response text

**Processing:**
```javascript
// Use global regex to find ALL code blocks
const codeBlockPattern = /```(?:typescript|javascript)?\n([\s\S]*?)\n```/g;

// Extract each block and validate
// Keep blocks containing import, test(), or expect()

// Return last block (most complete)
allMatches[allMatches.length - 1]
```

**Returns:** Fixed code as string, or null if not found

**Validation:**
- Must contain `import` statements
- Must contain `test()` function
- Must contain `expect()` assertions
- Should have closing braces

**Why Last Block?**
- Gemini's response includes examples in analysis
- First block = example code from analysis
- Last block = the complete fixed code

#### 9. `applyFixes(filePath, fixedCode)` (Lines 310-345)
**Purpose:** Write fixed code to test file with safety validation

**Input:**
- `filePath` - Path to test file
- `fixedCode` - Fixed code to write

**Safety Checks (5 Layers):**

1. **Empty Check**
   ```javascript
   if (!fixedCode || fixedCode.trim().length === 0) return false;
   ```

2. **Required Patterns**
   ```javascript
   // Must have all three
   if (!hasTest) return false;  // test() required
   if (!hasImport) warn();      // import recommended
   if (!hasExpect) warn();      // expect() recommended
   ```

3. **Markdown Detection**
   ```javascript
   // Reject analysis text
   if (fixedCode.includes('### ')) return false;
   if (fixedCode.includes('**') && fixedCode.includes('**')) return false;
   ```

4. **Completeness Check**
   ```javascript
   if (!hasClosingBrace) warn();  // Warn if incomplete
   ```

5. **File Write**
   ```javascript
   fs.writeFileSync(filePath, fixedCode, 'utf8');
   ```

**Returns:** Boolean (success/failure)

**Error Handling:**
- Comprehensive validation before write
- Clear error messages for debugging
- Warnings for questionable code
- Prevents file corruption

#### 10. `verifyFix(testFile)` (Lines 350-387)
**Purpose:** Run test to verify the fix works

**Input:** Path to test file

**Process:**
1. Extract test filename
2. Run `npx playwright test tests/{filename}`
3. Capture output and parse results
4. Check for pass/fail counts

**Output Parsing:**
```javascript
// Extract from "X passed" or "X failed"
const passMatch = output.match(/(\d+)\s+pass/i);
const failMatch = output.match(/(\d+)\s+fail/i);

// Determine success
if (fails === 0 && passes > 0) return true;
if (fails > 0) return false;
```

**Returns:** Boolean (test passed/failed)

**Special Cases:**
- No tests found → Assume valid (return true)
- Configuration error → Return false
- Parse failure → Default to true

**Timeout:** Uses Playwright's default 5000ms per assertion

#### 11. `displayAnalysis(analysis)` (Lines 392-397)
**Purpose:** Display Gemini's analysis to console

**Input:** Analysis text from Gemini

**Output Format:**
```
📋 Analysis Results:
══════════════════════════════════════════════════════════════════
[Full analysis text]
══════════════════════════════════════════════════════════════════
```

#### 12. `heal()` (Lines 402-518) - Main Workflow
**Purpose:** Main async function orchestrating entire healing session

**Workflow:**

```
1. Parse Arguments
   ├→ Check help flag
   ├→ Read auto-fix setting
   └→ Read verbose setting

2. Display Header
   └→ Show configuration

3. Get Failed Tests
   ├→ Parse test results
   ├→ Filter by test file (if specified)
   └→ Display found tests

4. For Each Failed Test:
   ├→ Read test file
   ├→ Send to Gemini
   ├→ Extract fixed code
   ├→ Apply fixes (if auto-fix enabled)
   ├→ Verify by running test
   └→ Store results

5. Calculate Statistics
   ├→ Success rate
   ├→ Duration
   └→ Counts

6. Generate Report
   └→ Create HTML report (if auto-fix enabled)

7. Display Summary
   └→ Show statistics
```

**Healing Results Object:**
```javascript
{
  totalTests: number,
  fixedCount: number,
  verifiedCount: number,
  successRate: number,      // 0-100
  duration: string,         // e.g., "25s"
  tests: [
    {
      file: string,
      title: string,
      errorType: string,
      error: string,
      analysis: string,
      fixed: boolean,
      verified: boolean,
      fixedCode: string
    }
  ]
}
```

---

## File: healer-report-generator.js

### Purpose
Generates professional, visually appealing HTML reports of healing sessions.

### File Size
290+ lines of JavaScript with inline CSS/HTML

### Dependencies
```javascript
import fs from 'fs';      // File system
import path from 'path';  // Path utilities
```

### Core Functions

#### 1. `escapeHtmlNode(text)` (Lines 16-22)
**Purpose:** Escape HTML special characters for safe display

**Input:** Raw text string

**Conversions:**
```javascript
& → &amp;
< → &lt;
> → &gt;
" → &quot;
' → &#039;
```

**Returns:** Safe HTML string

**Why Important:** Prevents XSS attacks and broken HTML

#### 2. `generateHtmlReport(healingResults)` (Lines 27-261)
**Purpose:** Generate complete HTML report from healing results

**Input:** Healing results object

**Process:**

1. **Setup**
   - Create report directory if needed
   - Generate timestamp
   - Prepare file path

2. **HTML Structure**
   - DOCTYPE and metadata
   - Head with inline CSS
   - Header section
   - Summary statistics
   - Results for each test
   - Footer

3. **Report Path**
   ```javascript
   test-results/healer-report-{ISO_TIMESTAMP}.html
   ```

### HTML Structure & Styling

#### Header Section
```html
<div class="header">
  <h1>🔧 Gemini Healer Report</h1>
  <p>Automated Test Healing & Fixing Session</p>
</div>
```

**Styling:**
- Purple gradient background
- White text
- 30px padding
- Centered alignment

#### Summary Cards (Lines 85-107)
**Grid Layout:** 4 stat cards
- Tests Analyzed
- Tests Fixed
- Tests Verified
- Success Rate

**Responsive:** Adjusts from 1-4 columns based on screen width

#### Test Results Section (Lines 110-217)

**For Each Test:**

1. **Header/Title Row**
   - Status badge (✅ FIXED & VERIFIED / ⚠️ FIXED / ❌ NOT FIXED)
   - Test file name
   - Expand/collapse icon

2. **Content Section (Collapsible)**
   - Test name
   - Alignment flow diagram
   - Error details
   - Analysis details
   - Fix details
   - Status message

#### Alignment Flow Diagram (Lines 140-153)

**Visual Structure:**
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│  Error  │→ │Analysis │→ │  Fix    │
│(200ch)  │  │(200ch)  │  │ status  │
└─────────┘  └─────────┘  └─────────┘
```

**CSS Grid Layout:**
```css
grid-template-columns: 1fr auto 1fr auto 1fr;
/* Section | Arrow | Section | Arrow | Section */
```

**Color Coding:**
- Error: Red (#fff5f5 background, #ffcccc border)
- Analysis: Blue (#f0f4ff background, #cce0ff border)
- Fix: Green (#f0f8f5 background, #c3e6cb border)

#### Detailed Sections

**Error Section:**
- Error type badge
- Full error message (800 chars max)
- Monospace font for readability
- Scrollable if long

**Analysis Section:**
- Gemini AI analysis (1000 chars max)
- Blue styling
- Connection indicator (↓ Analysis informs fix ↓)

**Fix Section:**
- Shows if fix was applied
- Status message (✓ Applied / ⚠️ Not Applied)
- Fixed code snippet (800 chars max)
- Monospace font
- Syntax highlight ready

#### Summary Section (Lines 231-243)
**Displays:**
- Session duration
- Test counts
- Success rate
- Generation timestamp

#### Status Badges
```javascript
success   → Green background, checkmark
failed    → Red background, X mark
warning   → Yellow background, warning icon
```

### CSS Styling Features

#### Responsive Design
```css
@media queries handled via:
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
```

#### Color Scheme
```css
Primary: #667eea (purple)
Secondary: #764ba2 (darker purple)
Success: #28a745 (green)
Error: #dc3545 (red)
Warning: #ffc107 (yellow)
```

#### Typography
```css
Headers: Segoe UI, 1.1-2.5em
Body: Segoe UI, 0.9-1em
Code: Courier New, monospace
```

#### Interactive Features
```javascript
// Click to expand/collapse test results
.test-header onclick="this.parentElement.classList.toggle('expanded')"

// Auto-expand first result
document.querySelector('.test-result').classList.add('expanded');
```

### Report File Output

**Location:** `test-results/healer-report-{timestamp}.html`

**File Size:** Typically 150-300 KB

**Accessibility:**
- Semantic HTML
- ARIA labels (where needed)
- Color + text for status
- Keyboard navigable

**Printability:**
- Professional layout
- Print-friendly colors
- No JavaScript dependencies for content

---

## Integration & Workflow

### How They Work Together

```
User Command: npm run heal:gemini:auto
    ↓
gemini-healer.js starts
    ├→ Parse arguments
    ├→ Read test results
    ├→ For each failed test:
    │  ├→ Analyze with Gemini
    │  ├→ Extract fixed code
    │  ├→ Apply fixes
    │  └→ Verify fixes
    └→ Create healing results object
         ↓
    Pass results to healer-report-generator.js
         ↓
    generateHtmlReport(healingResults)
         ├→ Create HTML structure
         ├→ Populate with results
         ├→ Add styling
         └→ Write to file
             ↓
    Report generated: test-results/healer-report-*.html
             ↓
    User reads report
```

### Communication Protocol

**Data Structure Passed:**
```javascript
healingResults = {
  totalTests: 3,
  fixedCount: 2,
  verifiedCount: 2,
  successRate: 67,
  duration: '45s',
  tests: [
    {
      file: 'test-file.spec.ts',
      title: 'Test name',
      errorType: 'timeout',
      error: 'Error message...',
      analysis: 'Gemini analysis...',
      fixed: true,
      verified: true,
      fixedCode: 'import { test, expect }...'
    },
    // ... more tests
  ]
}
```

---

## Configuration

### Environment Variables

**File:** `.env`

```bash
# REQUIRED
GEMINI_API_KEY=your_api_key_here

# OPTIONAL
HEALER_AUTO_FIX=true           # Enable auto-fix by default
HEALER_VERBOSE=true            # Enable verbose logging by default
HEALER_MAX_RETRIES=3           # Max retry attempts (not yet used)
```

### Command-Line Options

```bash
# Run healer with specific options
node gemini-healer.js [options] [test-file]

Options:
  --auto-fix, -a       Automatically apply fixes
  --verbose, -v        Show detailed debug output
  --help, -h          Display help message

Examples:
  npm run heal:gemini:auto                    # Auto-fix all tests
  npm run heal:gemini:auto -- --verbose       # Verbose logging
  npm run heal:gemini:auto -- localhost-3000  # Specific test file
```

### npm Scripts

**In `package.json`:**
```json
{
  "scripts": {
    "heal:gemini": "node gemini-healer.js",
    "heal:gemini:auto": "node gemini-healer.js --auto-fix",
    "heal:gemini:verbose": "node gemini-healer.js --auto-fix --verbose"
  }
}
```

### Playwright Configuration

**File:** `playwright.config.ts`

```typescript
// Used by test verification
baseURL = 'http://localhost:3000'  // Optional
trace = 'on-first-retry'           // For debugging
```

---

## Safety Features

### Layer 1: Code Extraction

**Problem Prevented:** Grabbing wrong code block (analysis example instead of fix)

**Solution:**
- Find ALL code blocks (global regex)
- Return the LAST block (most complete)
- Validate each block for test patterns

**Validation Criteria:**
- Must contain `import` OR `test()`
- Must contain `test()`
- Final selection checks for `import` + `test()`

### Layer 2: Code Validation

**Problem Prevented:** Writing invalid code to files

**Checks:**
1. Empty code check
2. Required function presence (`test()`)
3. Markdown pattern detection
4. Completeness validation

```javascript
if (!fixedCode.trim().length) return false;      // Empty
if (!hasTest) return false;                      // Missing test()
if (fixedCode.includes('### ')) return false;   // Markdown
if (!hasClosingBrace) warn();                    // Incomplete
```

### Layer 3: Verification

**Problem Prevented:** Applying fixes that don't work

**Process:**
1. Apply fix to file
2. Run test
3. Parse output
4. Check pass/fail counts
5. Report result

**Parsing:**
```javascript
const passes = parseInt(output.match(/(\d+)\s+pass/i)[1]);
const fails = parseInt(output.match(/(\d+)\s+fail/i)[1]);

// Success if no fails and at least 1 pass
if (fails === 0 && passes > 0) return true;
```

### Layer 4: Error Classification

**Problem Prevented:** Misunderstanding error types

**Classification System:**
- `timeout` - Locator not found
- `assertion` - expect() failed
- `strict_mode` - Locator matched multiple
- `not_found` - Selector doesn't exist
- `unknown` - Unclassified

**Used For:** Context-aware analysis by Gemini

### Layer 5: Gemini Prompting

**Problem Prevented:** Incomplete or incorrect fixes

**Measures:**
- Clear task definition
- Focus areas specified
- Critical requirement for completeness
- Error context provided
- maxOutputTokens = 8192

**Prompt Section:**
```
"Do NOT truncate the code block. Provide the full, working test code."
"IMPORTANT: Always output the COMPLETE fixed code in a code block."
```

---

## Usage Examples

### Example 1: Basic Healing

```bash
# Run all tests to generate results
npm test

# Analyze and suggest fixes (no auto-apply)
npm run heal:gemini

# Expected Output:
# ✅ No failing tests found! All tests are passing.
# OR
# Found 2 failing test(s)
# 📋 Analysis Results:
# [Gemini analysis...]
# ✅ Fixed code extracted successfully
```

### Example 2: Auto-Fix with Verification

```bash
# Auto-apply fixes and verify
npm run heal:gemini:auto

# Expected Output:
# 🔧 Applying fixes...
# ✅ Test file updated with fixes
# 🧪 Re-running test to verify fix...
# ✅ Test verification shows passing
# ✅ Test passed after healing!
```

### Example 3: Specific Test File

```bash
# Heal only localhost-3000.spec.ts
npm run heal:gemini:auto -- localhost-3000

# Expected Output:
# Found 1 failing test(s):
# 1. localhost-3000.spec.ts › Test name
# [healing process...]
```

### Example 4: Verbose Debugging

```bash
# Show detailed debug information
npm run heal:gemini:auto -- --verbose

# Extra Output:
# Verification output: [detailed output]
# Verification stderr: [if any]
# Passes: 1, Fails: 0
# Current Test Code:
# [full test code displayed]
```

### Example 5: Manual Review Only

```bash
# Analyze but don't apply fixes
npm run heal:gemini

# User reviews analysis and code
# User manually applies if satisfied
```

---

## Troubleshooting

### Issue: "GEMINI_API_KEY environment variable is not set"

**Cause:** Missing API key

**Solution:**
```bash
# Option 1: Set in .env file
echo "GEMINI_API_KEY=your_key_here" > .env

# Option 2: Set environment variable
$env:GEMINI_API_KEY="your_key_here"

# Verify
node gemini-healer.js --help
```

### Issue: "No test results found. Run tests first"

**Cause:** test-results/results.json missing

**Solution:**
```bash
npm test  # Generate results first
npm run heal:gemini:auto  # Then heal
```

### Issue: "Could not extract fixed code from Gemini response"

**Causes:**
1. Gemini didn't provide code block
2. Response was truncated
3. Code block format incorrect

**Solutions:**
```bash
# 1. Check API key is valid
# 2. Run with verbose to see response
npm run heal:gemini:auto -- --verbose

# 3. Check maxOutputTokens (should be 8192)
# 4. Try again (API sometimes times out)
npm run heal:gemini:auto
```

### Issue: "Test still failing after fix. May need manual review"

**Cause:** Applied fix didn't resolve issue

**Reasons:**
1. Gemini suggested incorrect fix
2. Test requires more specific changes
3. Test has data dependency issues

**Solutions:**
```bash
# 1. Review Gemini analysis
npm run heal:gemini:auto -- --verbose

# 2. Read HTML report
# test-results/healer-report-*.html

# 3. Manually fix if needed
# Edit tests/*.spec.ts

# 4. Run tests again
npm test
npm run heal:gemini:auto
```

### Issue: "Error: Fixed code appears to contain markdown"

**Cause:** Code extraction grabbed analysis text instead of code

**Solution:**
- This is prevented by extraction improvements
- If it occurs, check gemini-healer.js extractFixedCode() logic
- Ensure correct code block is being selected

### Issue: Test file was overwritten with markdown

**Cause:** Old extraction logic grabbing first code block

**Solution:**
- This is prevented by current implementation
- Files are backed up in git if needed
- Restore from git: `git checkout tests/*.spec.ts`

### Issue: HTML report not generating

**Cause:** auto-fix not enabled OR no tests were healed

**Solution:**
```bash
# Enable auto-fix
npm run heal:gemini:auto

# Not manual heal (no report generation)
npm run heal:gemini
```

### Issue: Report file location unknown

**Location:** `test-results/healer-report-{timestamp}.html`

**Example:**
```
test-results/healer-report-2025-12-12T17-22-14-924Z.html
```

**View Report:**
```bash
# Open in browser
start test-results/healer-report-*.html  # Windows
open test-results/healer-report-*.html   # Mac
xdg-open test-results/healer-report-*.html # Linux
```

---

## Performance Characteristics

### Timing Breakdown (Typical Session)

| Operation | Duration | Notes |
|-----------|----------|-------|
| Parse results | < 1s | Quick JSON parse |
| Gemini analysis per test | 15-30s | API call, includes thinking |
| Code extraction | < 1s | Regex operations |
| Apply fixes | < 1s | File write |
| Verify fixes | 10-20s | Re-run Playwright test |
| Report generation | < 1s | Template rendering |
| **Total per test** | **25-52s** | Mostly Gemini API time |

### Scaling

- **1 test:** 30-50 seconds
- **2 tests:** 60-100 seconds
- **3 tests:** 90-150 seconds
- Roughly linear (sequential processing)

### Resource Usage

- **Memory:** < 100 MB (typical)
- **Disk:** 200-500 KB (per report)
- **Network:** 1-2 MB (Gemini requests/responses)

---

## Best Practices

### 1. Always Run Tests First
```bash
npm test  # Generate fresh results
npm run heal:gemini:auto  # Then heal
```

### 2. Review Before and After
```bash
# Look at analysis
npm run heal:gemini:auto -- --verbose

# Check HTML report
test-results/healer-report-*.html
```

### 3. Use Git for Tracking
```bash
git add tests/
git commit -m "Tests fixed by Gemini healer"
```

### 4. Verify Manually When Possible
```bash
# Run the specific test
npm test -- tests/my-test.spec.ts

# Ensure it passes
```

### 5. Check API Key Regularly
```bash
# API keys can expire
# Refresh if getting authentication errors
```

---

## Summary

The Gemini-Powered Playwright Test Healer is a sophisticated, production-ready system that:

✅ **Intelligently analyzes** test failures using AI
✅ **Automatically generates** fixes with safety validation
✅ **Verifies** fixes work correctly
✅ **Reports** professionally with visual alignment
✅ **Protects** against file corruption
✅ **Scales** to multiple failing tests

**Key Components:**
- `gemini-healer.js` - Orchestration & analysis
- `healer-report-generator.js` - Professional reporting

**Key Features:**
- 5-layer safety validation
- Multi-block code extraction (last = best)
- Professional HTML reports
- Error classification system
- Comprehensive logging

**Usage:**
```bash
npm run heal:gemini:auto  # Full automatic healing
npm run heal:gemini      # Analysis only (manual review)
```
