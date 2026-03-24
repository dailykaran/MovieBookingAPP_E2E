import { test, expect, Locator } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Wait for the initial page to be fully loaded and network requests to settle.
  await page.waitForLoadState('networkidle');
});

test.skip('Load localhost:3000, verify application display and navigate to movie details for The Avengers', async ({ page }) => {

  // Verify the page title contains one of the expected strings.
  await expect(page).toHaveTitle(/React|Movie|ShowGlow|Movie Booking/i);

  const mainHeadingText = page.getByText(/ShowGlow/i);
  await expect(mainHeadingText).toBeVisible({ timeout: 15000 });

  // Using getByText for resilience, assuming the movie title text itself is clickable or part of a clickable element.
  const avengersMovieLink = page.getByText(/The Avengers/i);

  // Re-enabled visibility check for better debugging and test robustness.
  await expect(avengersMovieLink).toBeVisible({ timeout: 10000 });

  await avengersMovieLink.click();

  // Wait for the page to navigate and load state to settle.
  await page.waitForLoadState('networkidle');
  
  // FIXED: Changed 'link' to 'heading' for resilience, as a movie title on a detail page is typically a heading.
  const movieDetailsHeading = page.getByRole('heading', { name: /The Avengers/i }); 
  await expect(movieDetailsHeading).toBeVisible();
  await expect(movieDetailsHeading).toHaveText(/The Avengers/i);

});


test('Load localhost:3000, navigate to movie details for ID 5', async ({ page }) => {
 await expect(page).toHaveTitle(/React|Movie|ShowGlow|Movie Booking/i);

  await page.goto('http://localhost:3000/movie/5');
  await page.waitForLoadState('networkidle');
  const movie3Link = page.locator('a[href*="movie/5"]'); 
  await movie3Link.click();

  await page.waitForLoadState('load', { timeout: 20000 });
  await expect(page.url()).toContain('/movie/5');
  await page.getByRole('button', {name: '14:30'}).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: /14:30|4:15/i })).toBeVisible();

});