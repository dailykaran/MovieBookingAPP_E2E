import { test, expect } from '@playwright/test';

test('verify app loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Updated expected title to match current application branding
  // Using a regex makes the test slightly more resilient to minor future changes
  await expect(page).toHaveTitle(/TicketsVenue - Book Movie Tickets/i, { timeout: 10000 });
});