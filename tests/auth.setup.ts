import { test as setup } from '@playwright/test';
import path from 'path';
import { E2E_POLICYHOLDER } from './e2e-users';
import { dismissCookieBanner } from './helpers/ui';

/**
 * Policyholder authentication for Playwright.
 *
 * The account is provisioned by tests/global-setup.ts (Supabase auth +
 * Prisma user, email pre-confirmed), so this only performs a UI login and
 * saves the storage state. No signup fallback — UI registration proved too
 * fragile to build test auth on.
 */

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate as policyholder', async ({ page }) => {
    setup.setTimeout(90000);
    console.log(`🔐 Signing in as ${E2E_POLICYHOLDER.email}...`);

    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // The consent banner overlays the submit button — clear it first
    await dismissCookieBanner(page);

    // Current signin form: no #email id; password input is #signin-password
    await page.fill('input[type="email"]', E2E_POLICYHOLDER.email);
    await page.fill('#signin-password', E2E_POLICYHOLDER.password);
    await page.click('button[type="submit"]');

    // Policyholders land on /dashboard (role from Supabase user_metadata)
    await page.waitForURL(/\/(dashboard|home|wallet)/, { timeout: 30000 });
    console.log('✅ Policyholder signed in. URL:', page.url());

    await page.context().storageState({ path: authFile });
});
