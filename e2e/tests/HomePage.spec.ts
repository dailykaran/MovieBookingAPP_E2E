import { test, expect } from '@playwright/test';

test('verify app loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.MuiCard-root')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('button', { state: 'visible' });
  await expect(page).toHaveTitle('ShowGlow - Book Movie Tickets');
});