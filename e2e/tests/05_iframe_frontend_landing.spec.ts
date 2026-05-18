import { test, expect } from '@playwright/test';

test.describe('Frontend iFrame Landing Page Tests (localhost:3000)', () => {

  test('should display iframe element', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    const iframe1 = page.locator('iframe[title="Movies showcase"]');
    const iframe2 = page.frameLocator('iframe[title="Upcoming Movies List"]').getByText(/upcoming movies/i);

    await expect(iframe1).toBeVisible();
    await expect(iframe2).toContainText('Upcoming Movies');

    //await expect(page.locator('.poster-title')).toContainText('Upcoming Movies');
  });

});