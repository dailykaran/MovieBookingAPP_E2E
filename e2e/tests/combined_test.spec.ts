import { test, expect } from '@playwright/test';


test('Movie cards are visible and actionable( focus)', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // ✅ Visibility
  const movieCards = await page.locator('[class*="MuiCard"]').count();
  expect(movieCards).toBeGreaterThan(0);
  
  // ✅ Actionability - Book Now Button
  const bookButton = page.locator('[href*="movie/1"]').first();
  await expect(bookButton).toBeVisible();
  await expect(bookButton).toBeEnabled();
  await bookButton.focus();
  await expect(bookButton).toBeFocused({ timeout: 5000 });
});


test('Search field is visible and interactive', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // ✅ Visibility
  const searchField = page.locator('input[placeholder="Search movies..."]');
  await expect(searchField).toBeVisible();
  
  // ✅ Actionability
  await searchField.fill('The Avengers');
  const results = await page.locator('[class*="MuiCard"]').count();
  expect(results).toBeGreaterThan(0);
});

test('Seat grid displays all 100 seats with correct states', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  
  // ✅ Visibility - All seats visible
  await page.locator('button[value="17:30"]').click(); // Select a showtime
  
  const seatButtons = await page.locator('button').filter({ hasText: /^\d+$/ }).all(); //  One or more digits (0-9) serach by \d+
  expect(seatButtons.length).toBe(100);
  
  // ✅ Actionability - Available seats are clickable
  const availableSeat = seatButtons.find(btn => {
    // Find a seat that's not disabled
    return btn.getAttribute('disabled').then(attr => attr === null);
  });
  expect(availableSeat).toBeDefined();
  if (availableSeat) {
    await availableSeat.click();
  }
});

test('Error dialog appears and is dismissible', async ({ page }) => { // this test case failed at 58, no error dialog appears
  await page.goto('http://localhost:3000/movie/1');
  
  // Trigger error (e.g., try to book without selecting seats)
  await page.locator('button').getByText('Confirm Booking', {exact: true}) .click();
  
  // ✅ Dialog Visibility
  const errorDialog = page.locator('[role="dialog"]:has-text("Error")');
  await expect(errorDialog).toBeVisible();
  
  // ✅ Dialog Actionability
  const closeButton = page.locator('button:has-text("Close")');
  await expect(closeButton).toBeEnabled();
  await closeButton.click();
  await expect(errorDialog).not.toBeVisible();
});

test('Loading spinner appears during booking', async ({ page }) => { // this test case failed at 77, no error dialog appears
  // Navigate through flow
  await page.goto('http://localhost:3000/movie/1');
  
  // Select seat
  const seat = await page.locator('button[value="17:30"]');
  await seat.click();
  
  // Click proceed (triggers API call)
  await page.locator('button').getByText('Confirm Booking', {exact: true}).click();
  
  // ✅ Dialog with loading state
  const loadingDialog = page.locator('[role="dialog"]:has-text("Processing")');
  await expect(loadingDialog).toBeVisible();
});

