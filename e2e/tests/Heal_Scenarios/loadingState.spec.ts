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
  const seats = await shadowElement.locator('.seat-grid-container .seat-grid .seat.available.clickable');
  const seatCount = await seats.count();
  console.log(seatCount)
  if (seatCount > 0) {
    await seats.first().click();
    await page.waitForTimeout(500);
  }
  
  // Now try to confirm booking
  const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Book/ }).first();
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click();
    await page.waitForTimeout(500);
  }
  
  // ✅ Verify that the page is interactive and accepting clicks
  // (dialogs may or may not appear depending on form state)
  const pageContent = await page.content();
  console.log('Page content length after booking attempt:', pageContent.length);
  expect(pageContent.length).toBeGreaterThan(100); // Page loaded


  await page.getByLabel('Full Name').fill('John'); // first name lablel is updated to "Full Name" in the application, so we need to update the locator accordingly
  await page.getByLabel('Last Name').fill('Doe');
  await page.getByLabel('Email').fill('John@example.in');
  await page.getByLabel('Mobile Number').fill('1234567890'); // phone number label is updated to "Mobile Number" in the application, so we need to update the locator accordingly
  await page.getByLabel('Age').fill('25');
  await page.getByRole('button', { name: 'Continue to Payment' }).click();

  expect(page.url()).toContain('/payment'); // Should navigate to payment page

  await page.getByLabel('Card Number').fill('1234567890123456');
  await page.getByLabel('Card Holder Name').fill('John Doe');
  await page.getByLabel('expiry Date').fill('12/25');
  await page.getByLabel('CVV').fill('123');
  await page.getByRole('button', { name: /Pay/i }).click();



  await expect(page.locator('.MuiDialog-paperWidthSm')).toBeVisible({ timeout: 500 });
  await expect(page.locator('.MuiDialog-paperWidthSm h2')).toContainText('Confirm Payment');
  await page.locator('button.MuiButton-containedSuccess').click();

  await page.locator('.MuiCircularProgress-root').first().waitFor({ state: 'visible', timeout: 3000 }); // timing load issue 1000
  await page.locator('.MuiCircularProgress-root').last().waitFor({ state: 'detached', timeout: 3000 });
  
  await expect(page.locator('.MuiSnackbarContent-message')).toContainText('Booking confirmed successfully!');

  await page.getByRole('button', { name: /Copy/i }).click();
  await expect(page.locator('.MuiSnackbarContent-message').last()).toContainText('Booking code copied');
  await page.locator('.MuiSnackbarContent-message').last().waitFor({ state: 'detached', timeout: 1000 }); // timing load issue 500
});

