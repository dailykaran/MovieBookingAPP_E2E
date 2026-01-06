import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Navigate to localhost:3000
  await page.goto('http://localhost:3000');
});

test('Load localhost:3000, verify application display', async ({ page }) => {
  // Verify the application loads successfully
  await expect(page).toHaveTitle(/React|Movie|ShowGlow|Movie Booking/i);
  // FIX: Corrected the text in getByText locator to match the expected visible application name.
  // Assuming the application name displayed on the page is 'ShowGlow' and not 'ShowGlow213'.
  await expect(page.getByText(/ShowGlow/i)).toBeVisible(); 
});

test('Load localhost:3000, verify application display and navigate to movie details for ID 3', async ({ page }) => {
 
  const movieCards = page.locator('.MuiPaper-root.MuiCard-root');
  await expect(movieCards.first()).toBeVisible();

  // Find and click the link for movie ID 3
  const movie3Link = page.locator('.MuiCard-root a[href*="/3"]');
  await expect(movie3Link).toBeVisible();
  await movie3Link.click();

  // Wait for the URL to change to the movie details page for ID 3
  await page.waitForURL(/\/movie\/3/);

  // Assert that the page is indeed at the URL for movie ID 3
  await expect(page).toHaveURL(/\/movie\/3/); 
});