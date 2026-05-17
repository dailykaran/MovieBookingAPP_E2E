import { test, expect } from '@playwright/test';

test('Verify label names on user details page', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');

  const showtimeBtn = page.locator('button[value="21:00"]');
  await showtimeBtn.waitFor({ state: 'visible' });
  await showtimeBtn.click();

  const seatGridComponent = page.locator('seat-grid');
  await seatGridComponent.waitFor({ state: 'attached' });

  // Fixed Shadow DOM selector usage using nested locators
  const seats = seatGridComponent.locator('.seat-grid-container .seat-grid .seat.available.clickable');

  await seats.first().waitFor({ state: 'visible' }); 
  const seatCount = await seats.count();
  
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
  
  // Resilient form filling
  const fullNameInput = page.getByLabel(/First Name|Full Name/i);
  await expect(fullNameInput).toBeVisible(); 
  await fullNameInput.fill('John'); 
  
  const lastNameInput = page.getByLabel(/Last Name|Surname/i);
  await expect(lastNameInput).toBeVisible(); 
  await lastNameInput.fill('Doe'); 
  
  const emailInput = page.getByLabel(/Email/i).or(page.getByPlaceholder(/Email/i));
  await emailInput.fill('test@example.com'); 

  const phoneNumberInput = page.getByLabel(/(phone|mobile|contact) number/i);
  await expect(phoneNumberInput).toBeVisible();
  await phoneNumberInput.fill('9898976765');
 
  // Fix: Use getByLabel for Age, as spinbutton role might not be properly exposed
  const ageInput = page.getByLabel(/Age/i).or(page.getByPlaceholder(/Age/i));
  await expect(ageInput).toBeVisible();
  await ageInput.fill('25'); 

  await page.getByRole('button', { name: /Continue to Payment/i }).click();
});