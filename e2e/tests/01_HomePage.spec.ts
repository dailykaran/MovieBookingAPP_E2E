import { test, expect } from '@playwright/test';

test('verify app loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Updated the expected title to match the current application title.
  await expect(page).toHaveTitle('TicketsVenue - Book Movie Tickets', { timeout: 10000 });
});