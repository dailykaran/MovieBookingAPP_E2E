import { test, expect } from '@playwright/test';

test.describe('Frontend broken link button', () => {

  test('should navigate to the correct movie link when clicking "Book Now"', async ({ page }) => {
    const PORT = process.env.PORT || '3000'; 
    await page.goto(`http://localhost:${PORT}`);
    
    // Use page.waitForLoadState('networkidle') only if necessary, 
    // prefer specific element visibility for better performance
    const bookNowButton = page.getByRole('button', { name: /Book Now/i }).first();
    await expect(bookNowButton).toBeVisible();

    // Capture the click and wait for the URL to change to the expected pattern
    // This makes the test resilient to changes in specific movie IDs
    await Promise.all([
      page.waitForURL(`**/movie/**`),
      bookNowButton.click()
    ]);

    // Verify the URL structure instead of a hardcoded ID
    await expect(page).toHaveURL(new RegExp(`http://localhost:${PORT}/movie/\\d+`));
  });

});