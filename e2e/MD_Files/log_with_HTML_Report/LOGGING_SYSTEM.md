# Healing Events Logging System

## Overview

The advanced logging system captures detailed information about every healing event, including timestamps, element names, failed locators, working locators, and verification results. All logs are persisted to `healing-logs.json` and integrated into the HTML report.

---

## Architecture

### 1. **In-Memory Log Storage**

```javascript
let healingLogs = {
  sessionId: 'healing-1705699805000-a1b2c3d4e',
  startTime: '2025-01-19T10:30:05.000Z',
  events: [],
  statistics: {
    totalEvents: 0,
    failedLocators: 0,
    workedLocators: 0,
    elementsHealed: 0
  }
};
```

**Components:**
- `sessionId`: Unique identifier for each healing session (timestamp + random)
- `startTime`: ISO timestamp when healing started
- `events`: Array of log entries (populated during healing)
- `statistics`: Real-time counters tracking healing progress

### 2. **Log Entry Structure**

Each healing event creates a log entry:

```javascript
{
  timestamp: '2025-01-19T10:30:15.234Z',
  sessionId: 'healing-1705699805000-a1b2c3d4e',
  eventType: 'element_healed',  // or 'locator_failure', 'locator_found', 'verification_passed', etc.
  elementName: 'Search Input Button',
  failedLocator: "page.locator('button:has-text(\"Search\")')",
  workingLocator: "page.locator('id=search-btn')",
  details: {
    filePath: 'tests/HomePage.spec.ts',
    status: 'applied',
    duration: 1250
  }
}
```

---

## Core Logging Functions

### `logHealingEvent(eventType, elementName, failedLocator, workingLocator, details)`

Records a healing event with all relevant details.

**Parameters:**
- `eventType` (string): Type of event ('locator_failure', 'locator_found', 'element_healed', 'verification_passed', 'verification_failed')
- `elementName` (string): Name/identifier of the element being healed
- `failedLocator` (string): The original failing locator string
- `workingLocator` (string): The new working locator (null if event is a failure)
- `details` (object): Additional context (file path, status, duration, error)

**Example:**

```javascript
logHealingEvent('element_healed', 'Login Button', 
  'page.locator("button:contains(Login)")',
  'page.locator("#login-btn")', 
  { filePath: 'tests/auth.spec.ts', status: 'applied' }
);
```

**Statistics Updated:**
- `totalEvents++`
- `failedLocators++` (if `eventType === 'locator_failure'`)
- `workedLocators++` (if `eventType === 'locator_found'`)
- `elementsHealed++` (if `eventType === 'element_healed'`)

---

### `persistLogs()`

Writes in-memory logs to `test-results/healing-logs.json`.

**Output File Structure:**

```json
{
  "sessionId": "healing-1705699805000-a1b2c3d4e",
  "startTime": "2025-01-19T10:30:05.000Z",
  "endTime": "2025-01-19T10:32:15.523Z",
  "events": [
    {
      "timestamp": "2025-01-19T10:30:15.234Z",
      "sessionId": "healing-1705699805000-a1b2c3d4e",
      "eventType": "element_healed",
      "elementName": "Search Input",
      "failedLocator": "original_locator",
      "workingLocator": "fixed_locator",
      "details": { ... }
    }
  ],
  "statistics": {
    "totalEvents": 12,
    "failedLocators": 3,
    "workedLocators": 9,
    "elementsHealed": 8,
    "sessionDuration": "00:02:10",
    "totalLogEntries": 12,
    "eventTypes": {
      "element_healed": 8,
      "verification_passed": 6,
      "locator_failure": 3
    }
  }
}
```

**Called automatically:**
- At the end of `heal()` function, before generating HTML report
- Creates directory if it doesn't exist

---

### `getHealingLogs()`

Returns the current in-memory log object (useful for accessing logs during runtime).

```javascript
const logs = getHealingLogs();
console.log(`Total events: ${logs.statistics.totalEvents}`);
console.log(`Success rate: ${(logs.statistics.workedLocators / logs.statistics.totalEvents * 100).toFixed(2)}%`);
```

---

### `getSessionStatistics()`

Returns computed statistics including duration and event type breakdown.

```javascript
{
  totalEvents: 12,
  failedLocators: 3,
  workedLocators: 9,
  elementsHealed: 8,
  sessionDuration: "00:02:10",  // HH:MM:SS format
  totalLogEntries: 12,
  eventTypes: {
    "element_healed": 8,
    "verification_passed": 6,
    "locator_failure": 3,
    "verification_failed": 2
  }
}
```

---

### `clearLogs()`

Resets in-memory logs (useful for batch processing multiple test suites).

```javascript
clearLogs();  // Fresh session ID, empty events, reset statistics
```

---

## Integration Points in Healing Workflow

### 1. **On Successful Fix Application**

```javascript
if (applyResult.success) {
  testResult.fixed = true;
  healingResults.fixedCount++;

  logHealingEvent('element_healed', test.title, 'original_locator', 'fixed_locator', {
    filePath: test.filePath,
    status: 'applied'
  });
```

### 2. **On Test Verification Passed**

```javascript
const verified = verifyFix(test.filePath);
if (verified) {
  testResult.verified = true;
  healingResults.verifiedCount++;

  logHealingEvent('verification_passed', test.title, null, null, {
    filePath: test.filePath,
    status: 'verified'
  });
}
```

### 3. **On Test Verification Failed**

```javascript
logHealingEvent('verification_failed', test.title, null, null, {
  filePath: test.filePath,
  status: 'unverified'
});
```

### 4. **On Fix Application Failure**

```javascript
logHealingEvent('locator_failure', test.title, 'attempted_fix', null, {
  error: applyResult.error
});
```

---

## HTML Report Integration

### Loading Logs in Report Generator

```javascript
// Automatically loads healing-logs.json
const healingLogs = loadHealingLogs();
```

### Display Sections in Report

#### 1. **Healing Events Statistics Card**

Shows:
- Total Events
- Failed Locators
- Working Locators
- Elements Healed

#### 2. **Locator Healing Details**

Displays all locator transformations:
```
🎯 Search Input Button
  ❌ Failed: page.locator('button:has-text("Search")')
  ✅ Working: page.locator('id=search-btn')
  🕐 10:30:15 AM
```

#### 3. **Event Timeline**

Chronological view of all healing events with:
- Event type and timestamp
- Element name
- Failed and working locators (where applicable)
- Duration if tracked

#### 4. **Session Info**

Footer section showing:
- Session ID
- Start time
- End time
- Session duration

---

## Usage Examples

### Example 1: Log a Simple Locator Fix

```javascript
logHealingEvent(
  'element_healed',
  'Login Button',
  'page.locator("button:contains(Login)")',
  'page.locator("[data-testid=login-btn]")',
  { filePath: 'tests/auth.spec.ts', duration: 450 }
);
```

### Example 2: Log a Locator Search Failure

```javascript
logHealingEvent(
  'locator_failure',
  'Submit Form',
  'page.locator("form#submit")',
  null,  // No working locator found yet
  { error: 'Element not found in DOM', retries: 3 }
);
```

### Example 3: Retrieve and Display Statistics

```javascript
const stats = getSessionStatistics();
console.log(`✅ Healed: ${stats.elementsHealed}`);
console.log(`❌ Failed: ${stats.failedLocators}`);
console.log(`✅ Verified: ${stats.workedLocators}`);
console.log(`⏱️  Duration: ${stats.sessionDuration}`);
```

### Example 4: Persist and Generate Report

```javascript
// After all healing is complete
persistLogs();  // Write healing-logs.json

// Generate HTML report (automatically loads logs)
const reportPath = generateHtmlReport(healingResults);
console.log(`📊 Report: ${reportPath}`);
```

---

## Event Types Reference

| Event Type | Triggered When | Increments Counter |
|------------|----------------|-------------------|
| `locator_failure` | Locator search fails | `failedLocators++` |
| `locator_found` | New working locator discovered | `workedLocators++` |
| `element_healed` | Fix applied to test file | `elementsHealed++` |
| `verification_passed` | Test passes after healing | — |
| `verification_failed` | Test still fails after fix | — |
| `fix_applied` | Code changes written to file | — |
| `rollback_completed` | File reverted to backup | — |

---

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| Healing Logs (JSON) | `test-results/healing-logs.json` | Persistent log storage |
| HTML Report | `test-results/healer-report-{timestamp}.html` | Interactive report with integrated logs |

---

## Best Practices

1. **Always Call `persistLogs()`** - Ensure logs are written before generating reports
2. **Use Descriptive Element Names** - Make logs readable in reports
3. **Include Relevant Details** - File paths, durations, and error messages aid debugging
4. **Group Related Events** - Events for the same element/test should have matching names
5. **Check Statistics** - Use `getSessionStatistics()` to monitor healing progress in real-time

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HEALER_VERBOSE` | `false` | Enable verbose logging to console |
| `BACKUP_RETENTION_DAYS` | `7` | Auto-cleanup old log backups |

Enable verbose logging:
```bash
HEALER_VERBOSE=true node gemini-healer.js --auto-fix
```

---

## Troubleshooting

### Logs Not Appearing in Report

**Solution**: Ensure `persistLogs()` is called before `generateHtmlReport()`. The report automatically loads `test-results/healing-logs.json`.

### Incomplete Event Details

**Solution**: Verify all parameters are passed to `logHealingEvent()`, especially `details` object with file path and status.

### Large Log Files

**Solution**: Old backups are automatically cleaned up after `BACKUP_RETENTION_DAYS`. Manually delete `test-results/healing-logs.json` if needed.

---

## Example Healing Session Output

```
✨ Healing Session Started
📝 [LOG] element_healed: Search Button | Failed: old_locator | Working: new_locator
📝 [LOG] verification_passed: Search Button
📝 [LOG] element_healed: Login Form | Failed: form_locator | Working: id=login
✅ Healed: 2 elements
⏱️  Duration: 2 minutes 15 seconds
💾 Logs persisted to: test-results/healing-logs.json
📊 HTML Report: test-results/healer-report-2025-01-19T10-30-05.html
```

---

For more details, see:
- [gemini-healer.js](gemini-healer.js) - Logging implementation
- [healer-report-generator.js](healer-report-generator.js) - Report integration
