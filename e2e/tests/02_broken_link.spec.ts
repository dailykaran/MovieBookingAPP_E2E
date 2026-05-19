import { test, expect } from '@playwright/test';

test.describe('Frontend navigation check', () => {

  test('should navigate to the correct movie detail page when clicking "Book Now"', async ({ page }) => {
    const PORT = process.env.PORT || '3000'; 
    await page.goto(`http://localhost:${PORT}`);
    
    // Using data-testid for resilience against CSS/class changes
    // If data-testid is not available, we target the first article or section element
    const movieCard = page.getByTestId('movie-card').first(); 
    
    // Look for the button within the context of the identified movie card
    // Using 'i' flag for case-insensitive matching in case of text style changes
    const bookNowButton = movieCard.getByRole('button', { name: /book now/i });
    
    await expect(bookNowButton).toBeVisible();

    // Use Promise.all to prevent race conditions during navigation
    await Promise.all([
      page.waitForURL(/\/movie\/\d+/), 
      bookNowButton.click()
    ]);
   
    // Verify the URL structure
    await expect(page).toHaveURL(/\/movie\/\d+/);
    
    // Verify presence of content to ensure page loaded successfully
    // Adjust role if the page structure uses something other than a heading (e.g., 'main')
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

});