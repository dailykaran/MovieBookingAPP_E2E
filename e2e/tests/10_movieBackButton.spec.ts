import { test, expect } from '@playwright/test';

test.describe('Back button on the movie page', () => {

  test('verify the back button movie page', async ({ page }) => {
    const PORT = process.env.PORT || '3000'; 
    const baseUrl = `http://localhost:${PORT}`;
    
    await page.goto(baseUrl);
    
    // Ensure initial load
    await page.waitForLoadState('networkidle');

    // Select the button and navigate to movie page
    const bookNowButton = page.getByRole('button', { name: /book now/i }).first();
    await expect(bookNowButton).toBeVisible();
    await bookNowButton.click();

    // Use a case-insensitive regex to match "Back" button text
    // This is more resilient to CSS text-transform changes
    const backButton = page.getByRole('button', { name: /back/i }); 
    
    await expect(backButton).toBeVisible();
    
    // Click and wait for URL to change back to home
    await Promise.all([
      page.waitForURL(baseUrl),
      backButton.click()
    ]);

    // Final verification
    await expect(page).toHaveURL(baseUrl);
  });

});