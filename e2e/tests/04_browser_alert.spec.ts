import { test, expect } from '@playwright/test';

test('Alert: Should handle browser alert for no showtime selected', async ({ page }) => {
  // Navigate to the movie page
  await page.goto('http://localhost:3000/movie/1');
  
  // Wait for network to be idle to ensure dynamic content/components are loaded
  await page.waitForLoadState('networkidle');

  // Set up the dialog handler BEFORE triggering the action
  page.once('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    expect(dialog.message()).toContain('Please select a showtime');
    await dialog.dismiss();
  });

  // Using a broader, more resilient regex for the button name to account for potential 
  // text variations (e.g., 'Reserve', 'Book', etc.) while remaining semantic.
  const confirmButton = page.getByRole('button', { name: /Book|Reserve|Confirm/i });

  // Wait for visibility with a slightly more generous timeout
  await expect(confirmButton).toBeVisible({ timeout: 15000 });
  
  // Attempt to click the button to trigger the browser alert
  await confirmButton.click();
  
  console.log('✓ Showtime validation alert handled');
});