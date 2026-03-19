// tests/test-fixtures.ts
/**
 * Custom Playwright fixtures for Self-Healing Integration
 * 
 * Usage in tests:
 * ```
 * import { test, expect } from '../test-fixtures';
 * 
 * test('should have healing capability', async ({ page, healingContext }) => {
 *   await page.goto('/');
 *   healingContext.recordMetadata({ 
 *     testCode: 'await page.locator(...).click()',
 *     domSnapshot: await page.content(),
 *   });
 * });
 * ```
 */

import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import crypto from 'crypto';

interface HealingContext {
  recordMetadata: (meta: Record<string, any>) => void;
  captureFailure: () => Promise<Record<string, any>>;
  sendToHealer: (event: Record<string, any>) => Promise<any>;
}

export const test = base.extend<{ healingContext: HealingContext }>({
  healingContext: async ({ page }, use) => {
    const healerUrl = process.env.HEALER_URL || 'http://localhost:3099';
    const webhookSecret = process.env.WEBHOOK_SECRET || '';

    const context: HealingContext = {
      /**
       * Record metadata about the test for healing context
       */
      recordMetadata: (meta: Record<string, any>) => {
        (page as any)._healingMetadata = { ...(page as any)._healingMetadata, ...meta };
      },

      /**
       * Capture current failure state (DOM, screenshot, etc.)
       */
      captureFailure: async () => {
        const screenshot = await page.screenshot({ path: `./artifacts/screenshots/${Date.now()}.png` });
        const domSnapshot = await page.content();
        const consoleErrors = (page as any)._consoleErrors || [];

        return {
          screenshot,
          domSnapshot,
          consoleErrors,
          url: page.url(),
          title: await page.title(),
        };
      },

      /**
       * Send a healing request to the self-healing server
       */
      sendToHealer: async (event: Record<string, any>) => {
        const body = JSON.stringify(event);
        const signature = crypto
          .createHmac('sha256', webhookSecret)
          .update(body)
          .digest('hex');

        const response = await fetch(`${healerUrl}/heal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
          },
          body,
        });

        if (!response.ok) {
          throw new Error(`Healer returned ${response.status}: ${await response.text()}`);
        }

        return response.json();
      },
    };

    // Track console messages and errors
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        (page as any)._consoleErrors = [...((page as any)._consoleErrors || []), msg.text()];
      }
    });

    await use(context);
  },
});

export { expect };
