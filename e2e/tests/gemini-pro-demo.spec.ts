import { test, expect } from '@playwright/test';

test('should display movie list with cards', async ({ page }) => {
  await page.goto('http://localhost:3000');


  const pageTitle = page.getByRole('heading', { name: 'Now Showing' });
  
  await expect(pageTitle).toBeVisible();
  
  const searchInput = page.getByPlaceholder(/Search movies/i);
  
  await expect(searchInput).toBeVisible();
  
  const bookButton = page.getByRole('button', { name: /book/i }).nth(0); 
  await expect(bookButton).toBeVisible();
});
