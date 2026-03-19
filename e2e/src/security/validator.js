// src/security/validator.js
import { z } from 'zod';
import { SecretScanner } from './secret-scanner.js';
import { consoleLogger } from '../reporters/audit-logger.js';

// ── Schema Definitions ────────────────────────────────────────────────
const PatchSchema = z.object({
  file: z.string().regex(/^[\w\-./]+\.spec\.(js|ts)$/, 'Invalid test file path'),
  lineStart: z.number().int().positive(),
  lineEnd: z.number().int().positive(),
  original: z.string().max(2000),
  replacement: z.string().max(2000),
  patchType: z.enum(['SELECTOR', 'WAIT', 'ASSERTION', 'NETWORK_STUB', 'ENV_VALUE']),
});

const HealingResponseSchema = z.object({
  healingId: z.string().uuid(),
  failureClass: z.enum([
    'SELECTOR_STALE',
    'TIMING_FLAKINESS',
    'LAYOUT_SHIFT',
    'NETWORK_FAULT',
    'AUTH_DRIFT',
    'ENV_MISMATCH',
    'ASSERTION_DRIFT',
  ]),
  confidence: z.number().min(0).max(1),
  requiresApproval: z.boolean(),
  explanation: z.string().min(10).max(1000),
  patches: z.array(PatchSchema).max(5), // Hard cap: max 5 patches per heal
  retryStrategy: z.object({
    maxRetries: z.number().int().min(1).max(5),
    delayMs: z.number().int().min(500).max(10000),
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
  /process\.env\s*\[/, // dynamic env access
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
      const maxLines = parseInt(process.env.HEAL_MAX_PATCH_LINES || '50', 10);
      if (patch.replacement.split('\n').length > maxLines) {
        return { safe: false, reason: `Patch exceeds maximum allowed line count (${maxLines})` };
      }

      // 4. File path guard — only allow test files in known directories
      if (
        !patch.file.startsWith('tests/') &&
        !patch.file.startsWith('e2e/') &&
        !patch.file.startsWith('cypress/') &&
        !patch.file.startsWith('playwright/')
      ) {
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
