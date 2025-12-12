# 📊 Healer Report Generator Module

## Overview

`healer-report-generator.js` is a dedicated, modular report generation system that creates professional HTML reports for test healing sessions. It has been separated from the main healer logic for better maintainability and reusability.

---

## 📁 File Structure

```
e2e/
├── gemini-healer.js              # Main healer (427 lines) - Test analysis & fixing
├── healer-report-generator.js    # Report module (337 lines) - HTML generation
├── healer-report-*.html          # Generated reports (test-results/)
└── package.json
```

**Size Comparison:**
- Original gemini-healer.js: 850+ lines (monolithic)
- New gemini-healer.js: 427 lines (focused, cleaner)
- New healer-report-generator.js: 337 lines (dedicated, reusable)

---

## 🚀 Quick Start

The report generator is automatically imported and used by `gemini-healer.js`:

```bash
# Run healer with auto-fix (generates HTML report)
npm run heal:gemini:auto

# Reports are saved in test-results/ directory
# Example: test-results/healer-report-2025-12-12T16-46-21-046Z.html
```

---

## 📦 Module API

### Imports

```javascript
import { generateHtmlReport, escapeHtmlNode } from './healer-report-generator.js';
```

### Functions

#### `generateHtmlReport(healingResults)`

**Purpose**: Generate professional HTML report from healing session data

**Parameters:**
```javascript
{
  totalTests: Number,        // Total tests analyzed
  fixedCount: Number,        // Tests with fixes applied
  verifiedCount: Number,     // Tests where fixes were verified
  successRate: Number,       // Percentage (0-100)
  duration: String,          // Session duration (e.g., "45s")
  tests: Array              // Array of test results (see below)
}
```

**Test Result Object:**
```javascript
{
  file: String,             // Test file name
  title: String,            // Test name/description
  errorType: String,        // Error classification
  error: String,            // Original error message
  analysis: String,         // Gemini AI analysis
  fixed: Boolean,           // Whether fix was applied
  verified: Boolean,        // Whether fix was verified
  fixedCode: String         // The corrected code
}
```

**Returns:**
- `String` - Path to generated HTML file

**Example:**
```javascript
import { generateHtmlReport } from './healer-report-generator.js';

const results = {
  totalTests: 5,
  fixedCount: 4,
  verifiedCount: 3,
  successRate: 60,
  duration: '45s',
  tests: [
    {
      file: 'app.spec.ts',
      title: 'Load app and verify navigation',
      errorType: 'timeout',
      error: 'locator.click: Test timeout...',
      analysis: 'Root cause is bad selector',
      fixed: true,
      verified: true,
      fixedCode: 'Updated code here...'
    }
  ]
};

const reportPath = generateHtmlReport(results);
console.log(`Report saved at: ${reportPath}`);
```

#### `escapeHtmlNode(text)`

**Purpose**: Safely escape HTML special characters for display

**Parameters:**
- `text` (String) - Text to escape

**Returns:**
- `String` - HTML-safe escaped text

**Example:**
```javascript
import { escapeHtmlNode } from './healer-report-generator.js';

const unsafe = '<script>alert("test")</script>';
const safe = escapeHtmlNode(unsafe);
// Result: &lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;
```

---

## 🎨 Generated Report Features

### Professional Design
- **Gradient Header** - Modern purple gradient
- **Responsive Layout** - Works on all screen sizes
- **Interactive Cards** - Expandable test results
- **Color-Coded Status** - Green for success, red for failures, yellow for warnings

### Information Included
- **Summary Statistics** - Tests analyzed, fixed, verified, success rate
- **Individual Test Results** - Error details, Gemini analysis, applied fixes
- **Verification Status** - Whether fixes passed re-run testing
- **Session Metadata** - Duration, timestamp, test count

### Interactive Features
- **Click to Expand** - Expand/collapse individual test results
- **Auto-Expand** - First test automatically expanded for quick review
- **Smooth Animations** - Transitions on expand/collapse
- **Visual Indicators** - Icons and color coding throughout

---

## 📁 Report Location & Naming

Reports are saved in the `test-results/` directory with timestamp-based filenames:

```
test-results/
├── healer-report-2025-12-12T16-46-21-046Z.html
├── healer-report-2025-12-12T17-15-33-122Z.html
└── ... (one for each healing session)
```

**Filename Format**: `healer-report-{ISO-TIMESTAMP}.html`

**Timestamp Conversion**: ISO format with colons removed for filesystem compatibility

---

## 🔄 Integration with gemini-healer.js

### How It's Used

1. **Import** (Line 19 of gemini-healer.js):
```javascript
import { generateHtmlReport } from './healer-report-generator.js';
```

2. **Track Results** (During healing session):
```javascript
const healingResults = {
  totalTests: 0,
  fixedCount: 0,
  verifiedCount: 0,
  successRate: 0,
  duration: '',
  tests: []
};
```

3. **Generate Report** (After healing completes):
```javascript
if (options.autoFix && healingResults.totalTests > 0) {
  generateHtmlReport(healingResults);
}
```

### Result Tracking Flow
```
Start Healing Session
     ↓
Process Each Failing Test
     ├─ Analyze with Gemini
     ├─ Extract Fix
     ├─ Apply Fix (if auto-fix)
     ├─ Verify Fix
     └─ Track Result
     ↓
Calculate Statistics
     ├─ Success Rate = (Verified / Total) × 100
     ├─ Duration = End Time - Start Time
     └─ Compile Test Results
     ↓
Generate HTML Report
     ├─ Create HTML Content
     ├─ Write to File
     ├─ Log Path to Console
     └─ Return File Path
```

---

## 💾 Data Safety & Escaping

The report generator properly escapes all HTML special characters to prevent injection:

- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#039;`

This ensures error messages and code snippets are safely displayed in HTML.

---

## 📊 Report Statistics Calculation

### Success Rate Formula
```
Success Rate = (Tests Verified / Total Tests) × 100
```

Only tests where:
1. Fix was applied ✓
2. Test re-run PASSED ✓

Count toward success rate.

### Test Status Badges
- **✅ FIXED & VERIFIED** - Fix applied and re-run passed
- **⚠️ FIXED (UNVERIFIED)** - Fix applied but re-run still fails
- **❌ NOT FIXED** - No fix could be generated or applied

---

## 🎯 Use Cases

### Case 1: Development Workflow
```bash
1. npm test                    # Tests fail
2. npm run heal:gemini:auto   # Healer runs and fixes
3. Open healer-report-*.html  # Review results
4. Commit changes if verified
```

### Case 2: CI/CD Integration
```yaml
- if: failure()
  run: npm run heal:gemini:auto

- if: always()
  uses: actions/upload-artifact@v3
  with:
    name: healer-reports
    path: test-results/healer-report-*.html
```

### Case 3: Team Code Review
```
1. Healer generates report
2. Share HTML file with team
3. Team reviews in browser
4. Discuss findings
5. Approve/merge changes
```

### Case 4: Historical Tracking
```bash
1. Archive reports by date: test-results/archives/2025-12-12/
2. Analyze trends over time
3. Identify patterns in failures
4. Improve testing strategy
```

---

## 🔧 Customization Guide

### Modifying Report Style

Edit the `<style>` section in `generateHtmlReport()`:

```javascript
// Example: Change header color
.header {
    background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}

// Example: Change card styling
.stat-card {
    border-left: 5px solid #your-border-color;
    background: #your-bg-color;
}
```

### Adding Custom Fields

Modify the HTML template to include additional data:

```javascript
// Add custom field to report
<div class="custom-field">
    <strong>Custom Data:</strong> ${someCustomData}
</div>
```

### Adjusting Truncation

Change text truncation limits:

```javascript
// Original: 500 characters for errors
${escapeHtmlNode(test.error.substring(0, 500))}

// Modified: 1000 characters
${escapeHtmlNode(test.error.substring(0, 1000))}
```

---

## 📋 File Size Reference

- **healer-report-generator.js**: ~12-14 KB
- **Generated HTML Report**: ~10-20 KB (depending on test count)
- **Both files combined**: ~427 + 337 = 764 lines of code

**Advantages of Separation:**
✅ Better code organization  
✅ Easier to maintain each component  
✅ Reusable report module  
✅ Cleaner main healer logic  
✅ Independent testing of each module  

---

## 🚀 Future Enhancement Ideas

Potential additions to the report generator:

- 📈 **Charts** - Show trends over multiple reports
- 🔗 **Deep Links** - Link directly to test files
- 📧 **Email Export** - Auto-send reports to team
- 🔍 **Search/Filter** - Find specific tests in reports
- 📊 **Metrics** - Detailed failure analytics
- 🎨 **Themes** - Customizable color schemes
- 📥 **Diff View** - Show before/after code changes
- 🔄 **Comparison** - Compare multiple healing sessions

---

## 💡 Best Practices

1. **Regular Review** - Check reports after each healing session
2. **Archive** - Keep reports organized by date
3. **Share** - Use reports for team communication
4. **Learn** - Read Gemini analysis for insights
5. **Monitor** - Track trends in test failures

---

## 🔗 Related Files

- [gemini-healer.js](./gemini-healer.js) - Main healer logic
- [HEALER_HTML_REPORT_GUIDE.md](./HEALER_HTML_REPORT_GUIDE.md) - User guide for reports
- [package.json](./package.json) - npm scripts
- [.env](./.env) - Environment configuration

---

## 📞 Troubleshooting

### Issue: Report not created
**Check:**
- Auto-fix is enabled (`--auto-fix` flag)
- Failing tests exist
- test-results directory is writable

### Issue: Report looks incomplete
**Solution:**
- Ensure file created successfully
- Check browser JavaScript is enabled
- Try different browser

### Issue: HTML won't open
**Solution:**
- Verify file path is correct
- Check file permissions
- Try `start` command to open in default browser

---

## 📝 Summary

The **healer-report-generator.js** module provides:
✅ **Clean Separation** - Dedicated HTML generation logic  
✅ **Professional Reports** - Beautiful, interactive HTML  
✅ **Reusable Module** - Can be imported in other projects  
✅ **Proper Escaping** - Safe HTML special character handling  
✅ **Timestamp Tracking** - Organize reports by time  
✅ **Full Statistics** - Complete healing session metrics  

**Perfect for**: Documenting healing sessions, team communication, historical tracking, and process improvement.

---

**Module Version**: 1.0  
**Created**: December 12, 2025  
**Part of**: Gemini-Powered Playwright Test Healer
