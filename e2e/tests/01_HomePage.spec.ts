import { test, expect } from '@playwright/test';

test('verify app loads', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3000');

  // Verify the page title matches the updated branding/content
  // Using a regex for partial match is also an option if the title includes dynamic movie names
  await expect(page).toHaveTitle(/TicketsVenue - Book Movie Tickets/, { timeout: 10000 });
});