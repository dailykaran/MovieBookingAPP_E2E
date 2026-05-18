import { test, expect } from '@playwright/test';

test.describe('Back button on the movie page', () => {

  test('verify the back button movie page', async ({ page }) => {
    const PORT = process.env.PORT || '3000'; 
    const baseUrl = `http://localhost:${PORT}`;
    
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    const bookNowButton = page.getByRole('button', { name: /book now/i }).first();
    await expect(bookNowButton).toBeVisible();
    await bookNowButton.click();

    const backButton = page.getByRole('button', { name: /back/i })
      .or(page.getByRole('link', { name: /back/i }));
    
    await expect(backButton).toBeVisible();
    
    await Promise.all([
      page.waitForURL(baseUrl),
      backButton.click()
    ]);

    await expect(page).toHaveURL(baseUrl);
  });

});