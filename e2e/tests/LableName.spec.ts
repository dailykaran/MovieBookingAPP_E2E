import { test, expect } from '@playwright/test';

test('Verify label names on user details page', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');

  const showtimeBtn = page.locator('button[value="21:00"]');
  await showtimeBtn.waitFor({ state: 'visible' });
  await showtimeBtn.click();

  const seatGridComponent = page.locator('seat-grid');
  await seatGridComponent.waitFor({ state: 'attached' });

  // Shadow DOM interaction for seats is already correctly handled by nested locators
  const seats = seatGridComponent.locator('.seat-grid-container .seat-grid .seat.available.clickable');

  await seats.first().waitFor({ state: 'visible' }); // Ensures seats are rendered
  const seatCount = await seats.count();
  console.log(`Available seats found: ${seatCount}`); // Keep for debugging if needed
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
  
  // FIX: The previous getByLabel(/name/i) caused a strict mode violation.
  // Using getByRole with the specific accessible name 'Full Name' for the first input.
  const fullNameInput = page.getByRole('textbox', { name: 'Full Name' });
  await expect(fullNameInput).toBeVisible(); 
  await fullNameInput.fill('John'); 
  
  // Using getByRole with the specific accessible name 'Last Name' for the second input.
  const lastNameInput = page.getByRole('textbox', { name: 'Last Name' });
  await expect(lastNameInput).toBeVisible(); // Ensure visibility before filling
  await lastNameInput.fill('Doe'); 
  
  // Update other input fields to use getByRole for consistency and resilience
  await page.getByRole('textbox', { name: /email/i }).fill('test@example.com'); 

  // Store the phone number input locator for reuse
  // FIX: Updated regex for 'Phone Number' to be more resilient to label changes (e.g., "Mobile Number")
  const phoneNumberInput = page.getByRole('textbox', { name: /(phone|mobile|contact) number/i });
  await expect(phoneNumberInput).toBeVisible(); // Ensure visibility before interacting
  //await phoneNumberInput.click(); // Ensure the field is focused before filling
  // FIX: Replaced brittle getByPlaceholder with the resilient getByRole locator
  await phoneNumberInput.click(); // Ensure the field is focused before filling
  await phoneNumberInput.fill('9898976765');
  //await page.getByPlaceholder('+91 (123) 456-7890').fill('9898976765'); 
  
  await page.getByRole('textbox', { name: /age/i }).fill('25'); 

  await page.getByRole('button', { name: 'Continue to Payment' }).click();
});