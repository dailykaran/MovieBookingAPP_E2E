# Healing Logging System - Quick Reference

## ⚡ Quick Start

### Basic Usage

```javascript
// Log a successful locator fix
logHealingEvent('element_healed', 'Login Button', 
  'page.locator("button:contains(Login)")',
  'page.locator("#login-btn")',
  { filePath: 'tests/auth.spec.ts' }
);

// Get statistics
const stats = getSessionStatistics();
console.log(`✅ Fixed: ${stats.elementsHealed}, ❌ Failed: ${stats.failedLocators}`);

// Save logs
persistLogs();

// Generate report (loads logs automatically)
generateHtmlReport(healingResults);
```

---

## 📋 Core Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `logHealingEvent(eventType, name, failed, working, details)` | Record healing event | Log entry object |
| `persistLogs()` | Write to `healing-logs.json` | File path |
| `getSessionStatistics()` | Get current statistics | Stats object |
| `getHealingLogs()` | Get in-memory logs | Logs object |
| `clearLogs()` | Reset logs (new session) | void |

---

## 🎯 Event Types

```javascript
'locator_failure'    // Locator search failed
'locator_found'      // New locator discovered
'element_healed'     // Fix applied
'verification_passed' // Test passes after healing
'verification_failed' // Test fails after fix
```

---

## 📊 Automatic Integration Points

Logs are automatically recorded at:

1. ✅ **Successful Fix Application**
   ```javascript
   logHealingEvent('element_healed', test.title, oldLocator, newLocator, { ... })
   ```

2. ✅ **Verification Passed**
   ```javascript
   logHealingEvent('verification_passed', test.title, null, null, { ... })
   ```

3. ❌ **Verification Failed**
   ```javascript
   logHealingEvent('verification_failed', test.title, null, null, { ... })
   ```

4. ❌ **Fix Application Failed**
   ```javascript
   logHealingEvent('locator_failure', test.title, attemptedFix, null, { error })
   ```

---

## 📁 File Paths

| File | Location |
|------|----------|
| Healing Logs | `test-results/healing-logs.json` |
| HTML Report | `test-results/healer-report-{timestamp}.html` |

---

## 🧪 Log Entry Structure

```json
{
  "timestamp": "2025-01-19T10:30:15.234Z",
  "sessionId": "healing-1705699805000-a1b2c3d4e",
  "eventType": "element_healed",
  "elementName": "Login Button",
  "failedLocator": "page.locator('button:contains(Login)')",
  "workingLocator": "page.locator('#login-btn')",
  "details": {
    "filePath": "tests/auth.spec.ts",
    "status": "applied",
    "duration": 1250
  }
}
```

---

## 📈 Statistics Format

```javascript
{
  totalEvents: 12,
  failedLocators: 3,
  workedLocators: 9,
  elementsHealed: 8,
  sessionDuration: "00:02:10",
  totalLogEntries: 12,
  eventTypes: {
    "element_healed": 8,
    "verification_passed": 6,
    "locator_failure": 3
  }
}
```

---

## 🎨 HTML Report Sections

### Auto-Generated from Logs

1. **Healing Events Statistics** - Card showing counters
2. **Locator Healing Details** - Failed → Working transformations
3. **Event Timeline** - Chronological event list
4. **Session Info** - Session ID, start/end times

---

## 💾 Workflow

```
heal() starts
  ↓
healing events recorded via logHealingEvent()
  ↓
in-memory statistics updated
  ↓
persistLogs() called at end
  ↓
healing-logs.json written to disk
  ↓
generateHtmlReport() loads logs automatically
  ↓
HTML report with integrated logs generated
```

---

## 🔍 Example Session

```bash
$ HEALER_VERBOSE=true node gemini-healer.js --auto-fix

📝 [LOG] element_healed: Login Button | Failed: old | Working: new
📝 [LOG] verification_passed: Login Button
✅ Healed: 1 elements
✅ Verified: 1 elements
💾 Logs persisted to: test-results/healing-logs.json
📊 HTML Report: test-results/healer-report-2025-01-19T10-30-05.html
```

---

## ⚙️ Configuration

Enable verbose logging:
```bash
export HEALER_VERBOSE=true
node gemini-healer.js --auto-fix
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs missing from HTML | Ensure `persistLogs()` called before report generation |
| Empty statistics | Check that `logHealingEvent()` is called with correct event types |
| Large log files | Old logs auto-cleanup after `BACKUP_RETENTION_DAYS` (default: 7) |

---

## 📚 Full Documentation

See [LOGGING_SYSTEM.md](LOGGING_SYSTEM.md) for complete documentation.

---

**Generated:** January 19, 2025  
**System:** Gemini-Powered Playwright Test Healer v2.0
