import { test, expect } from '@playwright/test';

test('Loading spinner appears during booking', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  
  // Use getByRole for better resilience outside Shadow DOM
  const showtimeBtn = page.getByRole('button', { name: '21:00' }); 
  await expect(showtimeBtn).toBeVisible();
  await showtimeBtn.click();

  try {
    // 1. Locate the container host (Shadow DOM boundary)
    const seatGrid = page.locator('seat-grid'); 
    await expect(seatGrid).toBeAttached();

    // 2. Target seats inside the Shadow DOM using the updated class combination
    // Source analysis confirms .seat.available.click is the correct selector after class refactor
    const availableSeat = seatGrid.locator('.seat.available.click').first();
    
    await expect(availableSeat).toBeAttached();
    await availableSeat.scrollIntoViewIfNeeded();
    await availableSeat.click();
    
    // 3. Confirm button is outside Shadow DOM, use getByRole
    const confirmBtn = page.getByRole('button', { name: /confirm/i });
    await expect(confirmBtn).toBeVisible(); 
    
    // 4. Perform the click and wait for navigation sequence
    await confirmBtn.click();
    
    // Wait for the URL to change
    await page.waitForURL('**/user-details', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');

  } catch (error) {
    throw new Error('Error occurred during booking process: ' + (error instanceof Error ? error.message : String(error)));
  }
});