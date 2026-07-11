import { test, expect } from '@playwright/test';

/**
 * Agent portal smoke journey — runs under the `agent-chromium` project only
 * (agent auth state from global-setup provisioning). Assertions are
 * bilingual: the provisioned agent's UI defaults to Greek.
 */

test.describe('Agent Journey', () => {
    test('agent dashboard renders with the KPI strip', async ({ page }) => {
        await page.goto('/dashboard/agent');

        await expect(page).toHaveURL(/dashboard\/agent/);
        // Header CTA + book-of-business KPI strip
        await expect(page.getByText(/Νέος Πελάτης|New Client/i).first()).toBeVisible({ timeout: 20000 });
        await expect(page.getByText(/Σύνολο πελατών|Total clients/i).first()).toBeVisible();
    });

    test('client directory renders with the CRM table', async ({ page }) => {
        await page.goto('/customers');

        await expect(page).toHaveURL(/\/customers/);
        await expect(
            page.getByRole('heading', { name: /client directory|πελατολόγιο|πελάτες|clients/i }).first()
        ).toBeVisible({ timeout: 20000 });
    });

    test('opportunities page is reachable', async ({ page }) => {
        await page.goto('/opportunities');

        await expect(page).not.toHaveURL(/auth\/signin/);
        await expect(
            page.getByText(/ευκαιρί|opportunit/i).first()
        ).toBeVisible({ timeout: 20000 });
    });

    test('renewals pipeline is reachable', async ({ page }) => {
        await page.goto('/renewals');

        await expect(page).not.toHaveURL(/auth\/signin/);
        await expect(page.getByText(/ανανεώσ|renewal/i).first()).toBeVisible({ timeout: 20000 });
    });
});
