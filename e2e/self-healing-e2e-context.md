# 🧠 Self-Healing E2E Test Mechanism — Context Prompt File
### Powered by Gemini 2.5 Flash / Gemini 3 Pro + Vertex AI Agent (Node.js)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview)
2. [Environment Configuration](#environment)
3. [Node.js Project Setup](#project-setup)
4. [Vertex AI Agent Configuration](#vertex-agent)
5. [Prompt Engineering — Step-by-Step](#prompt-engineering)
6. [Self-Healing Pipeline Stages](#pipeline)
7. [Security Checks & Hardening](#security)
8. [Self-Heal Steps Reference](#self-heal-steps)
9. [Error Classification Schema](#error-schema)
10. [Full Node.js Implementation](#implementation)
11. [Evaluation & Feedback Loop](#evaluation)

---

## 1. Overview & Architecture {#overview}

```
E2E Test Runner (Playwright / Cypress / WebdriverIO)
         │
         ▼  [Test Failure Detected]
┌─────────────────────────────────┐
│     Failure Capture Layer       │  ◄─ Screenshot, DOM snapshot,
│  (error type, selector, stack)  │     network logs, console errors
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│    Self-Healing Orchestrator    │  ◄─ Node.js microservice
│     (vertexai-agent-sdk)        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Gemini 2.5 Flash / 3 Pro       │  ◄─ Multimodal: screenshot +
│   via Vertex AI Agent           │     DOM + error context
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│    Healing Action Generator     │  ◄─ Outputs: new selector,
│    + Patch Applicator           │     retry strategy, test patch
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Retry Runner + Audit Logger    │  ◄─ Re-runs patched test,
│  (Security-gated)               │     stores healing record
└─────────────────────────────────┘
```

### Supported Failure Types
| Failure Class | Trigger | Healing Strategy |
|---|---|---|
| `SELECTOR_STALE` | Element not found | DOM re-scan + selector regeneration |
| `TIMING_FLAKINESS` | Timeout / race condition | Dynamic wait injection |
| `LAYOUT_SHIFT` | Visual mismatch | Coordinate recalibration |
| `NETWORK_FAULT` | API/mock failure | Request stub repair |
| `AUTH_DRIFT` | Token/session expiry | Auth refresh injection |
| `ENV_MISMATCH` | Wrong baseURL/env | Environment reconciliation |
| `ASSERTION_DRIFT` | Value changed in UI | Assertion recalibration with approval |

---

## 2. Environment Configuration {#environment}

### `.env` — All Required Variables

```dotenv
# ─── Google Cloud / Vertex AI ───────────────────────────────
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-service-account.json

# ─── Gemini Model Selection ──────────────────────────────────
# Options: gemini-2.5-flash-preview-04-17 | gemini-2.0-pro-exp
GEMINI_MODEL=gemini-2.5-flash-preview-04-17
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.2          # Low temp for deterministic repairs
GEMINI_TOP_P=0.85

# ─── Vertex AI Agent ─────────────────────────────────────────
VERTEX_AGENT_ID=your-agent-resource-id
VERTEX_AGENT_ENV=production      # production | staging | dev
VERTEX_REASONING_ENGINE=true     # Enable agent reasoning engine

# ─── Self-Healing Runtime ────────────────────────────────────
HEAL_MAX_RETRIES=3
HEAL_RETRY_DELAY_MS=2000
HEAL_CONFIDENCE_THRESHOLD=0.82   # Minimum AI confidence to auto-apply
HEAL_REQUIRE_APPROVAL=false      # true = human-in-the-loop for patches
HEAL_ASSERTION_APPROVAL=true     # Always require human for assertion changes
HEAL_TIMEOUT_MS=30000

# ─── Test Framework ──────────────────────────────────────────
TEST_FRAMEWORK=playwright        # playwright | cypress | webdriverio
TEST_BASE_URL=https://your-app.example.com
TEST_SCREENSHOT_DIR=./artifacts/screenshots
TEST_PATCH_DIR=./artifacts/patches
TEST_AUDIT_LOG=./artifacts/heal-audit.jsonl

# ─── Security ────────────────────────────────────────────────
HEAL_ALLOWED_SELECTORS_ONLY=true
HEAL_PATCH_SANDBOX=true
HEAL_MAX_PATCH_LINES=50          # Hard cap on auto-applied code changes
HEAL_DENYLIST_PATTERNS=eval,Function,exec,child_process,fs.write
HEAL_SECRET_SCAN=true            # Scan patches for leaked credentials
WEBHOOK_SECRET=your-hmac-secret  # For inbound failure webhook auth
```

### `.env.schema.json` — Validation Schema

```json
{
  "required": [
    "GCP_PROJECT_ID", "GCP_LOCATION", "GOOGLE_APPLICATION_CREDENTIALS",
    "GEMINI_MODEL", "VERTEX_AGENT_ID", "HEAL_MAX_RETRIES",
    "HEAL_CONFIDENCE_THRESHOLD", "TEST_FRAMEWORK", "TEST_BASE_URL",
    "WEBHOOK_SECRET"
  ],
  "types": {
    "HEAL_MAX_RETRIES": "integer",
    "HEAL_CONFIDENCE_THRESHOLD": "float",
    "HEAL_REQUIRE_APPROVAL": "boolean",
    "VERTEX_REASONING_ENGINE": "boolean"
  }
}
```

---

## 3. Node.js Project Setup {#project-setup}

### `package.json`

```json
{
  "name": "self-healing-e2e",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "start": "node src/index.js",
    "heal:watch": "node src/watcher.js",
    "test:unit": "vitest run",
    "audit:review": "node src/audit-viewer.js",
    "validate:env": "node src/validate-env.js"
  },
  "dependencies": {
    "@google-cloud/vertexai": "^1.7.0",
    "@google-cloud/aiplatform": "^3.22.0",
    "playwright": "^1.45.0",
    "dotenv": "^16.4.5",
    "zod": "^3.23.8",
    "winston": "^3.13.0",
    "ajv": "^8.16.0",
    "crypto": "builtin",
    "p-retry": "^6.2.0",
    "fast-redact": "^3.3.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### Directory Structure

```
self-healing-e2e/
├── src/
│   ├── index.js                   # Entry point
│   ├── orchestrator.js            # Main healing pipeline
│   ├── gemini-client.js           # Vertex AI / Gemini SDK wrapper
│   ├── prompt-builder.js          # Prompt construction engine
│   ├── patch-applicator.js        # Safe code patch application
│   ├── security/
│   │   ├── validator.js           # Input/output security checks
│   │   ├── secret-scanner.js      # Credential leak detection
│   │   └── sandbox.js             # Patch execution sandbox
│   ├── classifiers/
│   │   └── failure-classifier.js  # Error type classification
│   ├── reporters/
│   │   └── audit-logger.js        # Immutable audit trail
│   └── validate-env.js            # Env validation on startup
├── prompts/
│   ├── system-prompt.md           # Master system prompt
│   ├── selector-heal.md           # Selector healing prompt
│   ├── timing-heal.md             # Timing/flakiness healing prompt
│   ├── assertion-heal.md          # Assertion drift prompt
│   └── network-heal.md            # Network fault healing prompt
├── secrets/
│   └── gcp-service-account.json   # Never committed; in .gitignore
├── artifacts/
│   ├── screenshots/
│   ├── patches/
│   └── heal-audit.jsonl
├── .env
├── .env.schema.json
├── .gitignore
└── package.json
```

---

## 4. Vertex AI Agent Configuration {#vertex-agent}

### `src/gemini-client.js`

```javascript
// src/gemini-client.js
import { VertexAI } from '@google-cloud/vertexai';
import { readFileSync } from 'fs';
import { logger } from './reporters/audit-logger.js';

export class GeminiHealingClient {
  #vertexAI;
  #model;
  #config;

  constructor(config = {}) {
    this.#config = {
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_LOCATION,
      model: process.env.GEMINI_MODEL,
      maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS, 10),
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE),
      topP: parseFloat(process.env.GEMINI_TOP_P),
      ...config,
    };

    this.#vertexAI = new VertexAI({
      project: this.#config.project,
      location: this.#config.location,
    });

    this.#model = this.#vertexAI.getGenerativeModel({
      model: this.#config.model,
      generationConfig: {
        maxOutputTokens: this.#config.maxTokens,
        temperature: this.#config.temperature,
        topP: this.#config.topP,
        responseMimeType: 'application/json',  // Force JSON output
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_LOW_AND_ABOVE' },
      ],
    });
  }

  /**
   * Send a multimodal healing request (text + optional screenshot).
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @param {string|null} screenshotPath  – base64 PNG path
   * @returns {Promise<object>}           – parsed JSON response
   */
  async requestHealing(systemPrompt, userPrompt, screenshotPath = null) {
    const parts = [{ text: userPrompt }];

    if (screenshotPath) {
      const imageData = readFileSync(screenshotPath, { encoding: 'base64' });
      parts.unshift({
        inlineData: { mimeType: 'image/png', data: imageData },
      });
    }

    const request = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts }],
    };

    logger.info('Gemini request dispatched', {
      model: this.#config.model,
      hasScreenshot: !!screenshotPath,
    });

    const result = await this.#model.generateContent(request);
    const raw = result.response.candidates[0]?.content?.parts[0]?.text ?? '{}';

    try {
      return JSON.parse(raw);
    } catch {
      logger.error('Gemini response not valid JSON', { raw });
      throw new Error('Gemini returned non-JSON output');
    }
  }
}
```

---

## 5. Prompt Engineering — Step-by-Step {#prompt-engineering}

### Step 1 — Craft the Master System Prompt

**File:** `prompts/system-prompt.md`

```markdown
# SYSTEM: Self-Healing E2E Test Agent

You are an expert test automation engineer and web application specialist.
Your role is to analyze failing end-to-end test cases and produce precise,
minimal, safe repairs.

## Core Directives

1. ALWAYS return a valid JSON object matching the HealingResponse schema.
2. NEVER suggest changes that: introduce new test logic, alter business assertions
   without explicit approval, modify authentication flows, or use dynamic code
   execution (eval, Function constructor).
3. PREFER the least invasive fix. Selector change > test logic change > assertion change.
4. SET confidence between 0.0–1.0. If confidence < 0.82, set requiresApproval = true.
5. INCLUDE a human-readable explanation in every response.
6. CLASSIFY the root cause using the provided error taxonomy.
7. SCAN the existing DOM snapshot before suggesting new selectors — prefer
   data-testid, aria-label, and role selectors in that priority order.

## Output Schema (strict)

{
  "healingId": "string (UUID v4)",
  "failureClass": "SELECTOR_STALE|TIMING_FLAKINESS|LAYOUT_SHIFT|NETWORK_FAULT|AUTH_DRIFT|ENV_MISMATCH|ASSERTION_DRIFT",
  "confidence": 0.0–1.0,
  "requiresApproval": boolean,
  "explanation": "string — plain English root cause + rationale",
  "patches": [
    {
      "file": "relative/path/to/test-file.spec.js",
      "lineStart": integer,
      "lineEnd": integer,
      "original": "exact original code string",
      "replacement": "exact replacement code string",
      "patchType": "SELECTOR|WAIT|ASSERTION|NETWORK_STUB|ENV_VALUE"
    }
  ],
  "retryStrategy": {
    "maxRetries": integer,
    "delayMs": integer,
    "backoffFactor": 1.0–3.0
  },
  "preventionHints": ["string"]
}
```

### Step 2 — Build the Selector Healing Prompt

**File:** `prompts/selector-heal.md`

```markdown
# Selector Healing Context

## Failed Test Snippet
```
{{FAILED_TEST_CODE}}
```

## Error Message
```
{{ERROR_MESSAGE}}
```

## DOM Snapshot (relevant fragment)
```html
{{DOM_SNAPSHOT}}
```

## Screenshot
[Attached inline if available]

## Current Selector That Failed
`{{FAILED_SELECTOR}}`

## Instructions
1. Analyze the DOM snapshot to find the best alternative selector.
2. Prioritize: `data-testid` > `aria-label` > `role+name` > CSS class > XPath.
3. Return ONLY the JSON schema defined in the system prompt.
4. If multiple candidates exist, list them in `preventionHints` ranked by stability.
5. Do NOT suggest selectors based on dynamic IDs, timestamps, or random strings.
```

### Step 3 — Build the Timing / Flakiness Healing Prompt

**File:** `prompts/timing-heal.md`

```markdown
# Timing & Flakiness Healing Context

## Failed Test Snippet
```
{{FAILED_TEST_CODE}}
```

## Error Type: {{ERROR_TYPE}}
## Timeout Value Used: {{TIMEOUT_MS}}ms
## Network Request Log (last 10 entries)
```
{{NETWORK_LOG}}
```

## Instructions
1. Identify whether the failure is: eager assertion, animation delay, API latency,
   or hydration delay.
2. Suggest the minimum wait strategy:
   - `waitForSelector` with increased timeout
   - `waitForLoadState('networkidle')`
   - `waitForResponse` pattern
   - `expect(locator).toBeVisible({ timeout: N })`
3. NEVER use `page.waitForTimeout` (hard sleep) unless timeout > 5000ms and justified.
4. Return JSON schema.
```

### Step 4 — Build the Assertion Drift Prompt

**File:** `prompts/assertion-heal.md`

```markdown
# Assertion Drift Healing Context

⚠️  ASSERTION CHANGES ALWAYS REQUIRE HUMAN APPROVAL.
Set `requiresApproval: true` unconditionally for this failure class.

## Failed Assertion
```
{{FAILED_ASSERTION_CODE}}
```

## Expected Value
`{{EXPECTED_VALUE}}`

## Actual Value Observed
`{{ACTUAL_VALUE}}`

## Application Changelog (if available)
```
{{CHANGELOG_CONTEXT}}
```

## Instructions
1. Determine whether this is a legitimate product change or a regression.
2. If product change: propose updated assertion with explanation.
3. If regression: flag as `requiresApproval: true` and include both old and new
   values in explanation.
4. NEVER auto-apply assertion changes. Always set requiresApproval = true.
```

### Step 5 — Prompt Builder Function

**File:** `src/prompt-builder.js`

```javascript
// src/prompt-builder.js
import { readFileSync } from 'fs';
import { resolve } from 'path';

const TEMPLATE_DIR = resolve('./prompts');

/**
 * Load a prompt template and inject context variables.
 * @param {string} templateName  – file name without .md
 * @param {object} variables     – key/value pairs for {{PLACEHOLDER}} substitution
 * @returns {string}
 */
export function buildPrompt(templateName, variables = {}) {
  const templatePath = resolve(TEMPLATE_DIR, `${templateName}.md`);
  let template = readFileSync(templatePath, 'utf8');

  // Replace all {{PLACEHOLDER}} tokens
  for (const [key, value] of Object.entries(variables)) {
    const safeValue = sanitizePromptInput(String(value ?? ''));
    template = template.replaceAll(`{{${key}}}`, safeValue);
  }

  // Verify no unfilled placeholders remain
  const unfilled = template.match(/\{\{[A-Z_]+\}\}/g);
  if (unfilled) {
    throw new Error(`Prompt has unfilled variables: ${unfilled.join(', ')}`);
  }

  return template;
}

/**
 * Strip potentially dangerous injection patterns from user-provided
 * context before it enters the prompt.
 */
function sanitizePromptInput(input) {
  return input
    .replace(/ignore (all )?previous instructions?/gi, '[REDACTED]')
    .replace(/you are now/gi, '[REDACTED]')
    .replace(/<script[\s\S]*?<\/script>/gi, '[SCRIPT_REMOVED]')
    .replace(/\{\{.*?\}\}/g, '[TEMPLATE_REMOVED]')   // prevent nested injection
    .slice(0, 8000);                                   // hard length cap
}
```

---

## 6. Self-Healing Pipeline Stages {#pipeline}

### `src/orchestrator.js`

```javascript
// src/orchestrator.js
import pRetry from 'p-retry';
import { GeminiHealingClient } from './gemini-client.js';
import { buildPrompt } from './prompt-builder.js';
import { FailureClassifier } from './classifiers/failure-classifier.js';
import { SecurityValidator } from './security/validator.js';
import { PatchApplicator } from './patch-applicator.js';
import { AuditLogger } from './reporters/audit-logger.js';
import { readFileSync } from 'fs';

const SYSTEM_PROMPT = readFileSync('./prompts/system-prompt.md', 'utf8');
const CONFIDENCE_THRESHOLD = parseFloat(process.env.HEAL_CONFIDENCE_THRESHOLD);

export class SelfHealingOrchestrator {
  #client;
  #classifier;
  #validator;
  #patcher;
  #logger;

  constructor() {
    this.#client    = new GeminiHealingClient();
    this.#classifier = new FailureClassifier();
    this.#validator  = new SecurityValidator();
    this.#patcher    = new PatchApplicator();
    this.#logger     = new AuditLogger();
  }

  /**
   * Main entry point: receive a test failure event and attempt self-healing.
   * @param {TestFailureEvent} event
   * @returns {Promise<HealingResult>}
   */
  async heal(event) {
    const healingId = crypto.randomUUID();
    this.#logger.start(healingId, event);

    // ── Stage 1: Classify failure ─────────────────────────────────────
    const failureClass = this.#classifier.classify(event);
    this.#logger.stage('CLASSIFY', { failureClass });

    // ── Stage 2: Security — validate inbound event ────────────────────
    const inputCheck = this.#validator.validateInput(event);
    if (!inputCheck.safe) {
      this.#logger.blocked(healingId, inputCheck.reason);
      return { healingId, status: 'BLOCKED', reason: inputCheck.reason };
    }

    // ── Stage 3: Build prompt ─────────────────────────────────────────
    const templateMap = {
      SELECTOR_STALE:   'selector-heal',
      TIMING_FLAKINESS: 'timing-heal',
      ASSERTION_DRIFT:  'assertion-heal',
      NETWORK_FAULT:    'network-heal',
      default:          'selector-heal',
    };
    const templateName = templateMap[failureClass] ?? templateMap.default;

    const userPrompt = buildPrompt(templateName, {
      FAILED_TEST_CODE:  event.testCode,
      ERROR_MESSAGE:     event.errorMessage,
      DOM_SNAPSHOT:      event.domSnapshot,
      FAILED_SELECTOR:   event.failedSelector ?? '',
      ERROR_TYPE:        event.errorType ?? '',
      TIMEOUT_MS:        event.timeoutMs ?? 5000,
      NETWORK_LOG:       JSON.stringify(event.networkLog ?? [], null, 2),
      FAILED_ASSERTION_CODE: event.assertionCode ?? '',
      EXPECTED_VALUE:    event.expectedValue ?? '',
      ACTUAL_VALUE:      event.actualValue ?? '',
      CHANGELOG_CONTEXT: event.changelogContext ?? 'Not available',
    });

    // ── Stage 4: Gemini AI analysis (with retry) ──────────────────────
    const aiResponse = await pRetry(
      () => this.#client.requestHealing(SYSTEM_PROMPT, userPrompt, event.screenshotPath),
      { retries: 2, minTimeout: 2000 }
    );

    this.#logger.stage('AI_RESPONSE', { confidence: aiResponse.confidence });

    // ── Stage 5: Validate AI output ───────────────────────────────────
    const outputCheck = this.#validator.validateOutput(aiResponse);
    if (!outputCheck.safe) {
      this.#logger.blocked(healingId, outputCheck.reason);
      return { healingId, status: 'BLOCKED', reason: outputCheck.reason };
    }

    // ── Stage 6: Confidence gate ──────────────────────────────────────
    if (aiResponse.confidence < CONFIDENCE_THRESHOLD || aiResponse.requiresApproval) {
      this.#logger.pendingApproval(healingId, aiResponse);
      return { healingId, status: 'PENDING_APPROVAL', proposal: aiResponse };
    }

    // ── Stage 7: Apply patches (sandboxed) ───────────────────────────
    const patchResult = await this.#patcher.apply(aiResponse.patches);
    this.#logger.stage('PATCH_APPLIED', patchResult);

    // ── Stage 8: Re-run test ──────────────────────────────────────────
    const rerunResult = await this.#runHealedTest(event.testFile, event.testName);
    this.#logger.complete(healingId, rerunResult);

    return {
      healingId,
      status: rerunResult.passed ? 'HEALED' : 'FAILED_AFTER_HEAL',
      aiResponse,
      patchResult,
      rerunResult,
    };
  }

  async #runHealedTest(testFile, testName) {
    // Framework-specific test re-runner
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const exec = promisify(execFile);

    const cmd = process.env.TEST_FRAMEWORK === 'playwright'
      ? ['npx', 'playwright', 'test', testFile, '--grep', testName, '--reporter=json']
      : ['npx', 'cypress', 'run', '--spec', testFile, '--grep', testName];

    try {
      const { stdout } = await exec(cmd[0], cmd.slice(1), { timeout: 60000 });
      const report = JSON.parse(stdout);
      return { passed: report.stats?.failures === 0, report };
    } catch (err) {
      return { passed: false, error: err.message };
    }
  }
}
```

---

## 7. Security Checks & Hardening {#security}

### `src/security/validator.js`

```javascript
// src/security/validator.js
import { z } from 'zod';
import { SecretScanner } from './secret-scanner.js';

// ── Schema Definitions ────────────────────────────────────────────────
const PatchSchema = z.object({
  file:        z.string().regex(/^[\w\-./]+\.spec\.(js|ts)$/, 'Invalid test file path'),
  lineStart:   z.number().int().positive(),
  lineEnd:     z.number().int().positive(),
  original:    z.string().max(2000),
  replacement: z.string().max(2000),
  patchType:   z.enum(['SELECTOR', 'WAIT', 'ASSERTION', 'NETWORK_STUB', 'ENV_VALUE']),
});

const HealingResponseSchema = z.object({
  healingId:       z.string().uuid(),
  failureClass:    z.enum(['SELECTOR_STALE','TIMING_FLAKINESS','LAYOUT_SHIFT',
                           'NETWORK_FAULT','AUTH_DRIFT','ENV_MISMATCH','ASSERTION_DRIFT']),
  confidence:      z.number().min(0).max(1),
  requiresApproval:z.boolean(),
  explanation:     z.string().min(10).max(1000),
  patches:         z.array(PatchSchema).max(5),  // Hard cap: max 5 patches per heal
  retryStrategy:   z.object({
    maxRetries:    z.number().int().min(1).max(5),
    delayMs:       z.number().int().min(500).max(10000),
    backoffFactor: z.number().min(1).max(3),
  }),
  preventionHints: z.array(z.string()).max(5),
});

// ── Denylist ─────────────────────────────────────────────────────────
const DANGEROUS_PATTERNS = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /require\s*\(\s*['"]child_process['"]\s*\)/,
  /import\s*\(\s*['"]child_process['"]\s*\)/,
  /process\.env\s*\[/,          // dynamic env access
  /\bexec\s*\(/,
  /\bspawn\s*\(/,
  /fs\.(write|unlink|rm|mkdir)/,
  /__proto__/,
  /prototype\s*\[/,
  /constructor\s*\[/,
];

export class SecurityValidator {
  #scanner;

  constructor() {
    this.#scanner = new SecretScanner();
  }

  /** Validate the incoming failure event before processing */
  validateInput(event) {
    // Size guard — prevent oversized DOM snapshots
    if ((event.domSnapshot?.length ?? 0) > 100_000) {
      return { safe: false, reason: 'DOM snapshot exceeds 100KB limit' };
    }
    if ((event.testCode?.length ?? 0) > 10_000) {
      return { safe: false, reason: 'Test code exceeds 10KB limit' };
    }

    // Prompt injection guard on incoming event fields
    const injectionPatterns = [
      /ignore\s+(all\s+)?previous\s+instructions?/i,
      /you\s+are\s+now\s+/i,
      /system\s*:\s*you/i,
      /\[INST\]/,
    ];
    const allText = JSON.stringify(event);
    for (const pattern of injectionPatterns) {
      if (pattern.test(allText)) {
        return { safe: false, reason: 'Prompt injection pattern detected in event data' };
      }
    }

    return { safe: true };
  }

  /** Validate the AI-generated healing response before applying */
  validateOutput(response) {
    // 1. Schema validation
    const parsed = HealingResponseSchema.safeParse(response);
    if (!parsed.success) {
      return { safe: false, reason: `Schema validation failed: ${parsed.error.message}` };
    }

    // 2. Scan patches for dangerous code
    for (const patch of response.patches) {
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(patch.replacement)) {
          return {
            safe: false,
            reason: `Dangerous pattern detected in patch: ${pattern.toString()}`,
          };
        }
      }

      // 3. Patch size guard
      if (patch.replacement.split('\n').length > parseInt(process.env.HEAL_MAX_PATCH_LINES, 10)) {
        return { safe: false, reason: 'Patch exceeds maximum allowed line count' };
      }

      // 4. File path guard — only allow test files in known directories
      if (!patch.file.startsWith('tests/') && !patch.file.startsWith('e2e/') &&
          !patch.file.startsWith('cypress/') && !patch.file.startsWith('playwright/')) {
        return { safe: false, reason: `Patch targets disallowed file path: ${patch.file}` };
      }

      // 5. Secret scanning
      if (process.env.HEAL_SECRET_SCAN === 'true') {
        const secretCheck = this.#scanner.scan(patch.replacement);
        if (secretCheck.found) {
          return { safe: false, reason: `Potential secret in patch: ${secretCheck.type}` };
        }
      }
    }

    return { safe: true };
  }
}
```

### `src/security/secret-scanner.js`

```javascript
// src/security/secret-scanner.js
const SECRET_PATTERNS = [
  { type: 'AWS_KEY',       pattern: /AKIA[0-9A-Z]{16}/ },
  { type: 'GCP_KEY',       pattern: /AIza[0-9A-Za-z\-_]{35}/ },
  { type: 'PRIVATE_KEY',   pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { type: 'JWT',           pattern: /eyJ[A-Za-z0-9+/=]{20,}\.[A-Za-z0-9+/=]{20,}/ },
  { type: 'GENERIC_SECRET',pattern: /(secret|password|passwd|token|api_?key)\s*[:=]\s*['"][^'"]{8,}/i },
  { type: 'HEX_SECRET',    pattern: /[0-9a-f]{32,64}/i },
];

export class SecretScanner {
  scan(text) {
    for (const { type, pattern } of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        return { found: true, type };
      }
    }
    return { found: false };
  }
}
```

### `src/security/sandbox.js`

```javascript
// src/security/sandbox.js
// Validates patches in a read-only VM context before applying to actual files
import vm from 'vm';

export class PatchSandbox {
  /**
   * Attempt to parse patch code syntactically in an isolated context.
   * Does NOT execute the code — only validates parse tree.
   */
  validate(code) {
    try {
      new vm.Script(code, { filename: 'sandbox-check.js' });
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}
```

---

## 8. Self-Heal Steps Reference {#self-heal-steps}

### Complete Step-by-Step Execution Flow

```
STEP 1 — TEST FAILURE DETECTED
  ├── Capture: error message, stack trace, test file path, line number
  ├── Capture: DOM snapshot (playwright: page.content())
  ├── Capture: screenshot (playwright: page.screenshot())
  ├── Capture: network request log (last 20 entries)
  ├── Capture: browser console errors
  └── Emit: TestFailureEvent → SelfHealingOrchestrator

STEP 2 — FAILURE CLASSIFICATION
  ├── Parse error message against known patterns
  ├── Assign failureClass enum value
  └── Select appropriate prompt template

STEP 3 — SECURITY INPUT VALIDATION
  ├── Size check on all input fields
  ├── Prompt injection pattern scan
  ├── Field type and encoding validation
  └── BLOCK if any check fails → log to audit trail

STEP 4 — PROMPT CONSTRUCTION
  ├── Load system prompt template
  ├── Load failure-class-specific user prompt template
  ├── Inject context variables (sanitized)
  ├── Verify no unfilled placeholders remain
  └── Emit: composed prompt pair

STEP 5 — GEMINI AI REQUEST (Vertex AI)
  ├── Send system + user prompt to Gemini 2.5 Flash / 3 Pro
  ├── Attach screenshot as multimodal input (if available)
  ├── Set responseMimeType: 'application/json'
  ├── Apply safety filters (BLOCK_LOW_AND_ABOVE)
  └── Receive: raw JSON HealingResponse

STEP 6 — AI OUTPUT SECURITY VALIDATION
  ├── Zod schema strict validation
  ├── Dangerous code pattern scan (eval, exec, etc.)
  ├── Patch line count enforcement
  ├── File path allowlist enforcement
  ├── Secret/credential scan
  └── BLOCK if any check fails

STEP 7 — CONFIDENCE GATE
  ├── IF confidence >= threshold AND requiresApproval = false → AUTO HEAL
  ├── IF confidence < threshold OR requiresApproval = true → PENDING APPROVAL
  └── IF failureClass = ASSERTION_DRIFT → ALWAYS PENDING APPROVAL

STEP 8 — PATCH VALIDATION (Sandboxed)
  ├── Syntax parse check via vm.Script
  ├── AST-level dangerous pattern check
  └── BLOCK if parse fails

STEP 9 — PATCH APPLICATION
  ├── Read original test file
  ├── Verify 'original' string exists at claimed line range
  ├── Apply string replacement
  ├── Write patched file
  └── Store original in ./artifacts/patches/ for rollback

STEP 10 — TEST RE-RUN
  ├── Execute healed test in isolated process
  ├── Capture new result
  ├── IF passes → status: HEALED
  └── IF fails again → status: FAILED_AFTER_HEAL → escalate to human

STEP 11 — AUDIT LOGGING
  ├── Write immutable JSONL entry to heal-audit.jsonl
  ├── Fields: healingId, timestamp, failureClass, confidence,
  │           patchesApplied, rerunResult, approvalStatus
  └── Retain for 90 days minimum
```

---

## 9. Error Classification Schema {#error-schema}

### `src/classifiers/failure-classifier.js`

```javascript
// src/classifiers/failure-classifier.js
const CLASSIFICATION_RULES = [
  {
    class: 'SELECTOR_STALE',
    patterns: [
      /locator\(\s*['"](.+)['"]\s*\).*strict mode/i,
      /unable to find element/i,
      /no element found for selector/i,
      /element not found/i,
      /getByRole.*not found/i,
    ],
  },
  {
    class: 'TIMING_FLAKINESS',
    patterns: [
      /timeout.*exceeded/i,
      /waiting for.*to be visible/i,
      /net::ERR_.*timeout/i,
      /navigation timeout/i,
    ],
  },
  {
    class: 'ASSERTION_DRIFT',
    patterns: [
      /expect.*received/i,
      /toEqual.*failed/i,
      /toHaveText.*failed/i,
      /assertion failed/i,
    ],
  },
  {
    class: 'NETWORK_FAULT',
    patterns: [
      /net::ERR_CONNECTION_REFUSED/i,
      /fetch failed/i,
      /network request failed/i,
      /502|503|504/,
    ],
  },
  {
    class: 'AUTH_DRIFT',
    patterns: [
      /401 unauthorized/i,
      /403 forbidden/i,
      /session.*expired/i,
      /token.*invalid/i,
    ],
  },
  {
    class: 'ENV_MISMATCH',
    patterns: [
      /baseURL.*not set/i,
      /env.*undefined/i,
      /cannot read.*undefined.*env/i,
    ],
  },
];

export class FailureClassifier {
  classify(event) {
    const text = `${event.errorMessage} ${event.stackTrace}`.toLowerCase();
    for (const rule of CLASSIFICATION_RULES) {
      if (rule.patterns.some(p => p.test(text))) {
        return rule.class;
      }
    }
    return 'SELECTOR_STALE';  // Default
  }
}
```

---

## 10. Full Node.js Implementation — Entry & Logger {#implementation}

### `src/index.js` — HTTP Webhook Entry Point

```javascript
// src/index.js
import 'dotenv/config';
import http from 'http';
import crypto from 'crypto';
import { SelfHealingOrchestrator } from './orchestrator.js';
import { logger } from './reporters/audit-logger.js';

const orchestrator = new SelfHealingOrchestrator();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function verifyHmacSignature(body, signature) {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(`sha256=${expected}`), Buffer.from(signature));
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/heal') {
    res.writeHead(404); res.end();
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString();
  const signature = req.headers['x-webhook-signature'] ?? '';

  // ── HMAC signature verification ──────────────────────────────
  if (!verifyHmacSignature(rawBody, signature)) {
    logger.warn('Invalid webhook signature — request rejected');
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  try {
    const result = await orchestrator.heal(event);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    logger.error('Orchestrator error', { error: err.message });
    res.writeHead(500); res.end(JSON.stringify({ error: 'Internal error' }));
  }
});

server.listen(3099, () => logger.info('Self-healing server ready on :3099'));
```

### `src/reporters/audit-logger.js`

```javascript
// src/reporters/audit-logger.js
import { appendFileSync } from 'fs';
import { createLogger, transports, format } from 'winston';

const AUDIT_FILE = process.env.TEST_AUDIT_LOG ?? './artifacts/heal-audit.jsonl';

export const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console({ format: format.combine(format.colorize(), format.simple()) }),
    new transports.File({ filename: './artifacts/heal-errors.log', level: 'error' }),
  ],
});

export class AuditLogger {
  #write(entry) {
    // Append-only JSONL — immutable audit trail
    appendFileSync(AUDIT_FILE, JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n');
  }

  start(id, event)            { this.#write({ id, event: 'HEAL_START',    testFile: event.testFile }); }
  stage(name, meta)           { this.#write({ event: 'STAGE', stage: name, ...meta }); }
  blocked(id, reason)         { this.#write({ id, event: 'BLOCKED',       reason }); }
  pendingApproval(id, prop)   { this.#write({ id, event: 'PENDING',       confidence: prop.confidence }); }
  complete(id, result)        { this.#write({ id, event: 'COMPLETE',      passed: result.passed }); }
}
```

---

## 11. Evaluation & Feedback Loop {#evaluation}

### Metrics to Track

| Metric | Formula | Target |
|---|---|---|
| **Heal Success Rate** | Healed / Total Failures | ≥ 85% |
| **False Positive Rate** | Wrong Patches / Total Patches | < 5% |
| **Mean Time to Heal** | Avg time from failure to HEALED | < 60s |
| **Confidence Accuracy** | confidence vs actual success rate | R² > 0.8 |
| **Escalation Rate** | PENDING_APPROVAL / Total | < 15% |
| **Security Block Rate** | BLOCKED / Total | Track for anomalies |

### Feedback Loop Configuration

```javascript
// src/feedback.js — Record healing outcomes to fine-tune confidence calibration
export async function recordFeedback(healingId, outcome) {
  const entry = {
    healingId,
    outcome,          // 'SUCCESS' | 'FAILURE' | 'APPROVED' | 'REJECTED'
    recordedAt: new Date().toISOString(),
  };
  // Store in Firestore / BigQuery for Vertex AI fine-tuning pipeline
  await bigquery.dataset('e2e_healing').table('feedback').insert([entry]);
}
```

### `.gitignore` Additions

```gitignore
# Secrets & credentials
secrets/
*.pem
*.p12
.env
.env.local

# Artifacts (exclude from git, use artifact storage)
artifacts/screenshots/
artifacts/patches/
artifacts/heal-audit.jsonl
artifacts/heal-errors.log

# GCP
gcp-service-account.json
application_default_credentials.json
```

---

## Quick-Start Checklist

```
☐  1. Create GCP project + enable Vertex AI API
☐  2. Create service account with roles/aiplatform.user
☐  3. Download service account JSON → secrets/gcp-service-account.json
☐  4. Copy .env template, fill all required values
☐  5. Run: node src/validate-env.js  (confirm all green)
☐  6. Run: npm install
☐  7. Configure your test runner to POST to http://localhost:3099/heal on failure
☐  8. Set HMAC webhook secret on both sides
☐  9. Run first healing test: npm run heal:watch
☐ 10. Review ./artifacts/heal-audit.jsonl after first failure event
```

---

*Context file version: 1.0.0 | Last updated: March 2026*
*Compatible with: Gemini 2.5 Flash (gemini-2.5-flash-preview-04-17) | Gemini 3 Pro (gemini-2.0-pro-exp)*
