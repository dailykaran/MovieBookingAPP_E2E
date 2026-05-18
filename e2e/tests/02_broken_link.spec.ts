import { test, expect } from '@playwright/test';

test.describe('Frontend navigation check', () => {

  test('should navigate to the correct movie detail page when clicking "Book Now"', async ({ page }) => {
    const PORT = process.env.PORT || '3000'; 
    await page.goto(`http://localhost:${PORT}`);
    
    // Use locator first to ensure we target the specific button
    const bookNowButton = page.getByRole('button', { name: /Book Now/i }).first();

    await expect(bookNowButton).toBeVisible();

    // Perform action
    await bookNowButton.click();
   
    // Use a regex pattern to verify the structure of the URL without hardcoding the ID
    // This allows the test to pass even if the specific movie ID changes
    await page.waitForURL(new RegExp(`http://localhost:${PORT}/movie/\\d+`));
    
    // Verify the URL matches the expected pattern
    expect(page.url()).toMatch(new RegExp(`http://localhost:${PORT}/movie/\\d+`));
  });

});