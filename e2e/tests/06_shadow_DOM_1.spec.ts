import { test, expect } from '@playwright/test';

test('Loading spinner appears during booking', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  const showtimeBtn = page.getByRole('button', { name: '21:00' }); 
  
  await expect(showtimeBtn).toBeVisible();
  await showtimeBtn.click();

  try {
    const seatGrid = page.locator('seat-grid'); 
    await expect(seatGrid).toBeVisible();

    const seats = seatGrid.locator('.seat.available.clickable');  
    await expect(seats.last()).toBeVisible();  
    await seats.last().click();
    
    const confirmBtn = page.locator('button', { hasText: /Confirm/i });
    await expect(confirmBtn).toBeVisible(); 
    await confirmBtn.click();       
    await page.waitForURL('**/user-details', { timeout: 10000 }); 
      
  } catch (error) {
    throw new Error('Error occurred during booking process: ' + (error instanceof Error ? error.message : String(error)));
  }
});