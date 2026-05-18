import { test, expect } from '@playwright/test';

test.describe('Frontend iFrame Landing Page Tests (localhost:3000)', () => {

  test('should display iframe element', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // 1. Use data-testid for stable iframe selection (most reliable for testing)
    // data-testid is explicit, intentional, and won't change during refactoring
    const movieFrame = page.frameLocator('iframe[data-testid="movie-showcase-iframe"]');

    // 2. Define the target element inside the frame using best practices (getByRole)
    // Assuming "MOVIE SHOWCASE" is a heading inside the iframe
    const showcaseHeading = movieFrame.getByRole('heading', { name: /movie showcase/i });

    // 3. Use the element inside the frame to trigger the assertion
    // This implicitly waits for the iframe and the element to be ready
    await expect(showcaseHeading).toBeVisible();
    await expect(showcaseHeading).toHaveText(/MOVIE SHOWCASE/i);
  });

});