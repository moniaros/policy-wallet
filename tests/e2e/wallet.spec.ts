import { test, expect } from '@playwright/test';

/**
 * Wallet smoke tests — run with the policyholder auth state provisioned by
 * global-setup. Assertions are structural/bilingual (Greek-default UI) and
 * independent of how many policies the account holds.
 */

test.describe('Policy Wallet', () => {
    test('wallet page renders for an authenticated user', async ({ page }) => {
        await page.goto('/wallet');

        // No signin bounce; wallet chrome renders
        await expect(page).toHaveURL(/\/wallet/);
        await expect(
            page.getByRole('heading', { name: /πορτοφόλι|wallet|συμβόλαι|policies/i }).first()
        ).toBeVisible({ timeout: 15000 });
    });

    test('wallet shows either policies or the premium empty state', async ({ page }) => {
        await page.goto('/wallet');

        // Either a policy card/table row exists, or the first-policy empty state pitch
        const anyContent = page
            .getByText(/πρώτο συμβόλαιο|first policy|λήγει|expires|ενεργό|active/i)
            .first();
        await expect(anyContent).toBeVisible({ timeout: 15000 });
    });

    test('add-policy page is reachable', async ({ page }) => {
        await page.goto('/wallet/add');

        await expect(page).toHaveURL(/\/wallet\/add/);
        // The upload/manual form renders (file dropzone or insurer field)
        await expect(
            page.locator('input[type="file"], input[name="insurerName"], form').first()
        ).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Coverage Insights', () => {
    test('coverage insights page renders for an authenticated user', async ({ page }) => {
        await page.goto('/coverage-insights');

        await expect(page).not.toHaveURL(/auth\/signin/);
        await expect(
            page.getByText(/κάλυψη|coverage|προστασία|protection|προτάσεις|recommendation/i).first()
        ).toBeVisible({ timeout: 20000 });
    });
});
