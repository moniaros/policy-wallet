import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Authentication Setup for Playwright Tests
 * 
 * This runs once before all tests to authenticate as a policyholder
 * and save the authentication state for reuse across all test files.
 */

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate as policyholder', async ({ page }) => {
    console.log('🔐 Authenticating test user...');

    // Navigate to sign-in page
    await page.goto('/auth/signin');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Fill in credentials (policyholder account)
    await page.fill('input[name="email"], input[type="email"]', 'moniaros@gmail.com');
    await page.fill('input[name="password"], input[type="password"]', 'Whymon2021!');

    // Click sign in button
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Σύνδεση")');

    // Wait for successful login - should redirect to wallet
    await page.waitForURL(/\/wallet|\/dashboard/, { timeout: 30000 });

    console.log('✅ Successfully authenticated');
    console.log('📍 Current URL:', page.url());

    // Verify we're actually logged in by checking for user-specific content
    // Wallet page should be visible
    await expect(page.locator('text=/wallet|πορτοφόλι|policies|ασφάλειες/i').first()).toBeVisible({ timeout: 10000 });

    console.log('💾 Saving authentication state...');

    // Save signed-in state to file
    await page.context().storageState({ path: authFile });

    console.log('✅ Authentication state saved to:', authFile);
});
