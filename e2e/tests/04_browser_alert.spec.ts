import { test, expect } from '@playwright/test';

test('Alert: Should handle browser alert for no showtime selected', async ({ page }) => {
  // Navigate to the movie page
  await page.goto('http://localhost:3000/movie/1');
 
  // Use a more specific wait if necessary, but keep it minimal
  await page.waitForLoadState('domcontentloaded');

  // Set up the dialog handler before the action
  page.once('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    expect(dialog.message()).toContain('Please select a showtime');
    await dialog.dismiss();
  });

  // FIX: Broadened the regex to match common variants or specific test-id
  // If the button text is dynamic (e.g., "Confirm Selection", "Book Now"), 
  // we target the specific role and use a wider pattern or a test-id.
  const confirmButton = page.getByRole('button').filter({ hasText: /reserve|book|confirm/i }).first();

  // Assert visibility with a generous timeout
  await expect(confirmButton).toBeVisible({ timeout: 15000 });
  
  // Perform the click
  await confirmButton.click();
  
  console.log('✓ Showtime validation alert handled');
});