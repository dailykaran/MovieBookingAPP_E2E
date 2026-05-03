import { test, expect } from '@playwright/test';

test('verify app loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Verify the page title matches the application (flexible regex to handle variations)
  await expect(page).toHaveTitle(/.*Book Movie Tickets/, { timeout: 20000 });
});