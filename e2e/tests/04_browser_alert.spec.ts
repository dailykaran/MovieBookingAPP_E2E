import { test, expect } from '@playwright/test';

test('Alert: Should handle browser alert for no showtime selected', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1'); 
  await page.waitForLoadState('domcontentloaded');

  // Set up the dialog listener before triggering the action
  page.once('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    expect(dialog.message()).toContain('Please select a showtime');
    await dialog.dismiss();
  });

  // Updated selector to match the actual UI element "Confirm Booking"
  const confirmButton = page.getByRole('button', { name: /Confirm Booking/i }); 
  
  // Verify visibility using the updated resilient selector
  await expect(confirmButton).toBeVisible({ timeout: 10000 });
  
  // Click the button to trigger the dialog
  await confirmButton.click();

  console.log('✓ Showtime validation alert handled');
});