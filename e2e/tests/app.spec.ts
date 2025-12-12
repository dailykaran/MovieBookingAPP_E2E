import { test, expect } from '@playwright/test';

test('verify app loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).not.toHaveTitle('404');
});
