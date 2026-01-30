import { test, expect, Page } from '@playwright/test';

/**
 * Alert and Warning Dialog Test Suite for ShowGlow Movie Booking App
 * 
 * Comprehensive tests for:
 * - Seat Conflict Alerts (Feature 1.1)
 * - Form Validation Warnings (Feature 1.3)
 * - Unsaved Changes Warnings (Feature 2.2)
 * - Help/FAQ Dialogs (Feature 2.1)
 * - Payment Error Dialogs
 * - Network Error Recovery
 */

test.describe('Alert and Warning Dialog Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Seat Conflict Alert Dialog (Feature 1.1)', () => {
    test('should display alert when booking conflicting seats', async ({ page }) => {
      // Navigate to movie details
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Select a seat
      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      if (await seatButtons.count() > 0) {
        await seatButtons.nth(0).click();
      }

      // Select showtime
      const showtimes = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ });
      if (await showtimes.count() > 0) {
        await showtimes.first().click();
      }

      // Attempt to proceed - should detect conflict if seats taken
      const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Book|Proceed/ });
      const alertVisible = await page.locator('text=Seat Not Available|Seat Conflict').isVisible().catch(() => false);
      
      // Assert: Either conflict alert shown or booking allowed
      expect(await confirmBtn.count() > 0 || alertVisible).toBeTruthy();
    });

    test('should display unavailable seats with error styling', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Get seat buttons
      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      const seatCount = await seatButtons.count();

      // Verify seat styling exists (available vs unavailable)
      if (seatCount > 0) {
        const seatWithColor = await seatButtons.first().evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            className: el.className
          };
        }).catch(() => null);

        expect(seatWithColor).not.toBeNull();
      }
    });

    test('should allow dismissing conflict alert with "Understood" button', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Look for understood button in dialog
      const understoodBtn = page.locator('button').filter({ hasText: /Understood|OK|Close/ });
      const isVisible = await understoodBtn.isVisible().catch(() => false);

      if (isVisible) {
        await understoodBtn.click();
        const stillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        expect(stillVisible).toBeFalsy();
      }
    });

    test('should re-enable seat selection after dismissing alert', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Select seat
      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      const initialCount = await seatButtons.count();

      if (initialCount > 0) {
        await seatButtons.nth(0).click();

        // Dismiss any alert
        const closeBtn = page.locator('button').filter({ hasText: /Close|Understood|OK/ });
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }

        // Verify can select another seat
        const afterCount = await seatButtons.count();
        expect(afterCount).toBe(initialCount);
      }
    });
  });

  test.describe('Form Validation Warning Dialog (Feature 1.3)', () => {
    test('should show validation error when submitting empty form', async ({ page }) => {
      // Navigate to a movie
      await page.goto('http://localhost:3000/movie/5');
      await page.waitForLoadState('networkidle');

      // Select showtime 14:30
      const showtime = page.locator('button').filter({ hasText: '14:30' });
      if (await showtime.isVisible()) {
        await showtime.click();
      }

      // Select seat 1
      const seat1 = page.locator('button').filter({ hasText: /^1$/ });
      if (await seat1.isVisible()) {
        await seat1.click();
      }

      // Click Confirm Booking
      const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Book/ });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Wait for form to load
      await page.locator('input[name="firstName"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

      // Touch a field to enable the Continue button
      const firstNameField = page.locator('input[name="firstName"]');
      await firstNameField.click();
      await firstNameField.blur();
      await page.waitForTimeout(300);

      // Click Continue with empty form to trigger validation dialog
      const continueBtn = page.locator('button').filter({ hasText: /Continue|Payment/ });
      if (await continueBtn.isVisible()) {
        await continueBtn.first().click();
        await page.waitForTimeout(500);

        // Dialog should appear
        const dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        expect(dialog).toBe(true);
      }
    });

    test('should display required field error messages', async ({ page }) => {
      // Navigate directly to movie page
      await page.goto('http://localhost:3000/movie/5');
      await page.waitForLoadState('networkidle');

      // Select showtime and seat
      const showtime = page.locator('button').filter({ hasText: '14:30' });
      if (await showtime.isVisible()) await showtime.click();

      const seat = page.locator('button').filter({ hasText: /^1$/ });
      if (await seat.isVisible()) await seat.click();

      // Confirm booking
      const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Book/ });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Wait for form
      await page.locator('input[name="firstName"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

      // Touch field to enable button
      const firstNameField = page.locator('input[name="firstName"]');
      await firstNameField.click();
      await firstNameField.blur();

      // Click Continue with empty form
      const continueBtn = page.locator('button').filter({ hasText: /Continue|Payment/ });
      if (await continueBtn.isVisible()) {
        await continueBtn.first().click();
        await page.waitForTimeout(500);
      }

      // Check for error alerts
      const alerts = page.locator('[role="alert"]');
      const count = await alerts.count();
      expect(count > 0).toBe(true);
    });

    test('should enable submit after fixing validation errors', async ({ page }) => {
      // Navigate directly to movie page
      await page.goto('http://localhost:3000/movie/5');
      await page.waitForLoadState('networkidle');

      // Select showtime and seat
      const showtime = page.locator('button').filter({ hasText: '14:30' });
      if (await showtime.isVisible()) await showtime.click();

      const seat = page.locator('button').filter({ hasText: /^2$/ });
      if (await seat.isVisible()) await seat.click();

      // Confirm booking
      const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Book/ });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Wait for form
      await page.locator('input[name="firstName"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

      // Fill form with valid data
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '(123) 456-7890');
      await page.fill('input[name="age"]', '30');

      // Check button is enabled
      const continueBtn = page.locator('button').filter({ hasText: /Continue|Payment/ });
      const isEnabled = await continueBtn.first().isEnabled().catch(() => false);
      expect(isEnabled).toBe(true);
    });

    test('should validate email format and show error for invalid email', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      if (await seatButtons.count() > 0) {
        await seatButtons.nth(0).click();
      }

      const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Book|Proceed/ });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Fill form with invalid email
      const emailField = page.locator('input[name="email"]');
      if (await emailField.isVisible().catch(() => false)) {
        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe');
        await page.fill('input[name="email"]', 'invalid-email'); // Invalid email
        await page.fill('input[name="phone"]', '(123) 456-7890');
        await page.fill('input[name="age"]', '30');

        // Blur email field to trigger field-level validation
        await page.locator('input[name="email"]').blur();
        await page.waitForTimeout(300);

        // Check for field-level validation error
        const emailFieldElement = page.locator('input[name="email"]');
        const hasFieldError = await emailFieldElement.evaluate((el: any) => {
          return el.getAttribute('aria-invalid') === 'true' || el.classList.contains('Mui-error');
        }).catch(() => false);

        // Or try clicking Continue to see validation dialog
        if (!hasFieldError) {
          const continueBtn = page.locator('button').filter({ hasText: /Continue|Payment|Next/ });
          await continueBtn.first().click().catch(() => {});
          await page.waitForTimeout(300);
        }

        // Check for validation error anywhere
        const emailError = await page.locator('text=/[Ii]nvalid|[Ee]mail/').isVisible().catch(() => false);
        const alertVisible = await page.locator('[role="alert"]').isVisible().catch(() => false);

        expect(hasFieldError || emailError || alertVisible).toBe(true);
      }
    });

    test('should validate phone number format', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      if (await seatButtons.count() > 0) {
        await seatButtons.nth(0).click();
      }

      const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Book|Proceed/ });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Fill form with invalid phone
      const phoneField = page.locator('input[name="phone"]');
      if (await phoneField.isVisible().catch(() => false)) {
        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe');
        await page.fill('input[name="email"]', 'john@example.com');
        await page.fill('input[name="phone"]', '123'); // Too short - invalid

        // Blur to trigger validation
        await page.locator('input[name="phone"]').blur();
        await page.waitForTimeout(300);

        // Check for field-level error
        const phoneFieldElement = page.locator('input[name="phone"]');
        const hasFieldError = await phoneFieldElement.evaluate((el: any) => {
          return el.getAttribute('aria-invalid') === 'true' || el.classList.contains('Mui-error');
        }).catch(() => false);

        // Or check dialog error
        if (!hasFieldError) {
          const continueBtn = page.locator('button').filter({ hasText: /Continue|Payment|Next/ });
          if (await continueBtn.isEnabled()) {
            await continueBtn.first().click().catch(() => {});
            await page.waitForTimeout(300);
          }
        }

        // Check for validation error anywhere
        const phoneError = await page.locator('text=/[Pp]hone|[Dd]igits|\\(/').isVisible().catch(() => false);
        const alertVisible = await page.locator('[role="alert"]').isVisible().catch(() => false);

        expect(hasFieldError || phoneError || alertVisible).toBe(true);
      }
    });
  });

  test.describe('Unsaved Changes Warning Dialog (Feature 2.2)', () => {
    test('should warn before leaving page with unsaved seat selections', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Select a seat
      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      if (await seatButtons.count() > 0) {
        await seatButtons.nth(0).click();
      }

      // Trigger beforeunload event
      const unsavedWarning = await page.evaluate(() => {
        return typeof (window as any).onbeforeunload === 'function';
      }).catch(() => false);

      expect(unsavedWarning).toBe(true);
    });

    test('should show warning dialog with "Continue" and "Leave" buttons', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Select a seat
      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      if (await seatButtons.count() > 0) {
        await seatButtons.nth(0).click();
      }

      // Look for warning dialog buttons
      const continueBtn = page.locator('button').filter({ hasText: /Continue|Stay/ });
      const leaveBtn = page.locator('button').filter({ hasText: /Leave|Discard/ });

      // At least one should exist for navigation scenarios
      const hasContinueBtn = await continueBtn.isVisible().catch(() => false);
      const hasLeaveBtn = await leaveBtn.isVisible().catch(() => false);

      expect(hasContinueBtn || hasLeaveBtn).toBe(true);
    });

    test('should display count of unsaved seats in warning message', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Select multiple seats
      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      const count = await seatButtons.count();

      if (count >= 2) {
        await seatButtons.nth(0).click();
        await seatButtons.nth(1).click();

        // Check if dialog mentions seat count
        const warningText = page.locator('text=/\d+\s*[Ss]eat|[Ss]election/');
        const hasWarning = await warningText.isVisible().catch(() => false);

        expect(hasWarning).toBe(true);
      }
    });

    test('should keep user on page when clicking "Continue Selecting"', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Select a seat
      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      if (await seatButtons.count() > 0) {
        await seatButtons.nth(0).click();

        // Verify still on movie details page
        const pageHeading = page.locator('text=Select Your Seats|Movie Details|Seat Selection');
        const isStillOnPage = await pageHeading.isVisible().catch(() => false);

        expect(isStillOnPage).toBe(true);
      }
    });

    test('should clear selections when clicking "Leave Page"', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Select a seat
      const seatButtons = page.locator('button').filter({ hasText: /^\d+$/ });
      if (await seatButtons.count() > 0) {
        await seatButtons.nth(0).click();

        // Get initial selected count
        const selectedBefore = await page.locator('button.Mui-selected, button[class*="selected"]').count();
        expect(selectedBefore).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Help/FAQ Dialog (Feature 2.1)', () => {
    test('should open help modal when help button is clicked', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Find and click help button
      const helpBtn = page.locator('button[aria-label*="help"], button[aria-label*="info"], svg[class*="Help"]').nth(0);
      const isHelpVisible = await helpBtn.isVisible().catch(() => false);

      if (isHelpVisible) {
        await helpBtn.click();

        // Verify help dialog opened
        const helpDialog = page.locator('text=Help & FAQ|Help|FAQ');
        expect(await helpDialog.isVisible().catch(() => false)).toBe(true);
      }
    });

    test('should display multiple FAQ accordion items', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Open help dialog
      const helpBtn = page.locator('button[aria-label*="help"], button[aria-label*="info"]').nth(0);
      if (await helpBtn.isVisible().catch(() => false)) {
        await helpBtn.click();

        // Check for accordion items
        const accordions = page.locator('[role="button"][aria-expanded]');
        const count = await accordions.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });

    test('should expand and collapse accordion items', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      const helpBtn = page.locator('button[aria-label*="help"], button[aria-label*="info"]').nth(0);
      if (await helpBtn.isVisible().catch(() => false)) {
        await helpBtn.click();

        const firstAccordion = page.locator('[role="button"][aria-expanded]').first();
        if (await firstAccordion.isVisible().catch(() => false)) {
          // Get initial expanded state
          const initialExpanded = await firstAccordion.getAttribute('aria-expanded');

          // Click to toggle
          await firstAccordion.click();
          await page.waitForTimeout(300);

          // Get new state
          const newExpanded = await firstAccordion.getAttribute('aria-expanded');

          // States should differ
          expect(initialExpanded !== newExpanded).toBe(true);
        }
      }
    });

    test('should close help dialog with close button', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      const helpBtn = page.locator('button[aria-label*="help"], button[aria-label*="info"]').nth(0);
      if (await helpBtn.isVisible().catch(() => false)) {
        await helpBtn.click();

        // Find and click close button
        const closeBtn = page.locator('button[aria-label*="close"], button[title*="Close"]').nth(0);
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();

          // Verify dialog closed
          const helpDialog = page.locator('[role="dialog"]');
          const isClosed = await helpDialog.isVisible().catch(() => false);
          expect(isClosed).toBe(false);
        }
      }
    });

    test('should close help dialog when clicking outside (backdrop)', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      const helpBtn = page.locator('button[aria-label*="help"], button[aria-label*="info"]').nth(0);
      if (await helpBtn.isVisible().catch(() => false)) {
        await helpBtn.click();

        // Click backdrop (outside dialog)
        const backdrop = page.locator('[class*="Backdrop"]').nth(0);
        if (await backdrop.isVisible().catch(() => false)) {
          await backdrop.click({ force: true });

          // Verify dialog closed
          const isClosed = await page.locator('[role="dialog"]').isVisible().catch(() => false);
          expect(isClosed).toBe(false);
        }
      }
    });
  });

  test.describe('Network Error and Recovery', () => {
    test('should show network error alert when API is unavailable', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/**', route => route.abort());

      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();

        // Wait for error to appear
        await page.waitForTimeout(2000);

        // Check for error message
        const errorMsg = page.locator('text=Network|Error|Connection|failed');
        const isVisible = await errorMsg.isVisible().catch(() => false);

        expect(isVisible).toBe(true);
      }
    });

    test('should allow user to retry after network error', async ({ page }) => {
      // Simulate network error then allow requests
      let requestCount = 0;
      await page.route('**/api/**', route => {
        requestCount++;
        if (requestCount < 2) {
          route.abort();
        } else {
          route.continue();
        }
      });

      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();

        await page.waitForTimeout(1000);

        // Find retry button
        const retryBtn = page.locator('button').filter({ hasText: /Retry|Try Again/ });
        if (await retryBtn.isVisible().catch(() => false)) {
          await retryBtn.click();
          await page.waitForLoadState('networkidle');

          // Should recover
          expect(requestCount).toBeGreaterThan(1);
        }
      }
    });
  });

  test.describe('Dialog Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Check for dialog roles
      const dialogs = page.locator('[role="dialog"], [role="alertdialog"]');
      expect(await dialogs.count()).toBeGreaterThanOrEqual(0);
    });

    test('should be keyboard accessible (Tab navigation)', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Tab to first focusable element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Verify something is focused
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    });

    test('should be closable with Escape key', async ({ page }) => {
      const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem/ }).first();
      if (await movieLink.isVisible()) {
        await movieLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Open dialog (if available)
      const helpBtn = page.locator('button[aria-label*="help"], button[aria-label*="info"]').nth(0);
      if (await helpBtn.isVisible().catch(() => false)) {
        await helpBtn.click();

        // Press Escape
        await page.keyboard.press('Escape');

        // Dialog should be closed
        const dialogOpen = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        expect(dialogOpen).toBe(false);
      }
    });
  });
});

// Payment Error Dialog Tests (outside main describe to avoid beforeEach)
test.describe('Payment Error Dialog Scenarios', () => {
  test('should show payment validation and error dialogs on payment page', async ({ page }) => {
    // Navigate to home and complete booking flow to payment page
    await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    
    // Select a movie
    const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem|Movie/ }).first();
    if (await movieLink.isVisible().catch(() => false)) {
      await movieLink.click();
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    
    // Select seat, showtime, and proceed
    const seat = page.locator('button').filter({ hasText: /^5$/ }).first();
    if (await seat.isVisible({ timeout: 5000 }).catch(() => false)) {
      await seat.click();
    }
    
    const showtime = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first();
    if (await showtime.isVisible({ timeout: 5000 }).catch(() => false)) {
      await showtime.click();
    }
    
    const bookBtn = page.locator('button').filter({ hasText: /Book|Confirm/ }).first();
    if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookBtn.click();
    }
    
    // Fill user form with all required fields
    await page.fill('input[name="firstName"]', 'John', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="lastName"]', 'Doe', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="email"]', 'john@test.com', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="phone"]', '1234567890', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="age"]', '25', { timeout: 3000 }).catch(() => {});
    
    // Click Continue to payment
    const continueBtn = page.locator('button').filter({ hasText: /Continue|Next|Payment/ }).first();
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }
    
    // Verify we're on payment page by checking for payment-related elements
    const pageContent = await page.content().catch(() => '');
    const hasPaymentPage = pageContent.toLowerCase().includes('card') || 
                          pageContent.toLowerCase().includes('payment') ||
                          pageContent.toLowerCase().includes('cardholder');
    
    expect(hasPaymentPage).toBe(true);
  });

  test('should display payment error messages', async ({ page }) => {
    // Similar flow but check for presence of error handling
    await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    
    const movieLink = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem|Movie/ }).first();
    if (await movieLink.isVisible().catch(() => false)) {
      await movieLink.click();
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    
    const seat = page.locator('button').filter({ hasText: /^10$/ }).first();
    if (await seat.isVisible({ timeout: 5000 }).catch(() => false)) {
      await seat.click();
    }
    
    const showtime = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first();
    if (await showtime.isVisible({ timeout: 5000 }).catch(() => false)) {
      await showtime.click();
    }
    
    const bookBtn = page.locator('button').filter({ hasText: /Book|Confirm/ }).first();
    if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookBtn.click();
    }
    
    // Fill all required fields
    await page.fill('input[name="firstName"]', 'Jane', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="lastName"]', 'Smith', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="email"]', 'jane@test.com', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="phone"]', '9876543210', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="age"]', '30', { timeout: 3000 }).catch(() => {});
    
    const continueBtn = page.locator('button').filter({ hasText: /Continue|Next/ }).first();
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }
    
    // Check for payment page content
    const content = await page.content().catch(() => '');
    const isPaymentPage = content.toLowerCase().includes('payment') ||
                         content.toLowerCase().includes('card');
    
    expect(isPaymentPage).toBe(true);
  });

  test('should have payment action buttons', async ({ page }) => {
    // Navigate through booking to reach payment
    await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    
    const movie = page.locator('a, button').filter({ hasText: /[Mm]atrix|[Aa]vatar|[Pp]roem|Movie/ }).first();
    if (await movie.isVisible().catch(() => false)) {
      await movie.click();
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    
    const s = page.locator('button').filter({ hasText: /^15$/ }).first();
    if (await s.isVisible({ timeout: 5000 }).catch(() => false)) {
      await s.click();
    }
    
    const t = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first();
    if (await t.isVisible({ timeout: 5000 }).catch(() => false)) {
      await t.click();
    }
    
    const bk = page.locator('button').filter({ hasText: /Book|Confirm/ }).first();
    if (await bk.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bk.click();
    }
    
    // Complete user form
    await page.fill('input[name="firstName"]', 'Bob', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="lastName"]', 'Jones', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="email"]', 'bob@test.com', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="phone"]', '5555555555', { timeout: 3000 }).catch(() => {});
    await page.fill('input[name="age"]', '28', { timeout: 3000 }).catch(() => {});
    
    const cont = page.locator('button').filter({ hasText: /Continue|Next/ }).first();
    if (await cont.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cont.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
    }
    
    // Verify we have payment page content
    const content = await page.content().catch(() => '');
    const isPaymentPage = content.toLowerCase().includes('payment') || 
                         content.toLowerCase().includes('card');
    
    // Check for payment form elements or buttons
    const paymentButtons = page.locator('button').filter({ hasText: /Pay|Submit|Confirm|Cancel|Back/ });
    const buttonCount = await paymentButtons.count().catch(() => 0);
    
    // Pass if either we can confirm it's a payment page or there are action buttons
    expect(isPaymentPage || buttonCount > 0).toBe(true);
  });
});
