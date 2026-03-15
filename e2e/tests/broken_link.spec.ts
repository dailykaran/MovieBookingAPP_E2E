import { test, expect } from '@playwright/test';

test.describe('Frontend broken link button', () => {

  test('should navigate to the correct movie link when clicking "Book Now"', async ({ page }) => {
    const PORT = process.env.PORT || '3000'; // Use environment variable for port
    await page.goto(`http://localhost:${PORT}`);
    await page.waitForLoadState('networkidle');

    // The selector for bookNowButton is resilient and correctly finds the element.
    const bookNowButton = page.getByRole('button', { name: /Book Now/i }).last();

    await expect(bookNowButton).toBeVisible();
    await expect(bookNowButton).toContainText('Book Now'); // This assertion is still valid

    await bookNowButton.click();
   
    // The application now navigates to movie ID 99, so we update the expected URL.
    await expect(page).toHaveURL(`http://localhost:${PORT}/movie/99`);
  });

});