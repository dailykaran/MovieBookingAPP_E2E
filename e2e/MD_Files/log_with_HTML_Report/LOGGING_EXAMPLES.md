# Healing Logging System - Practical Examples

## 🎯 Real-World Scenarios

### Scenario 1: Simple Button Locator Fix

**Test:** "HomePage.spec.ts - Search button interaction"

```javascript
// Event 1: Fix Applied
logHealingEvent(
  'element_healed',
  'Search Button',
  'page.locator("button:contains(\'Search\')")',
  'page.locator("[data-testid=search-btn]")',
  {
    filePath: 'tests/HomePage.spec.ts',
    status: 'applied',
    duration: 450
  }
);

// Event 2: Verification Passed
logHealingEvent(
  'verification_passed',
  'Search Button',
  null,
  null,
  {
    filePath: 'tests/HomePage.spec.ts',
    status: 'verified',
    duration: 1200
  }
);
```

**JSON Output:**
```json
{
  "timestamp": "2025-01-19T10:30:15.234Z",
  "sessionId": "healing-1705699805000-abc123",
  "eventType": "element_healed",
  "elementName": "Search Button",
  "failedLocator": "page.locator(\"button:contains('Search')\")",
  "workingLocator": "page.locator(\"[data-testid=search-btn]\")",
  "details": {
    "filePath": "tests/HomePage.spec.ts",
    "status": "applied",
    "duration": 450
  }
}
```

**HTML Report Display:**
```html
<div class="locator-heal-item">
  <div class="locator-header">
    <strong style="color: var(--navy);">🎯 Search Button</strong>
  </div>
  <div>
    <div><strong>❌ Failed:</strong> <code>page.locator("button:contains('Search')")</code></div>
    <div><strong>✅ Working:</strong> <code>page.locator("[data-testid=search-btn]")</code></div>
    <div>🕐 10:30:15 AM</div>
  </div>
</div>
```

---

### Scenario 2: Form Submission with Multiple Locators

**Test:** "AuthenticationFlow.spec.ts - User login"

```javascript
// Event 1: Email Input Fixed
logHealingEvent(
  'element_healed',
  'Email Input Field',
  'page.locator("input[name=\'email\']")',
  'page.locator("#user-email")',
  {
    filePath: 'tests/AuthenticationFlow.spec.ts',
    status: 'applied',
    duration: 350
  }
);

// Event 2: Password Input Fixed
logHealingEvent(
  'element_healed',
  'Password Input Field',
  'page.locator("input[type=\'password\']")',
  'page.locator("#user-password")',
  {
    filePath: 'tests/AuthenticationFlow.spec.ts',
    status: 'applied',
    duration: 280
  }
);

// Event 3: Login Button Fixed
logHealingEvent(
  'element_healed',
  'Login Button',
  'page.locator("button:has-text(\'Sign in\')")',
  'page.locator("[data-testid=login-button]")',
  {
    filePath: 'tests/AuthenticationFlow.spec.ts',
    status: 'applied',
    duration: 420
  }
);

// Event 4: Verification Passed
logHealingEvent(
  'verification_passed',
  'Email Input Field',
  null,
  null,
  {
    filePath: 'tests/AuthenticationFlow.spec.ts',
    status: 'verified'
  }
);

// Event 5: Verification Passed
logHealingEvent(
  'verification_passed',
  'Password Input Field',
  null,
  null,
  {
    filePath: 'tests/AuthenticationFlow.spec.ts',
    status: 'verified'
  }
);

// Event 6: Verification Passed
logHealingEvent(
  'verification_passed',
  'Login Button',
  null,
  null,
  {
    filePath: 'tests/AuthenticationFlow.spec.ts',
    status: 'verified'
  }
);
```

**Resulting Statistics:**
```javascript
{
  totalEvents: 6,
  failedLocators: 3,      // 3 failed locators
  workedLocators: 3,      // 3 fixed locators
  elementsHealed: 3,      // 3 elements healed
  sessionDuration: "00:00:12",
  eventTypes: {
    "element_healed": 3,
    "verification_passed": 3
  }
}
```

---

### Scenario 3: Handling Locator Failure

**Test:** "PaymentFlow.spec.ts - Credit card form"

```javascript
// Event 1: Attempt to Fix, But Fails
logHealingEvent(
  'locator_failure',
  'Credit Card Number Input',
  'page.locator("input[aria-label=\'Card Number\']")',
  null,  // No working locator found
  {
    filePath: 'tests/PaymentFlow.spec.ts',
    error: 'Element not found after multiple retry attempts',
    retries: 5
  }
);

// Event 2: Another Element Fixed Successfully
logHealingEvent(
  'element_healed',
  'CVV Input',
  'page.locator("input[aria-label=\'CVV\']")',
  'page.locator("#cvv-field")',
  {
    filePath: 'tests/PaymentFlow.spec.ts',
    status: 'applied'
  }
);

// Event 3: Its Verification Passed
logHealingEvent(
  'verification_passed',
  'CVV Input',
  null,
  null,
  {
    filePath: 'tests/PaymentFlow.spec.ts',
    status: 'verified'
  }
);
```

**Session Statistics:**
```javascript
{
  totalEvents: 3,
  failedLocators: 1,      // 1 failure
  workedLocators: 1,      // 1 success
  elementsHealed: 1,      // 1 healed
  eventTypes: {
    "locator_failure": 1,
    "element_healed": 1,
    "verification_passed": 1
  }
}
```

---

### Scenario 4: Complex Session with Mixed Results

**Test:** "MovieBooking.spec.ts - Full booking flow"

```javascript
const startTime = Date.now();

// Heal 5 elements
const heals = [
  { name: 'Movie Selection', failed: 'button:has-text("Select")', working: '[data-testid=select-movie]' },
  { name: 'Seat Grid', failed: 'div.seats', working: '[data-testid=seat-grid]' },
  { name: 'Seat Button', failed: 'button.seat', working: '[data-testid=seat-btn]' },
  { name: 'Checkout Button', failed: 'button:has-text("Pay Now")', working: '[data-testid=checkout]' },
  { name: 'Confirm Button', failed: 'button:contains("Confirm")', working: '[data-testid=confirm-btn]' }
];

heals.forEach(heal => {
  logHealingEvent(
    'element_healed',
    heal.name,
    heal.failed,
    heal.working,
    { filePath: 'tests/MovieBooking.spec.ts', status: 'applied' }
  );
});

// All verifications pass except one
heals.slice(0, 4).forEach(heal => {
  logHealingEvent('verification_passed', heal.name, null, null, { filePath: 'tests/MovieBooking.spec.ts' });
});

// One fails verification
logHealingEvent(
  'verification_failed',
  'Confirm Button',
  null,
  null,
  { filePath: 'tests/MovieBooking.spec.ts', reason: 'Element not visible in DOM' }
);

// Get final statistics
const stats = getSessionStatistics();
console.log(`
Session Report:
✅ Elements Healed: ${stats.elementsHealed}
✅ Elements Verified: ${stats.workedLocators}
❌ Failures: ${stats.failedLocators}
⏱️  Duration: ${stats.sessionDuration}
`);
```

**Output:**
```
Session Report:
✅ Elements Healed: 5
✅ Elements Verified: 4
❌ Failures: 0
⏱️  Duration: 00:00:25
```

---

## 📊 HTML Report Rendering Examples

### Example 1: Success Section

```html
<div class="results">
  <h2>📝 Healing Events Log</h2>
  
  <div class="log-stats-grid">
    <div class="log-stat-card">
      <h4>Total Events</h4>
      <div class="value">6</div>
    </div>
    <div class="log-stat-card">
      <h4>Failed Locators</h4>
      <div class="value">0</div>
    </div>
    <div class="log-stat-card">
      <h4>Working Locators</h4>
      <div class="value">3</div>
    </div>
    <div class="log-stat-card">
      <h4>Elements Healed</h4>
      <div class="value">3</div>
    </div>
  </div>

  <h3>🎯 Locator Healing Details</h3>
  <div class="locator-heal-item">
    <div class="locator-header">
      <strong>Email Input Field</strong>
    </div>
    <div>
      <div>❌ Failed: page.locator("input[name='email']")</div>
      <div>✅ Working: page.locator("#user-email")</div>
      <div>🕐 10:30:15 AM</div>
    </div>
  </div>
  <!-- More items... -->
</div>
```

### Example 2: Event Timeline

```html
<h3>📋 Event Timeline</h3>
<div class="log-entry success">
  <div><strong>[ELEMENT_HEALED]</strong> 10:30:15 AM</div>
  <div>📌 Element: <strong>Search Button</strong></div>
  <div>❌ Failed: page.locator("button:contains('Search')")</div>
  <div>✅ Working: page.locator("[data-testid=search-btn]")</div>
</div>

<div class="log-entry success">
  <div><strong>[VERIFICATION_PASSED]</strong> 10:30:16 AM</div>
  <div>📌 Element: <strong>Search Button</strong></div>
</div>

<div class="log-entry failure">
  <div><strong>[LOCATOR_FAILURE]</strong> 10:30:17 AM</div>
  <div>📌 Element: <strong>Credit Card Field</strong></div>
  <div>❌ Failed: page.locator("input[aria-label='Card Number']")</div>
</div>
```

---

## 🔄 Real Test Execution Flow

### Before Healing
```
HomePage.spec.ts (FAILING)
❌ Search button locator is stale
❌ Login form selector changed
❌ Payment button has new ID
```

### During Healing
```
1. Analyze test with Gemini AI
2. Generate new locators:
   - Old: page.locator("button:contains('Search')")
   - New: page.locator("[data-testid=search-btn]")
   
3. Log Event 1: element_healed
   {
     elementName: "Search Button",
     failedLocator: "...",
     workingLocator: "...",
     status: "applied"
   }

4. Apply fix to test file
5. Re-run test

6. Log Event 2: verification_passed
   {
     elementName: "Search Button",
     status: "verified"
   }

7. Repeat for other elements...

8. Save logs: persistLogs()
   → healing-logs.json

9. Generate report with logs
   → healer-report-2025-01-19T10-30-20.html
```

### After Healing
```
✅ All 3 elements healed
✅ All 3 elements verified
📊 Report with complete audit trail
💾 JSON logs for analysis
```

---

## 💡 Advanced Usage: Batch Processing

```javascript
// Process multiple test files
const testFiles = [
  'tests/HomePage.spec.ts',
  'tests/AuthFlow.spec.ts',
  'tests/PaymentFlow.spec.ts'
];

for (const testFile of testFiles) {
  // Clear logs for fresh session
  clearLogs();
  
  console.log(`\n🔧 Healing ${testFile}...`);
  
  // Run healing for this file
  const results = await healTestFile(testFile);
  
  // Log healing events (custom integration)
  logHealingEvent('file_healed', testFile, null, null, {
    status: 'complete',
    healed: results.healed,
    verified: results.verified
  });
  
  // Persist logs for this file
  persistLogs();
  
  // Generate report for this file
  const reportPath = generateHtmlReport(results);
  console.log(`✅ Report: ${reportPath}`);
}
```

---

## 🎓 Learning Path

1. **Start Simple**: Log a single healing event
2. **Add Statistics**: Call `getSessionStatistics()` 
3. **Persist Logs**: Call `persistLogs()`
4. **Generate Report**: Watch logs auto-integrate
5. **Analyze Results**: Open HTML report and review
6. **Iterate**: Adjust logging based on needs

---

## 📈 Monitoring & Debugging

### Get Real-Time Stats
```javascript
const stats = getSessionStatistics();
if (stats.elementsHealed > 0) {
  const successRate = (stats.workedLocators / stats.failedLocators * 100).toFixed(2);
  console.log(`Success Rate: ${successRate}%`);
}
```

### Find Failed Events
```javascript
const logs = getHealingLogs();
const failures = logs.events.filter(e => e.eventType === 'locator_failure');
failures.forEach(f => {
  console.log(`❌ ${f.elementName}: ${f.details.error}`);
});
```

### Export for Analysis
```javascript
const logs = getHealingLogs();
const csv = logs.events.map(e => 
  `${e.timestamp},${e.elementName},${e.eventType},${e.workingLocator || 'N/A'}`
).join('\n');

fs.writeFileSync('healing-analysis.csv', csv);
```

---

**Version**: 2.0  
**Last Updated**: January 19, 2025  
**Examples**: 10+ scenarios  
**Status**: ✅ Ready for production use
