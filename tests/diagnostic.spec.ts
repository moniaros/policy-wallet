import { test, expect } from '@playwright/test';

test('Simple diagnostic - can we reach the homepage?', async ({ page }) => {
    console.log('Attempting to navigate to homepage...');

    try {
        await page.goto('/', { timeout: 30000 });
        console.log('Successfully navigated to:', page.url());

        const title = await page.title();
        console.log('Page title:', title);

        const content = await page.content();
        console.log('Page has content:', content.length, 'characters');

        // Just check page loaded
        await expect(page).toHaveTitle(/.+/);
    } catch (error) {
        console.error('Error navigating to page:', error);
        throw error;
    }
});
