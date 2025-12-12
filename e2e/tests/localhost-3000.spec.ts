import { test, expect } from '@playwright/test';

test('Load localhost:3000, verify application display and navigate to movie details for ID 3', async ({ page }) => {
  // Navigate to localhost:3000
  await page.goto('http://localhost:3000');

  // Verify the application loads successfully
  await expect(page).toHaveTitle(/React|Movie|ShowGlow|Movie Booking/i);
  
  // Verify the main application title/logo is visible
  await expect(page.locator('text=ShowGlow')).toBeVisible();

  // Verify the movie list is displayed
  const movieCards = page.locator('.MuiPaper-root.MuiCard-root');
  await expect(movieCards.first()).toBeVisible();

  // Click the link that navigates to movie details for ID 3
  const movie3Link = page.locator('.MuiCard-root a[href*="/3"]');
  await expect(movie3Link).toBeVisible();
  await movie3Link.click();

  // Verify navigation to movie details page for ID 3
  await expect(page).toHaveURL(/\/movie\/3$/);
});
