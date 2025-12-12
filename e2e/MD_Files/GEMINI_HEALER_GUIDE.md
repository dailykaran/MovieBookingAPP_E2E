# Gemini-Powered Playwright Test Healer

A fully integrated, intelligent test healing system powered by Google's Generative AI API (Gemini). Automatically analyzes failing Playwright tests and generates fixes using advanced AI.

## 🚀 Features

### Advanced Test Analysis
- **Intelligent Error Classification** - Automatically identifies error types (timeout, assertion, selector, strict mode, etc.)
- **Context-Aware Analysis** - Provides comprehensive root cause analysis
- **Material-UI Support** - Specialized handling for Material-UI component selectors
- **Accessibility-First** - Recommends using accessible selectors (getByRole, getByLabel, etc.)

### Automatic Fixing
- **Code Generation** - Generates corrected test code from Gemini analysis
- **Auto-Apply Fixes** - Optionally applies fixes automatically
- **Verification** - Re-runs tests to verify fixes work
- **Detailed Logging** - Shows what was fixed and why

### Error Type Handling
✅ **Timeout Errors** - Bad selectors, slow operations  
✅ **Assertion Failures** - expect() violations, visibility issues  
✅ **Strict Mode Violations** - Selectors matching multiple elements  
✅ **Element Not Found** - Missing elements, incorrect selectors  
✅ **Generic Errors** - Any Playwright test failure  

## 📋 Prerequisites

1. **Node.js** - v16+ recommended
2. **Playwright** - Already installed in the project
3. **Gemini API Key** - Get one at https://aistudio.google.com/app/apikeys

## 🔧 Setup

### 1. Install Dependencies (if not already done)

```bash
npm install @google/generative-ai dotenv
```

### 2. Configure API Key

Create or update `.env` file in the e2e directory:

```env
# Required
GEMINI_API_KEY=your_api_key_here

# Optional
HEALER_AUTO_FIX=false
HEALER_VERBOSE=false
HEALER_MAX_RETRIES=3
```

### 3. Verify Setup

```bash
npm run heal:gemini -- --help
```

You should see the help message without errors.

## 💻 Usage

### Run Healer on All Failing Tests

```bash
npm run heal:gemini
```

Shows analysis but doesn't apply fixes.

### Auto-Apply Fixes

```bash
npm run heal:gemini:auto
```

Analyzes failing tests and automatically applies suggested fixes.

### With Verbose Output

```bash
npm run heal:gemini:verbose
```

Shows detailed analysis and debug information.

### Specific Test File

```bash
npm run heal:gemini -- localhost-3000
```

Heals only tests matching the filename.

### Combined Options

```bash
node gemini-healer.js localhost-3000 --auto-fix --verbose
```

## 📊 How It Works

### 1. Test Discovery
- Runs Playwright tests
- Collects failure information from `test-results/results.json`
- Extracts error messages and context

### 2. Error Analysis
- Classifies error type (timeout, assertion, etc.)
- Extracts error context and location
- Prepares comprehensive prompt for Gemini

### 3. AI Analysis (Gemini)
- Sends test code and error details to Gemini API
- Gets intelligent analysis with:
  - Root cause explanation
  - Specific issues identified
  - Recommended fixes
  - **Corrected test code**

### 4. Fix Application
- Extracts corrected code from Gemini response
- (Optional) Applies fixes to test file
- (Optional) Re-runs tests to verify

### 5. Reporting
- Shows analysis results
- Reports success/failure
- Logs all changes made

## 🎯 Example Workflow

### Scenario: Strict Mode Violation

**Failing Test:**
```typescript
await expect(page.locator('h2')).toBeVisible(); // ❌ Matches 8 elements
```

**Healer Analysis:**
```
Root Cause: Selector 'h2' matches multiple elements (strict mode violation)
Fix: Use .first() or more specific selector
```

**Fixed Code:**
```typescript
await expect(page.locator('h2').first()).toBeVisible(); // ✅ Fixes strict mode
```

## 🔌 API Integration Details

### Gemini Model Used
- **Model**: `gemini-2.5-flash-exp` (latest, fastest)
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Max Output**: 4096 tokens
- **Timeout**: Inherits from GoogleGenerativeAI SDK defaults

### Error Handling
- Validates API key before running
- Catches and reports API errors clearly
- Falls back gracefully on API failures
- Detailed error messages in verbose mode

### Rate Limiting
- Respects Gemini API rate limits automatically
- Implements backoff for failed requests
- No custom rate limiting (uses SDK defaults)

## 📝 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (required) | Your Google Generative AI API key |
| `HEALER_AUTO_FIX` | `false` | Auto-apply fixes by default |
| `HEALER_VERBOSE` | `false` | Show detailed debug info |
| `HEALER_MAX_RETRIES` | `3` | Max retry attempts (for future use) |

### Command-Line Options

```bash
--auto-fix, -a    Automatically apply fixes
--verbose, -v     Show detailed information
--help, -h        Display help message
```

## 🧪 Testing the Healer

### Test with a Known Failure

1. Introduce an error in a test:
```typescript
// Change this:
await page.goto('http://localhost:3000');
// To this:
await page.goto('http://localhost:9999'); // Wrong port
```

2. Run tests:
```bash
npm test
```

3. Run healer:
```bash
npm run heal:gemini:auto
```

The healer should identify the issue and suggest a fix.

## 🐛 Troubleshooting

### "GEMINI_API_KEY not set"
**Solution**: Add `GEMINI_API_KEY` to `.env` file

```env
GEMINI_API_KEY=your_key_here
```

### "No failing tests found"
**Solution**: Run tests first to generate failures:
```bash
npm test
```

### "Could not extract fixed code from Gemini response"
**Solution**: Enable verbose mode to see the full response:
```bash
npm run heal:gemini:verbose
```

### API Rate Limit Error
**Solution**: Wait a moment and try again. The healer respects API limits.

## 📚 Examples

### Example 1: Timeout Error

**Failing Test:**
```typescript
await page.locator('.MuiCardContent-roots ~ div a[href*="/3"]').click(); // Typo in class name
```

**Healer Output:**
```
Error Type: timeout
Root Cause: Bad selector - typo in Material-UI class name
Fix: Change '.MuiCardContent-roots' to '.MuiCardContent-root'
```

**Fixed Code:**
```typescript
await page.locator('.MuiCardContent-root ~ div a[href*="/3"]').click();
```

### Example 2: Assertion Failure

**Failing Test:**
```typescript
const movieCards = page.locator('.MuiPaper-root.MuiCard-root');
await expect(movieCards).toHaveCount(8); // Assumes fixed count
```

**Healer Output:**
```
Root Cause: Brittle test - assumes exact number of items
Fix: Use toBeGreaterThan() or add flexibility
```

**Fixed Code:**
```typescript
const movieCards = page.locator('.MuiPaper-root.MuiCard-root');
await expect(movieCards).toHaveCount(8);
// Or more flexible:
await expect(movieCards.first()).toBeVisible();
```

## 🎓 Best Practices

1. **Run healer frequently** - Fix tests as soon as they fail
2. **Review suggestions** - Always review AI suggestions before auto-applying
3. **Use auto-fix for CI** - Enable `--auto-fix` in automated pipelines
4. **Keep tests updated** - Update test data expectations when application changes
5. **Use stable selectors** - Prefer `data-testid` and accessible selectors over CSS classes

## 📖 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Google Generative AI](https://ai.google.dev)
- [Material-UI Selectors](https://material-ui.com)
- [Accessible Selectors](https://playwright.dev/docs/locators#get-by-role)

## 🤝 Integration with CI/CD

### GitHub Actions Example

```yaml
name: Test & Heal

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
      - if: failure()
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: npm run heal:gemini:auto
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📞 Support

For issues or questions:
1. Check [Troubleshooting](#-troubleshooting) section
2. Enable verbose mode: `npm run heal:gemini:verbose`
3. Check Gemini API status
4. Review Playwright documentation

## 📄 License

This healer tool is provided as part of the test automation suite.

---

**Last Updated**: December 2025  
**Healer Version**: 2.0.0 (Gemini-Powered)
