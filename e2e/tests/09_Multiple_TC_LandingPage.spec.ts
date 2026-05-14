import { test, expect, Locator } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
});

test('Verify application display and navigate to movie details for The Avengers', async ({ page }) => {

  await expect(page).toHaveTitle(/React|Movie|TicketsVenue|Movie Booking/i);
  const mainHeadingText = page.getByText(/TicketsVenue/i);
  await expect(mainHeadingText).toBeVisible({ timeout: 15000 });

  const avengersMovieLink = page.getByText(/The Avengers/i);
  await expect(avengersMovieLink).toBeVisible({ timeout: 10000 });

  await avengersMovieLink.click();
  await page.waitForLoadState('networkidle');
  
  const movieDetailsHeading = page.getByRole('heading', { name: /The Avengers/i }); 
  await expect(movieDetailsHeading).toBeVisible();
  await expect(movieDetailsHeading).toHaveText(/The Avengers/i);

});


test('navigate to movie details for ID 3', async ({ page }) => {
  await expect(page).toHaveTitle(/React|Movie|TicketsVenue|Movie Booking/i);

  const movie3Link = page.locator('.MuiCard-root:has(h2:has-text("The Avengers")) button');
  //const movie3Link = page.locator('.MuiPaper-root.MuiCard-root').filter({ has: page.locator('h2', { hasText: 'The Avengers' })}).filter({ has: page.locator('button')})
  await expect(movie3Link).toBeVisible(); 
  await movie3Link.click();

  await page.waitForLoadState('networkidle', { timeout: 20000 });
  await expect(page.url()).toContain('/movie/3');

  const showtimeButton = page.getByRole('button', {name: '22:30'});
  await expect(showtimeButton).toBeVisible(); 
  await showtimeButton.click();

  await page.waitForLoadState('networkidle');
  await expect(page.locator('seat-grid h3')).toContainText('Select your seats'); // shadow dom elm seat-gird insidse h3
});
