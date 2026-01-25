import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
});

test('Load localhost:3000, verify application display', async ({ page }) => {
  await expect(page).toHaveTitle(/React|Movie|ShowGlow|Movie Booking/i);

  await expect(page.getByText(/ShowGlow_re/i, { exact: true })).toBeVisible();
});

test('Load localhost:3000, verify application display and navigate to movie details for ID 3', async ({ page }) => {

  const movie3Link = page.locator('.MuiPaper-root.MuiCard-root').locator('a[href*="/3"]').first();

  await expect(movie3Link).toBeVisible({ timeout: 15000 });

  await movie3Link.click();

  await page.waitForURL(/\/movie\/4/);
  await expect(page).toHaveURL(/\/movie\/4/);

  const actionButton = page.getByRole('button', { name: 'Book Now' });

  await actionButton.waitFor({ state: 'visible', timeout: 15000 });
  //await actionButton.waitFor({ state: 'enabled', timeout: 15000 });

  await actionButton.click();
  await page.waitForLoadState('load');

  await expect(page).toHaveURL(/\/ShowGlow\/3/);
});