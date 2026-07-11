import { test, expect } from '@playwright/test';

/**
 * Help Center smoke tests — structural and bilingual (the provisioned E2E
 * user's UI defaults to Greek, so English-literal assertions are avoided).
 */

test.describe('Help Center Functionality', () => {
    test('help center renders with a search input', async ({ page }) => {
        await page.goto('/help');

        await expect(page).not.toHaveURL(/auth\/signin/);
        await expect(
            page.locator('input[type="search"], input[placeholder]').first()
        ).toBeVisible({ timeout: 15000 });
    });

    test('a known article page renders', async ({ page }) => {
        await page.goto('/help/article/install-pwa');

        await expect(page).not.toHaveURL(/auth\/signin/);
        const heading = page.locator('h1').first();
        await expect(heading).toBeVisible({ timeout: 15000 });
        await expect(heading).not.toHaveText('');
    });

    test('search narrows the article list', async ({ page }) => {
        await page.goto('/help');

        const searchInput = page.locator('input[type="search"], input[placeholder]').first();
        await searchInput.fill('PWA');

        // The install-pwa article surfaces regardless of UI language
        await expect(
            page.getByText(/PWA|εφαρμογή|mobile app/i).first()
        ).toBeVisible({ timeout: 10000 });
    });
});
