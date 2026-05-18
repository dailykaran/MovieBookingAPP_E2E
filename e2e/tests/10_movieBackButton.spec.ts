import { test, expect } from '@playwright/test';

test.describe('Back button on the movie page', () => {

  test('verify the back button movie page', async ({ page }) => {
    const PORT = process.env.PORT || '3000'; 
    const baseUrl = `http://localhost:${PORT}`;
    
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    // Select the first "Book Now" button using role-based selector
    const bookNowButton = page.getByRole('button', { name: /book now/i }).first();
    await expect(bookNowButton).toBeVisible();
    await bookNowButton.click();

    // Fix: Remove exact: true and use case-insensitive regex for resilience
    // Also, if the element might be a link, getByRole(..., { name: /.../i }) covers both button and link roles
    const backButton = page.getByRole('button', { name: /back to movies/i });
    
    await expect(backButton).toBeVisible();
    
    // Perform navigation and verify
    await Promise.all([
      page.waitForURL(baseUrl),
      backButton.click()
    ]);

    await expect(page).toHaveURL(baseUrl);
  });

});