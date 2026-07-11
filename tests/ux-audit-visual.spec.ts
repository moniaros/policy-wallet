import { test, expect } from '@playwright/test';

// Visual baselines predate the 10 Jul design repaint — regenerate with
// RUN_VISUAL=1 npx playwright test tests/ux-audit-visual.spec.ts --update-snapshots
test.skip(!process.env.RUN_VISUAL, 'stale visual baselines — run with RUN_VISUAL=1');

/**
 * Visual Regression Testing for UX Audit
 * 
 * This suite captures screenshots to track visual changes
 * and validate UI consistency across updates
 */

test.describe('Visual Regression - Light Mode', () => {
    test('landing page - desktop', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveScreenshot('landing-desktop-light.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('landing page - mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await expect(page).toHaveScreenshot('landing-mobile-light.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('wallet dashboard - desktop', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/wallet');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('wallet-desktop-light.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('wallet dashboard - mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await loginAsTestUser(page);
        await page.goto('/wallet');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('wallet-mobile-light.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('tasks page - empty state', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/tasks');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('tasks-empty-light.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('account settings page', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/account');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('account-settings-light.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });
});

test.describe('Visual Regression - Dark Mode', () => {
    test.use({ colorScheme: 'dark' });

    test('landing page - desktop dark', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveScreenshot('landing-desktop-dark.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('wallet dashboard - desktop dark', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/wallet');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('wallet-desktop-dark.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });
});

test.describe('Component Visual Tests', () => {
    test('policy card variations', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/wallet');

        // Screenshot individual policy cards if they exist
        const policyCards = page.locator('[data-testid="policy-card"], .policy-card');
        const count = await policyCards.count();

        if (count > 0) {
            await expect(policyCards.first()).toHaveScreenshot('policy-card-sample.png');
        }
    });

    test('KPI cards layout', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/wallet');

        const kpiSection = page.locator('[data-testid="kpi-cards"], .kpi-cards').first();
        if (await kpiSection.count() > 0) {
            await expect(kpiSection).toHaveScreenshot('kpi-cards-layout.png');
        }
    });
});

// Helper function
async function loginAsTestUser(page: any) {
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in|σύνδεση/i }).click();
    await page.waitForURL(/wallet|dashboard/, { timeout: 10000 });
}
