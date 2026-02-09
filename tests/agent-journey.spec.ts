
import { test, expect } from '@playwright/test';

test.describe('Agent Journey', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard');
    });

    test('should display agent dashboard', async ({ page }) => {
        // Dashboard should have agent-specific widgets
        await expect(page.getByText('Good morning', { exact: false })).toBeVisible();
        await expect(page.getByText('Customers')).toBeVisible();
        await expect(page.getByText('Opportunities')).toBeVisible();
    });

    test('should be able to navigate to customers page', async ({ page }) => {
        await page.click('text=Customers');
        await expect(page).toHaveURL(/\/persons/); // Assuming /persons or /customers
        await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
    });

    test('should be able to navigate to opportunities', async ({ page }) => {
        await page.click('text=Opportunities');
        await expect(page).toHaveURL(/\/opportunities/);
        await expect(page.getByRole('heading', { name: 'Opportunities' })).toBeVisible();
    });
});
