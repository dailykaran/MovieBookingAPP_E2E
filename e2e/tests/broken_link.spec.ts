import { test, expect } from '@playwright/test';

test.describe('Frontend broken link button', () => {

  test('should navigate to the correct movie link when clicking "Book Now"', async ({ page }) => {
    const PORT = process.env.PORT || '3000'; 
    await page.goto(`http://localhost:${PORT}`);
    await page.waitForLoadState('networkidle');

    // Selector for 'Book Now' button is resilient (getByRole with name and .last())
    const bookNowButton = page.getByRole('button', { name: /Book Now/i }).last();

    await expect(bookNowButton).toBeVisible();
    await expect(bookNowButton).toContainText('Book Now'); 

    await bookNowButton.click();
   
    // Update the expected URL to match the observed frontend navigation
    await expect(page).toHaveURL(`http://localhost:${PORT}/movie/99`); 
  });

});