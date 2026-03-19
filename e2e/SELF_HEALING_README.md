# Self-Healing E2E Test System — Playwright + Gemini 2.5 Flash / Vertex AI

This folder contains a complete end-to-end test automation framework with **AI-powered self-healing** capabilities. When tests fail, Gemini 2.5 Flash / Gemini 3 Pro analyzes the failure and automatically suggests (or applies) fixes.

## 🎯 Quick Start

### 1. **Environment Setup**

Copy `.env.example` to `.env` and fill in your GCP credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```dotenv
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-service-account.json
GEMINI_MODEL=gemini-2.5-flash-preview-04-17
HEAL_CONFIDENCE_THRESHOLD=0.82
```

### 2. **Install Dependencies**

```bash
npm install
npx playwright install --with-deps
```

### 3. **Validate Environment**

```bash
npm run validate:env
```

This checks that all required env variables are set and GCP credentials are accessible.

### 4. **Run Tests**

```bash
# Standard Playwright test run
npm test

# Run with debug UI
npm run test:debug

# Watch mode (monitors test results for auto-healing)
npm run heal:watch
```

---

## 🔧 Self-Healing Workflow

### When a Test Fails:

```
Test Failure
    ↓
Event captured (error, DOM, screenshot)
    ↓
Security validation (sandbox, size checks)
    ↓
Failure classification (selector, timing, assertion, etc.)
    ↓
Gemini AI analysis (multimodal: text, DOM, screenshot)
    ↓
Patch generation (code fixes)
    ↓
Confidence check (>0.82 = auto-apply, <0.82 = human review)
    ↓
[If auto] Apply patch → Re-run test → Success/Failure
[If pending] Store proposal → Await human approval
    ↓
Audit log (immutable JSONL)
```

### Example: Stale Selector Healing

**Original failing test**:
```typescript
await page.locator('.btn-submit.special-class').click();
// Error: Element not found (class name changed in latest release)
```

**Gemini analysis**:
1. Scans DOM snapshot
2. Finds equivalent element with `data-testid="submit-button"`
3. Generates patch:
   ```typescript
   await page.locator('[data-testid="submit-button"]').click();
   ```
4. Sets confidence=0.92 (high) → auto-applies if threshold allows
5. Re-runs test → ✅ HEALED

---

## 🛠️ Commands Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all Playwright tests (headless) |
| `npm run test:debug` | Run with interactive Playwright Inspector |
| `npm run heal:watch` | File watcher mode (auto-detects failures) |
| `npm run validate:env` | Validate .env setup |
| `npm run audit:review` | View healing audit trail + statistics |
| `npm start` | Start HTTP webhook server (port 3099) |

---

## 📡 Webhook Integration

The self-healing server can be triggered via HTTP webhook for CI/CD pipelines:

### Endpoint: `POST /heal`

**Headers**:
- `X-Webhook-Signature: sha256=<hmac>` (HMAC signature verification)
- `Content-Type: application/json`

**Request Body**:
```json
{
  "testFile": "tests/auth.spec.ts",
  "testName": "should login successfully",
  "errorMessage": "Element not found: .btn-login",
  "stackTrace": "at auth.spec.ts:42:10",
  "testCode": "await page.locator('.btn-login').click();",
  "domSnapshot": "<html>...</html>",
  "failedSelector": ".btn-login",
  "errorType": "SELECTOR_STALE",
  "screenshotPath": "./artifacts/screenshots/failure-abc123.png"
}
```

**Response**:
```json
{
  "healingId": "abc123xyz789",
  "status": "HEALED",
  "aiResponse": {
    "confidence": 0.92,
    "patches": [...]
  }
}
```

### Generate HMAC Signature (Node.js):

```javascript
import crypto from 'crypto';

const secret = process.env.WEBHOOK_SECRET;
const body = JSON.stringify(event);
const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

// Send header: X-Webhook-Signature: sha256=<signature>
```

---

## 🔐 Security & Safety

### Input Validation
- Size caps (DOM < 100KB, test code < 10KB)
- Prompt injection pattern detection
- Dangerous code pattern scanning (eval, exec, child_process, etc.)

### Patch Validation
- Syntax checking via VM script parser
- File path allowlist (only `tests/`, `e2e/`, `playwright/` directories)
- Secret/credential scanning (AWS keys, JWT, etc.)
- Patch size limit (50 lines max by default)

### Confidence Gating
- Low confidence (<0.82) → Requires human approval
- Assertion changes → Always requires approval
- High confidence (>0.90) + low-risk patch → Auto-apply

### Audit Trail
- Immutable append-only JSONL log (`artifacts/heal-audit.jsonl`)
- Tracks: healing ID, timestamp, failure class, confidence, patches, approval status
- Retained for compliance (90+ days recommended)

---

## 📊 Monitoring & Analytics

### View Audit Trail:

```bash
npm run audit:review
```

Output:
```
📊 Self-Healing Audit Trail
Entries: 127

📈 Statistics:
Total events: 127
Average confidence: 0.87

By event type:
  • BLOCKED: 3
  • COMPLETE: 89
  • HEAL_START: 95
  • PENDING_APPROVAL: 12
  • STAGE: 412

🎯 Healing Summary:
Healing attempts: 95
Successfully healed: 78
Blocked (security): 3
Pending approval: 12
Success rate: 82.1%
```

---

## 🚀 Failure Classification

Gemini automatically categorizes test failures:

| Class | Trigger | Healing Strategy |
|-------|---------|------------------|
| `SELECTOR_STALE` | Element not found | DOM re-scan + new selector |
| `TIMING_FLAKINESS` | Timeout / race condition | Increase wait timeout |
| `ASSERTION_DRIFT` | Value mismatch | Update expected value (approval required) |
| `NETWORK_FAULT` | API failure (5xx, connection refused) | Mock API or increase timeout |
| `AUTH_DRIFT` | 401/403 unauthorized | Refresh token / re-login injection |
| `ENV_MISMATCH` | Wrong baseURL or env var | Correct config or env variable |
| `LAYOUT_SHIFT` | Coordinate/visual change | Update coordinates or use semantic selectors |

---

## 💡 Best Practices

### For Test Stability:
1. **Use semantic selectors** instead of coordinates:
   - ✅ `page.getByRole('button', { name: 'Submit' })`
   - ❌ `page.locator('[class*="btn"][style*="margin"]')`

2. **Add `data-testid` attributes** to critical elements:
   ```html
   <button data-testid="submit-button">Submit</button>
   ```

3. **Avoid hard-coded timeouts**:
   ```typescript
   // ❌ BAD:
   await page.waitForTimeout(2000);

   // ✅ GOOD:
   await expect(page.locator('button')).toBeVisible({ timeout: 5000 });
   ```

4. **Centralize expected values**:
   ```typescript
   const config = {
     expectedTitle: 'Welcome Back',
     apiTimeout: 10000,
   };
   ```

### For Healing Success:
1. **Provide rich context** in failure webhook:
   - Full test code snippet
   - DOM snapshot (`page.content()`)
   - Screenshot on failure
   - Network request log

2. **Set reasonable confidence threshold** (0.75–0.85)
   - Too low (0.5): Auto-applies risky fixes
   - Too high (0.95): Escalates stable fixes to human review

3. **Require approval for sensitive changes**:
   - Auth flow modifications
   - API endpoint changes
   - Assertion value updates

---

## 🔧 Customization

### Adjust Healing Aggressiveness:

```dotenv
# Auto-apply fixes above this confidence (0.0–1.0)
HEAL_CONFIDENCE_THRESHOLD=0.82

# Require human approval for these changes
HEAL_ASSERTION_APPROVAL=true

# Max patches per healing attempt
HEAL_MAX_PATCH_LINES=50

# Retry strategy
HEAL_MAX_RETRIES=3
HEAL_RETRY_DELAY_MS=2000
```

### Add Custom Failure Classification:

Edit `src/classifiers/failure-classifier.js`:

```javascript
const CLASSIFICATION_RULES = [
  {
    class: 'MY_CUSTOM_ERROR',
    patterns: [/my custom error pattern/i],
  },
  // ... rest
];
```

### Create Custom Prompt Template:

Add `prompts/my-custom-heal.md`:

```markdown
# My Custom Healing Context

## Instructions
...

## Response Template
```json
{ ... }
```
```

---

## 📚 File Structure

```
e2e/
├── src/
│   ├── index.js                    # HTTP server entry point
│   ├── orchestrator.js             # Main healing pipeline
│   ├── gemini-client.js            # Vertex AI / Gemini integration
│   ├── prompt-builder.js           # Prompt template engine
│   ├── patch-applicator.js         # Code patch application
│   ├── validate-env.js             # Environment validation
│   ├── watcher.js                  # File watcher mode
│   ├── audit-viewer.js             # Audit trail viewer
│   ├── classifiers/
│   │   └── failure-classifier.js   # Error classification
│   ├── security/
│   │   ├── validator.js            # Input/output security checks
│   │   └── secret-scanner.js       # Credential leak detection
│   └── reporters/
│       └── audit-logger.js         # Immutable audit trail logger
├── prompts/
│   ├── system-prompt.md            # Master system prompt
│   ├── selector-heal.md            # Stale selector healing
│   ├── timing-heal.md              # Timing/flakiness healing
│   ├── assertion-heal.md           # Assertion drift healing
│   ├── network-heal.md             # Network fault healing
│   ├── auth-heal.md                # Auth/session healing
│   ├── env-heal.md                 # Environment mismatch healing
│   └── layout-heal.md              # Visual/layout shift healing
├── secrets/                        # GCP credentials (never commit)
├── artifacts/
│   ├── screenshots/                # Failure screenshots
│   ├── patches/                    # Backups of original files
│   └── heal-audit.jsonl            # Immutable audit trail
├── tests/                          # Playwright test files
├── .env.example                    # Environment template
├── .env.schema.json                # Environment validation schema
└── package.json
```

---

## 🐛 Troubleshooting

### Error: "GCP credentials not found"
```bash
# Ensure GOOGLE_APPLICATION_CREDENTIALS points to valid JSON file
ls -la ./secrets/gcp-service-account.json
```

### Error: "Gemini API quota exceeded"
- Check GCP project quotas in Cloud Console
- Reduce `HEAL_MAX_RETRIES` to minimize API calls
- Increase `HEAL_CONFIDENCE_THRESHOLD` to auto-apply fewer fixes

### Test still fails after patching
- Check `npm run audit:review` to see patch details
- Verify patch was actually applied (file changed?)
- Manually review the fix; it may need human adjustment

### High false positive rate
- Increase `HEAL_CONFIDENCE_THRESHOLD` (0.90+)
- Reduce number of patches per healing (`HEAL_MAX_PATCH_LINES`)
- Add more detailed DOM snapshots and screenshots

---

## 📖 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Vertex AI Gemini API](https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/api-quickstart)
- [GCP Service Accounts](https://cloud.google.com/docs/authentication/getting-started)

---

## 📝 License

Part of the ShowGlow E2E testing framework. See root LICENSE file.

---

**Last Updated**: March 2026  
**Gemini Models**: 2.5 Flash, 2.0 Pro, 3.0 Pro  
**Node.js**: >=20.0.0
