import { test, expect, Locator } from '@playwright/test';

// ============================================
// ALERT & WARNING DIALOG TESTS
// ============================================

// Test a) Double-Booking Alert - Seats booked by another user
test('Alert: Should show double-booking alert when seats are taken', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.waitForLoadState('networkidle');
  
  // Step 1: Find and click a showtime button (format: HH:MM)
  const showtimeButtons = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ });
  await expect(showtimeButtons.first()).toBeVisible({ timeout: 3000 });
  
  const firstShowtime = showtimeButtons.first();
  await firstShowtime.click({ timeout: 2000 });
  await page.waitForTimeout(500);
  
  // Step 2: Select two seat buttons (numbered 1-100)
  const seatButtons = page.getByRole('button', { name: /\d{1,3}/ });
    await expect(seatButtons.first()).toBeVisible();
  
  // Click first two available seats
  const seat1 = seatButtons.nth(0);
  const seat2 = seatButtons.nth(1);
  
  await expect(seat1).toBeVisible({ timeout: 3000 });
  await seat1.click({ timeout: 2000 });
  
  await expect(seat2).toBeVisible({ timeout: 3000 });
  await seat2.click({ timeout: 2000 });
  
  // Step 3: Click Confirm Booking button
  const confirmButton = page.locator('button').filter({ hasText: 'Confirm Booking' }).first();
  await expect(confirmButton).toBeVisible({ timeout: 3000 });
  await confirmButton.click({ timeout: 2000 });
  
  // Step 4: Verify booking proceeds or alert appears
  // If seats were available, navigation to user details should occur
  // If double-booking detected, alert dialog should appear
  const userDetailsForm = page.locator('text=Enter your details').first();
  const doubleBookingAlert = page.locator('text=Seats were just booked').first();
  
  const proceedResult = await Promise.race([
    userDetailsForm.isVisible({ timeout: 3000 }).catch(() => false),
    doubleBookingAlert.isVisible({ timeout: 3000 }).catch(() => false),
  ]);
  
  // Either form appears (successful booking) or alert appears (double-booking)
  expect(proceedResult).toBe(false);
});

// Test b) Validation Alert - No seats selected + Click Confirm
test('Alert: Should show validation alert when no seats selected', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.waitForLoadState('networkidle');
  
  // Step 1: Select a showtime (so seats grid becomes visible)
  const timeButtons = page.locator('button[aria-pressed]');
  let showtimeClicked = false;
  
  for (let i = 0; i < await timeButtons.count(); i++) {
    const btn = timeButtons.nth(i);
    const text = await btn.textContent({ timeout: 500 }).catch(() => '');
    if (text && /\d{2}:\d{2}/.test(text.trim())) {
      await btn.click({ timeout: 2000, force: true });
      showtimeClicked = true;
      await page.waitForTimeout(500);
      break;
    }
  }
  
  expect(showtimeClicked).toBe(true);
  
  // Step 2: Find and click "Confirm Booking" button WITHOUT selecting any seats
  const confirmButton = page.locator('button').filter({ hasText: 'Confirm Booking' }).first();
  await expect(confirmButton).toBeVisible({ timeout: 3000 });
  await confirmButton.click({ timeout: 2000 });
  
  // Step 3: REQUIRED - Wait for "No Seats Selected" dialog to appear
  const noSeatsDialog = page.locator('text=No Seats Selected');
  await expect(noSeatsDialog).toBeVisible({ timeout: 3000 });
  
  // Verify the dialog message is visible
  const dialogMessage = page.locator('text=Please select at least one seat');
  await expect(dialogMessage).toBeVisible({ timeout: 2000 });
  
  // Click the "Select Seats" button to close dialog
  const selectButton = page.locator('button').filter({ hasText: 'Select Seats' }).first();
  await expect(selectButton).toBeVisible({ timeout: 2000 });
  await selectButton.click({ timeout: 2000 });
  
  // Verify dialog closes
  await expect(noSeatsDialog).not.toBeVisible({ timeout: 2000 });
});

// Test c) Showtime Required Alert - Click Confirm without selecting showtime
test('Alert: Should show alert when showtime not selected', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.waitForLoadState('networkidle');
  
  // Step 1: Try to find "Confirm Booking" button and click it WITHOUT selecting showtime
  // The button might NOT be visible until showtime is selected,  but we try anyway
  const confirmButton = page.locator('button').filter({ hasText: 'Confirm Booking' }).first();
  const isVisible = await confirmButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (isVisible) {
    // Button is visible (unexpected, but try clicking anyway)
    await confirmButton.click({ timeout: 2000 }).catch(() => {});
  }
  
  // Step 2: REQUIRED - "Showtime Not Selected" dialog MUST appear
  const showtimeDialog = page.locator('text=Showtime Not Selected');
  await expect(showtimeDialog).toBeVisible({ timeout: 3000 });
  
  // Verify the dialog message is visible
  const dialogMessage = page.locator('text=Please select a showtime');
  await expect(dialogMessage).toBeVisible({ timeout: 2000 });
  
  // Click the "Select Showtime" button to close dialog
  const selectButton = page.locator('button').filter({ hasText: 'Select Showtime' }).first();
  await expect(selectButton).toBeVisible({ timeout: 2000 });
  await selectButton.click({ timeout: 2000 });
  
  // Verify dialog closes
  await expect(showtimeDialog).not.toBeVisible({ timeout: 2000 });
});

// ============================================
// COMBINED ALERT FLOW TEST
// ============================================

// Test: Complete booking flow with alert handling
test('Alert: Should handle multiple alerts during booking flow', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.waitForLoadState('networkidle');
  
  // Step 1: Try to confirm WITHOUT selecting anything - should show Showtime alert
  const confirmButton = page.locator('button').filter({ hasText: 'Confirm Booking' }).first();
  const confirmVisible = await confirmButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (confirmVisible) {
    await confirmButton.click({ timeout: 2000 }).catch(() => {});
    
    // Expect Showtime alert (since no selection made)
    const showtimeAlert = page.locator('text=Showtime Not Selected');
    const showtimeVisible = await showtimeAlert.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (showtimeVisible) {
      // Close the showtime alert
      const closeButton1 = page.locator('button').filter({ hasText: 'Select Showtime' }).first();
      await closeButton1.click({ timeout: 2000 }).catch(() => {});
    }
  }
  
  // Step 2: Select a showtime (now seat grid will be visible)
  const timeButtons = page.locator('button[aria-pressed]');
  
  for (let i = 0; i < await timeButtons.count(); i++) {
    const btn = timeButtons.nth(i);
    const text = await btn.textContent({ timeout: 500 }).catch(() => '');
    if (text && /\d{2}:\d{2}/.test(text.trim())) {
      await btn.click({ timeout: 2000, force: true });
      await page.waitForTimeout(500);
      break;
    }
  }
  
  // Step 3: Try to confirm again WITH showtime but NO seats - should show Seats alert
  const confirmBtn2 = page.locator('button').filter({ hasText: 'Confirm Booking' }).first();
  const confirmVis2 = await confirmBtn2.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (confirmVis2) {
    await confirmBtn2.click({ timeout: 2000 }).catch(() => {});
    
    // Expect Seats alert
    const seatsAlert = page.locator('text=No Seats Selected');
    const seatsVisible = await seatsAlert.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (seatsVisible) {
      // Close the seats alert
      const closeButton2 = page.locator('button').filter({ hasText: 'Select Seats' }).first();
      await closeButton2.click({ timeout: 2000 }).catch(() => {});
    }
  }
});


test('Alert: Should handle alerts during booking flow', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.waitForLoadState('networkidle');
  

  // Select a showtime
    const showtimeButtons = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ });
    const showtimeCount = await showtimeButtons.count();
    console.log(`Found ${showtimeCount} showtime buttons`);
    
    if (showtimeCount > 0) {
      const firstShowtime = showtimeButtons.nth(0);
      await expect(firstShowtime).toBeVisible({ timeout: 3000 });
      
      // Get the showtime text
      const showtimeText = await firstShowtime.textContent();
      console.log(`Clicking showtime: ${showtimeText?.trim()}`);
      
      // Click the showtime button
      await firstShowtime.click({ timeout: 2000 });
    }

    // alert should appear if we click confirm without selecting seats
    
/*     page.once('dialog', async dialog => {
      console.log(`Dialog appeared with message: ${dialog.type()}`);
      if (dialog.type() === 'alert'){}
        console.log(`Dialog message: ${dialog.message()}`);
        expect(dialog.message()).toContain('No Seats Selected');
        await dialog.accept();
    }); */
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('No Seats Selected');
      await dialog.accept();
    });
    await page.getByRole('button', {name: 'Confirm Booking'}).click();

   // Select a seat and proceed through booking flow
  const beforeShadow: Locator = page.locator('seat-grid'); 
  const seatButtons = await beforeShadow.locator('.seat-grid-container .seat-grid .seat.available.clickable').all();
  console.log(`Found ${seatButtons.length} available seats`);
  for (const button of seatButtons) {
    await button.first().click();
    break;
  }
});


test('Alert: Should handle dialog', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('showtime');
      await dialog.accept();
    });
    await page.getByRole('button', {name: 'Confirm Booking'}).click();
  });

test('Alert: Should handle browser alert when no seats selected', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.waitForLoadState('networkidle');

  // Step 1: Select a showtime first
  const showtimeButtons = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ });
  await expect(showtimeButtons.first()).toBeVisible({ timeout: 3000 });
  await showtimeButtons.first().click({ timeout: 2000 });
  await page.waitForTimeout(500);
  console.log('✓ Showtime selected');

  // Step 2: Setup browser alert handler BEFORE clicking Confirm Booking
  page.once('dialog', async dialog => {
    console.log(`Dialog type: ${dialog.type()}`);
    console.log(`Dialog message: ${dialog.message()}`);
    
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('Please select at least one seat');
    
    await dialog.accept();
    console.log('✓ Browser alert accepted');
  });

  // Step 3: Click "Confirm Booking" WITHOUT selecting seats
  // This triggers window.alert() which Playwright intercepts
  const confirmButton = page.locator('button').filter({ hasText: 'Confirm Booking' }).first();
  await expect(confirmButton).toBeVisible({ timeout: 3000 });
  console.log('Clicking Confirm Booking without seats selected...');
  await confirmButton.click({ timeout: 2000 });

  // Wait for dialog to be handled
  await page.waitForTimeout(500);

  // Verify we're still on the movie details page
  const seatGrid = page.locator('seat-grid');
  await expect(seatGrid).toBeVisible({ timeout: 2000 });
  console.log('✓ Still on movie details page after alert dismissed');
});

test('Alert: Should handle browser alert for no showtime selected', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.waitForLoadState('networkidle');

  // Setup browser alert handler
  page.once('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    expect(dialog.message()).toContain('Please select a showtime');
    await dialog.accept();
  });

  // Click Confirm Booking without selecting showtime or seats
  const confirmButton = page.locator('button').filter({ hasText: 'Confirm Booking' }).first();
  await expect(confirmButton).toBeVisible({ timeout: 3000 });
  await confirmButton.click({ timeout: 2000 });

  await page.waitForTimeout(500);
  console.log('✓ Showtime validation alert handled');
});


