import { test as setup } from '@playwright/test';
import path from 'path';
import { E2E_AGENT } from './e2e-users';
import { dismissCookieBanner } from './helpers/ui';

/**
 * Agent authentication for Playwright.
 *
 * The account is provisioned by tests/global-setup.ts (Supabase auth +
 * Prisma user with agent role and verified AgentProfile), so this only
 * performs a UI login and saves the storage state.
 */

const authFile = path.join(__dirname, '../playwright/.auth/agent.json');

setup('authenticate as agent', async ({ page }) => {
    setup.setTimeout(90000);
    console.log(`🔐 Signing in as ${E2E_AGENT.email}...`);

    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // The consent banner overlays the submit button — clear it first
    await dismissCookieBanner(page);

    // Current signin form: no #email id; password input is #signin-password
    await page.fill('input[type="email"]', E2E_AGENT.email);
    await page.fill('#signin-password', E2E_AGENT.password);
    await page.click('button[type="submit"]');

    // Agents land on /dashboard/agent (role from Supabase user_metadata)
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    console.log('✅ Agent signed in. URL:', page.url());

    await page.context().storageState({ path: authFile });
});
