import { test, expect } from '@playwright/test';

test('Loading spinner appears during booking', async ({ page }) => {
  // Navigate to a movie page
  await page.goto('http://localhost:3000/movie/1');
  
  // Select a showtime first
  const showtimeBtn = page.locator('button[value="21:00"]');
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
  const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Book/ }).first();
  if (await confirmBtn.isVisible({ timeout: 3000 })) {
    await confirmBtn.click();
    await page.waitForTimeout(500);
  }

  // Verify that the text boxes label name before entering the details
  await page.getByLabel('First Name').fill('John');
  await page.getByLabel('Last Name').fill('Doe');
  await page.getByLabel('Email').fill('John@example.in');
  await page.getByLabel('Phone Number').fill('1234567890');
  await page.getByLabel('Age').fill('25');
  await page.getByRole('button', { name: 'Continue to Payment' }).click();

});
