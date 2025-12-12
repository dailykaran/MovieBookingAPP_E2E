# Gemini-Powered Healer - Quick Start

## What You Get

A brand new, fully-featured healer that's completely separate from the original `healer.js`:

### New File: `gemini-healer.js`
✅ Complete Gemini API integration  
✅ Clean, modular code architecture  
✅ Advanced error classification  
✅ Comprehensive logging and feedback  
✅ Better test code extraction  
✅ Production-ready implementation  

## Quick Start (30 seconds)

### 1. Ensure API Key is Set
```bash
# Your .env file should have:
GEMINI_API_KEY=AIzaSyBiN_o_y7OM0Urg61t5oX5wt5rkFRlsCRQ
```

### 2. Introduce a Test Failure
```bash
# Modify a test to fail, then run tests
npm test
```

### 3. Heal the Test
```bash
# See analysis without applying fixes
npm run heal:gemini

# OR auto-apply fixes
npm run heal:gemini:auto

# OR with verbose debugging
npm run heal:gemini:verbose
```

## Available Commands

```bash
# Analysis only
npm run heal:gemini

# With auto-fix enabled
npm run heal:gemini:auto

# With verbose output (shows detailed analysis)
npm run heal:gemini:verbose

# Help menu
npm run heal:gemini -- --help

# Specific test file
npm run heal:gemini -- localhost-3000 --auto-fix
```

## Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Analysis | Gemini-powered root cause analysis |
| 🔧 Auto-Fix | Automatically applies AI suggestions |
| 📊 Error Classification | Identifies error type (timeout, assertion, strict mode, etc.) |
| ✅ Verification | Re-runs tests after fixes |
| 📋 Detailed Logging | Shows exactly what was changed |
| 🎯 Specific Selectors | Handles Material-UI, accessibility selectors, etc. |

## File Structure

```
e2e/
├── gemini-healer.js          ← NEW: Standalone Gemini-powered healer
├── GEMINI_HEALER_GUIDE.md    ← NEW: Comprehensive documentation
├── healer.js                  ← Original healer (still works)
├── package.json               ← Updated with new npm scripts
├── .env                       ← Your API key
└── tests/
    ├── localhost-3000.spec.ts
    ├── app.spec.ts
    └── seed.spec.ts
```

## Key Improvements Over Original

| Aspect | Original | Gemini Healer |
|--------|----------|--------------|
| API Integration | Partial | ✅ Full |
| Error Types | Limited | ✅ Comprehensive |
| Code Extraction | Basic regex | ✅ Advanced patterns |
| Error Context | Basic | ✅ Detailed |
| Documentation | Basic | ✅ Extensive |
| CLI Options | Limited | ✅ Full |
| Help System | None | ✅ Built-in |

## Example Workflow

### Before (Original Healer)
```
Run healer → Shows error → Suggests fix → Manual review → Manual apply
```

### After (Gemini Healer)
```
Run healer → Deep AI analysis → Generates corrected code → Auto-applies → Verifies → Done!
```

## Environment Variables

```env
# Required
GEMINI_API_KEY=your_key_here

# Optional (with defaults)
HEALER_AUTO_FIX=false          # Enable auto-fix by default
HEALER_VERBOSE=false           # Enable verbose mode by default
HEALER_MAX_RETRIES=3           # Retry attempts
```

## API Models Used

- **gemini-2.5-flash-exp** - Latest Gemini model with best speed/quality
- Temperature: 0.7 (balanced)
- Max tokens: 4096

## Common Scenarios

### Scenario 1: Selector Timeout
```
Input: await page.locator('.MuisCardContent-roots').click() // Typo
Output: await page.locator('.MuiCardContent-root').click() // Fixed
```

### Scenario 2: Strict Mode Violation
```
Input: expect(page.locator('h2')).toBeVisible() // Matches 8 elements
Output: expect(page.locator('h2').first()).toBeVisible() // Fixed
```

### Scenario 3: Navigation Assertion
```
Input: await expect(page).toHaveURL('/details') // Too generic
Output: await expect(page).toHaveURL(/\/3$/) // More specific
```

## Troubleshooting

**Q: "GEMINI_API_KEY not set"**  
A: Add it to your `.env` file in the e2e directory

**Q: "No failing tests found"**  
A: Run `npm test` first to generate test results

**Q: "Gemini API error"**  
A: Check API key validity and rate limits

**Q: "Could not extract fixed code"**  
A: Run with `--verbose` to see the full Gemini response

## Next Steps

1. ✅ Set up environment variables (already done)
2. ✅ Install dependencies (already done - dotenv is in package.json)
3. 🔄 Create a test failure to see the healer in action
4. 📖 Read `GEMINI_HEALER_GUIDE.md` for detailed documentation
5. 🚀 Integrate into your CI/CD pipeline

## npm Scripts Summary

```json
{
  "heal:gemini": "node gemini-healer.js",
  "heal:gemini:auto": "node gemini-healer.js --auto-fix",
  "heal:gemini:verbose": "node gemini-healer.js --auto-fix --verbose"
}
```

---

**Status**: ✅ Ready to use  
**Version**: 2.0.0 (Gemini-Powered)  
**Last Updated**: December 12, 2025
