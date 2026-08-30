import { test as setup } from '@playwright/test';
import path from 'path';
import { E2E_POLICYHOLDER_DASH } from './e2e-users';
import { dismissCookieBanner } from './helpers/ui';

/**
 * DASHBOARD fixture authentication.
 *
 * Same shape as auth.setup.ts (UI login only; the account is provisioned by
 * tests/global-setup.ts). Separate session because the dashboard matrix rebuilds
 * this account's WALLET between captures — portfolio state is a property of the
 * user, not of a policy — and doing that to the shared policyholder would
 * destroy the policy-detail fixtures on every run.
 */

const authFile = path.join(__dirname, '../playwright/.auth/dash.json');

setup('authenticate as dashboard policyholder', async ({ page }) => {
    setup.setTimeout(90000);
    console.log(`🔐 Signing in as ${E2E_POLICYHOLDER_DASH.email}...`);

    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);

    await page.fill('input[type="email"]', E2E_POLICYHOLDER_DASH.email);
    await page.fill('#signin-password', E2E_POLICYHOLDER_DASH.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|home|wallet|onboarding)|\/$/, { timeout: 30000 });
    console.log('✅ Free policyholder signed in. URL:', page.url());

    await page.context().storageState({ path: authFile });
});
