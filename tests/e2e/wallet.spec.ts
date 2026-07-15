import { test, expect } from '@playwright/test';

/**
 * Wallet smoke tests — run with the policyholder auth state provisioned by
 * global-setup. Assertions are structural/bilingual (Greek-default UI) and
 * independent of how many policies the account holds.
 */

test.describe('Policy Wallet', () => {
    test('wallet page renders for an authenticated user', async ({ page }) => {
        await page.goto('/wallet');

        // No signin bounce; wallet chrome renders. `ασφαλιστήρια` is the Greek the
        // desktop wallet actually uses for the policy-list heading — the regex only
        // knew `συμβόλαια`, so it was matching nothing and passing on retry luck.
        await expect(page).toHaveURL(/\/wallet/);
        await expect(
            page.getByRole('heading', { name: /πορτοφόλι|wallet|συμβόλαι|ασφαλιστήρι|policies/i }).first()
        ).toBeVisible({ timeout: 15000 });
    });

    test('wallet shows either policies or the premium empty state', async ({ page }) => {
        await page.goto('/wallet');

        // Either a policy card/table row exists, or the first-policy empty state pitch.
        // Match the `ενεργ` STEM, not `ενεργό`: the status pill renders uppercase
        // (ΕΝΕΡΓΟ) and JS case-folding does not equate the accented ό with Ο, so the
        // old pattern only ever matched a prose line ("Ενεργό έως …") that the
        // column-based table no longer prints. The stem survives case and gender.
        const anyContent = page
            .getByText(/πρώτο συμβόλαιο|first policy|λήγει|expires|ενεργ|active/i)
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
