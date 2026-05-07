import { test, expect } from '@playwright/test';

test.describe('Frontend iFrame Landing Page Tests (localhost:3000)', () => {

  test('should display iframe element', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const iframe1 = page.locator('iframe[title="Movie Showcase"]');
    const iframe2 = page.frameLocator('iframe[title="Movie Showcase"]').getByText(/movie showcase/i);

    await expect(iframe1).toBeVisible();
    await expect(iframe2).toContainText('MOVIE SHOWCASE');
  });

});