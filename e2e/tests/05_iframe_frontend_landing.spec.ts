import { test, expect } from '@playwright/test';

test.describe('Frontend iFrame Landing Page Tests (localhost:3000)', () => {

  test('should display iframe element and its content', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const iframeElement = page.locator('iframe[title="Upcoming Movies List"]');  
    await expect(iframeElement).toBeAttached();  

    const movieFrame = page.frameLocator('iframe[title="Upcoming Movies List"]');
    
    // Updated selector to target the specific button element with text partially matching "Upcoming"
    const upcomingMoviesButton = movieFrame.getByRole('button', { name: /Upcoming Movies/i });

    await expect(upcomingMoviesButton).toBeVisible({ timeout: 15000 });
  });

});