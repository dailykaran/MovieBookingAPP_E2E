import { test, expect } from '@playwright/test';

test('should display YouTube trailer iframe', async ({ page }) => {
    const PORT = process.env.PORT || '3000'; 
    const baseUrl = `http://localhost:${PORT}`;

    await page.goto(baseUrl + '/movie/5');
    await page.waitForURL('**/movie/**');
    
    await page.getByRole('button', { name: /trailer/i }).click();

    const iframeElement = page.frameLocator('iframe[data-testid="new-youtube-trailer-iframe"]');
    await expect(iframeElement.locator('div button[title="Play video"]')).toBeVisible({ timeout: 10000 });

    const src = await iframeElement.locator('div button[title="Play video"]').click();

    const iframeTag = page.locator('iframe[data-testid="new-youtube-trailer-iframe"]');
    await expect(iframeTag).toHaveAttribute('src', /youtube/);
    await expect(iframeTag).toHaveAttribute('sandbox', /allow-scripts allow-accelerometer/);

});