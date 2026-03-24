import { test, expect } from '@playwright/test';

test('should verify at least one book button is visible', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  await page.waitForLoadState('networkidle');

  const buttons = await page.getByRole('button', { name: /Book Now/i }).count();
  expect(buttons).toBeGreaterThan(0); // Assert that at least one bookable item exists
});
