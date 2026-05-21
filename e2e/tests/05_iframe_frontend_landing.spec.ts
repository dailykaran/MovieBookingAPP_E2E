import { test, expect } from '@playwright/test';

test.describe('Frontend iFrame Landing Page Tests (localhost:3000)', () => {

  test('should display iframe element and its content', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const iframeElement = page.locator('iframe[title="Upcoming Movies List"]');  
    await expect(iframeElement).toBeAttached();  

    const movieFrame = page.frameLocator('iframe[title="Upcoming Movies List"]');
    
    const upcomingMoviesButton = movieFrame.getByRole('button', { name: "Recent Movies" });

    await expect(upcomingMoviesButton).toBeVisible({ timeout: 15000 });
  });

});