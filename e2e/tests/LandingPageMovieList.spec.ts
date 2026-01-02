import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
});

test('Load localhost:3000, verify application display', async ({ page }) => {
  await expect(page).toHaveTitle(/React|Movie|ShowGlow|Movie Booking/i);
  await expect(page.getByText(/ShowGlow/i)).toBeVisible(); 
});

test('Load localhost:3000, verify application display and navigate to movie details for ID 3', async ({ page }) => {
 
  const movieCards = page.locator('.MuiPaper-root.MuiCard-root');
  await expect(movieCards.first()).toBeVisible({ timeout: 15000 });

  const movie3Card = movieCards.nth(2);
  const bookButton = movie3Card.locator('a[href*="/3"]');
  await expect(bookButton).toBeVisible();
  await bookButton.click();

  await page.waitForURL(/\/movie\/3/);

  await expect(page).toHaveURL(/\/movie\/3/); 
});