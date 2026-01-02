import { test, expect } from '@playwright/test';

test('verify app loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Fix: Updated the expected page title to match the actual title of the application.
  await expect(page).toHaveTitle('ShowGlow - Book Movie Tickets');
});