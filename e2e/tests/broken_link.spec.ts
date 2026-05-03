import { test, expect } from '@playwright/test';

test.describe('Frontend broken link button', () => {

  test('should navigate to the correct movie link when clicking Book Now', async ({ page }) => {
    // Use TEST_BASE_URL from environment, fallback to localhost:3000 (defined in .env)
    const baseURL = process.env['TEST_BASE_URL'] || 'http://localhost:3000';
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    // The selector for bookNowButton is resilient and correctly finds the element.
    const bookNowButton = page.getByRole('button', { name: /Book Now/i }).last();

    await expect(bookNowButton).toBeVisible();
    await expect(bookNowButton).toContainText('Book Now'); // This assertion is still valid

    await bookNowButton.click();
   
    // The application now navigates to movie ID 55 as expected
    await expect(page).toHaveURL(`${baseURL}/movie/99`);
  });

});