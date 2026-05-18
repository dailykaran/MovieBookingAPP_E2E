import { test, expect } from '@playwright/test';

test('Alert: Should handle browser alert for no showtime selected', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.waitForLoadState('networkidle');

  page.on('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    expect(dialog.message()).toContain('Please select a showtime');
    await dialog.dismiss();
  });

  const confirmButton = page.getByRole('button', { name: /confirm/i }); 
  await expect(confirmButton).toBeVisible({ timeout: 3000 });
  await confirmButton.click({ timeout: 2000 });

  await page.waitForTimeout(500);
  console.log('✓ Showtime validation alert handled');
});