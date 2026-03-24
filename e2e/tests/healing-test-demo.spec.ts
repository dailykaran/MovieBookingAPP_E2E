import { test, expect } from '@playwright/test';

test('should find movie by searching for title', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // FIXED: Use correct placeholder text from MovieList component
  // The search field uses placeholder="Search movies..."
  const searchField = page.locator('input[placeholder="Search movies..."]');
  
  await expect(searchField).toBeVisible();
  await searchField.fill('Avengers');
  await page.waitForLoadState('networkidle');
  
  // Verify a movie card appears
  const movieCard = page.locator('text=Avengers').first();
  await expect(movieCard).toBeVisible();
});
