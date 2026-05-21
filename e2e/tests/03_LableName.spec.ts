import { test, expect } from '@playwright/test';

test('Verify label names on user details page', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');

  const showtimeBtn = page.locator('button[value="21:00"]');
  await showtimeBtn.waitFor({ state: 'visible' });
  await showtimeBtn.click();

  const seatGridComponent = page.locator('seat-grid');
  await seatGridComponent.waitFor({ state: 'attached' });

  const seats = seatGridComponent.locator('.seat-grid-container .seat-grid .seat.available.clickable');
  await seats.first().waitFor({ state: 'visible' }); 
  const seatCount = await seats.count();
  
  console.log(`Available seats found: ${seatCount}`); 
  if (seatCount > 0) {
    await seats.first().click();
  } else {
    throw new Error('No available seats found to select.');
  }

  const confirmBtn = page.getByRole('button', { name: /Confirm|Book/i }).first();
  await confirmBtn.waitFor({ state: 'visible' });

  await Promise.all([
    page.waitForURL(/.*\/booking-details|.*\/checkout|.*\/user-details/),
    confirmBtn.click(),
  ]);

  await page.waitForLoadState('domcontentloaded'); 
  
  const fullNameInput = page.getByRole('textbox', { name: 'Full Name' });
  await expect(fullNameInput).toBeVisible(); 
  await fullNameInput.fill('John'); 
  
  const lastNameInput = page.getByRole('textbox', { name: 'Last Name' });
  await expect(lastNameInput).toBeVisible(); 
  await lastNameInput.fill('Doe'); 
  
  await page.getByRole('textbox', { name: /email/i }).fill('test@example.com'); 

  const phoneNumberInput = page.getByRole('textbox', { name: /(phone|mobile|contact) number/i });
  await expect(phoneNumberInput).toBeVisible(); 
  
  await phoneNumberInput.click(); 
  await phoneNumberInput.fill('9898976765');
  
  await page.getByRole('textbox', { name: /age/i }).fill('25'); 

  await page.getByRole('button', { name: 'Continue to Payment' }).click();
});