import { test, expect } from '@playwright/test';

test('verify app loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Updated the expected title to match the current application title.
  await expect(page).toHaveTitle('tree', { timeout: 10000 });
});