import { test, expect } from '@playwright/test';

test.describe('Frontend broken link button', () => {
  
  test('should display broken element', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
      

    const brokenlinkBtn  = page.locator('a,button').last();
    const text = await brokenlinkBtn.textContent();
    console.log(`Found element with text: "${text?.trim()}"`);
    await expect(brokenlinkBtn).toContainText('Book Now');
    await brokenlinkBtn.click();
     await expect(page).toHaveURL('http://localhost:3000/broken-booking-link');
    
  });

});
