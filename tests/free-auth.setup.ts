import { test as setup } from '@playwright/test';
import path from 'path';
import { E2E_POLICYHOLDER_FREE } from './e2e-users';
import { dismissCookieBanner } from './helpers/ui';

/**
 * FREE-tier policyholder authentication.
 *
 * Same shape as auth.setup.ts (UI login only; the account is provisioned by
 * tests/global-setup.ts). It exists because tier is a property of the SESSION's
 * user, not something a test can pass in: the free-only surfaces — the locked
 * gap report and its €3 unlock, the PDF-preview lock, the premium-insight
 * cards, the sidebar upgrade banner — only render for an account with no live
 * subscription, and the main policyholder fixture holds an active ph-pro one.
 */

const authFile = path.join(__dirname, '../playwright/.auth/free.json');

setup('authenticate as free policyholder', async ({ page }) => {
    setup.setTimeout(90000);
    console.log(`🔐 Signing in as ${E2E_POLICYHOLDER_FREE.email}...`);

    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);

    await page.fill('input[type="email"]', E2E_POLICYHOLDER_FREE.email);
    await page.fill('#signin-password', E2E_POLICYHOLDER_FREE.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|home|wallet|onboarding)/, { timeout: 30000 });
    console.log('✅ Free policyholder signed in. URL:', page.url());

    await page.context().storageState({ path: authFile });
});
