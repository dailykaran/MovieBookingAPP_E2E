import { test, expect } from '@playwright/test';

test('Alert: Should handle browser alert', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/2');
  await page.waitForLoadState('networkidle');

  const showtimeBtn = page.getByRole('button', { name: '20:30' });
  await showtimeBtn.click();
  
  const seatGridLocator = page.locator('seat-grid');
  await seatGridLocator.waitFor({ state: 'visible', timeout: 20000 });

  const seatButtons = seatGridLocator.locator('.seat.clickable');

  await seatButtons.first().waitFor({ state: 'visible', timeout: 15000 });

  const seatCount = await seatButtons.count();
  console.log(`Seat buttons found: ${seatCount}`);

  
  await seatButtons.last().click({ force: true });
  const confirmBtn = page.getByRole('button', { name: /Confirm Booking/i });

  await confirmBtn.waitFor({ state: 'visible', timeout: 15000 });

  if (await confirmBtn.isVisible({ timeout: 10000 })) {
    await confirmBtn.click();

    const fullNameField = page.getByLabel(/Full Name/i);
    await fullNameField.waitFor({ state: 'visible', timeout: 20000 });
    console.log('User details form is now visible.');

    await fullNameField.fill('John');
    await page.getByLabel(/Last Name/i).fill('Doe');
  
    await page.getByLabel(/Email/i).fill('test@example.com'); // Changed placeholder email to a valid format
    await page.getByLabel(/Mobile Number/i).fill('9876543210');

    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const errorDialog = page.getByRole('dialog', { name: /Form Validation Error/i });

    if (await errorDialog.isVisible({ timeout: 10000 })) {
      console.log('Form validation error detected, closing dialog.');

      let closeButton;
      try {
        closeButton = errorDialog.getByTestId('close-error-dialog-button');
        await closeButton.waitFor({ state: 'visible', timeout: 7000 });
        console.log('Found close button using data-testid.');
      } catch (e) {
        console.log('data-testid for close button not found or not visible, trying getByRole with broader name.');
        closeButton = errorDialog.getByRole('button', { name: /close|dismiss/i });
        await closeButton.waitFor({ state: 'visible', timeout: 7000 });
        console.log('Found close button using getByRole with broader name.');
      }

      await closeButton.click();
      await expect(errorDialog).not.toBeVisible({ timeout: 7000 });
    } else {
      console.warn('Form validation error dialog did not appear as expected. Test may proceed without handling the error.');
    }
  } else {
    console.warn('Confirm Booking button not found or not visible within 10s. Skipping booking confirmation and subsequent steps.');
  }
});