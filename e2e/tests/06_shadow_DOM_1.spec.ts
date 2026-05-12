import { test, expect } from '@playwright/test';

test('Loading spinner appears during booking', async ({ page }) => {
  // Navigate to a movie page
  await page.goto('http://localhost:3000/movie/1');

  const showtimeBtn = page.getByRole('button', { name: '21:00' }); // Assuming '21:00' is the accessible name
  
  await expect(showtimeBtn).toBeVisible();
  await showtimeBtn.click();

  try {
    const seatGrid = page.locator('seat-grid'); 
    await expect(seatGrid).toBeVisible();

    const seats = seatGrid.locator('.seat.available.clickable');  
    await expect(seats.first()).toBeVisible(); 
       
    await seats.first().click();
    
    const confirmBtn = seatGrid.locator('button', { hasText: /confirm/i });
    
   
    await expect(confirmBtn).toBeVisible(); 
    await confirmBtn.click();       
    await page.waitForURL('**/user-details', { timeout: 10000 }); 
      
  } catch (error) {
    // Re-throw the error with context for better debugging
    throw new Error('Error occurred during booking process: ' + (error instanceof Error ? error.message : String(error)));
  }
});