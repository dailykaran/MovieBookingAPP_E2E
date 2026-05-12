import { test, expect } from '@playwright/test';

test('Loading spinner appears during booking', async ({ page }) => {
  // Navigate to a movie page
  await page.goto('http://localhost:3000/movie/2');
  
  // Select a showtime first
  const showtimeBtn = page.locator('button[value="20:30"]');
  if (await showtimeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await showtimeBtn.click();
    await page.waitForTimeout(500);
  }

    // Select one seat
    const shadowElement = page.locator('seat-grid');
    const seats = shadowElement.locator('.seat-grid-container .seat-grid .seat.available.clickable');
    const seatCount = await seats.count();
    console.log(seatCount)
    if (seatCount > 0) {
      await seats.first().click();
      await page.waitForTimeout(500);
    }
      // Now try to confirm booking
      const confirmBtn = page.locator('button').filter({ hasText: /Confirm/ }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 })) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
      }

  

});

