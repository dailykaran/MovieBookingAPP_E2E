import { test, expect } from '@playwright/test';

test('verify app loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Verify the page title matches the ShowGlow application
  await expect(page).toHaveTitle('ShowGlow - Book Movie Tickets', { timeout: 10000 });
});