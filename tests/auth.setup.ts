
import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Authentication Setup for Playwright Tests
 * 
 * This runs once before all tests to authenticate as a policyholder
 * and save the authentication state for reuse across all test files.
 * It attempts to log in, and if that fails, it registers a new account.
 */

const authFile = path.join(__dirname, '../playwright/.auth/user.json');
const TEST_USER = {
    name: 'Test User',
    email: 'ph1@example.com',
    password: 'StrongerPass123!'
};

async function dismissCookieBanner(page: import('@playwright/test').Page) {
    const necessaryOnly = page.locator(
        'button:has-text("Μόνο Απαραίτητα"), button:has-text("Necessary Only")'
    );
    const visible = await necessaryOnly.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
        await necessaryOnly.first().click();
        console.log('🍪 Cookie banner dismissed (necessary only)');
    }
}

setup('authenticate as policyholder', async ({ page }) => {
    setup.setTimeout(180000); // Allow ample time for flows
    console.log('🔐 Authenticating test user...');

    // Navigate to sign-in page
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // The consent banner overlays the submit button — clear it first
    await dismissCookieBanner(page);

    // Fill in credentials (signin form has no #email id — target by type)
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('#signin-password', TEST_USER.password);

    // Click sign in button
    const signInButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Σύνδεση")');
    await signInButton.click();

    // Check if login is successful or if we need to sign up
    let dynamicUser = TEST_USER;
    try {
        // Wait for redirect to any non-signup page
        await page.waitForURL(url => !url.href.includes('/auth/signup') && !url.href.includes('/auth/signin'), { timeout: 5000 });
        console.log('✅ Successfully authenticated via Login');
    } catch (e) {
        console.log('⚠️ Login failed or timed out. Attempting registration with new user...');

        // Navigate to the policyholder signup form directly (role chooser skipped)
        await page.goto('/auth/signup/policyholder');
        await page.waitForLoadState('networkidle');
        await dismissCookieBanner(page);

        // Generate dynamic user
        dynamicUser = {
            ...TEST_USER,
            email: `ph_${Date.now()}@example.com`
        };

        console.log(`📝 Registering as ${dynamicUser.email}...`);

        // Fill registration form (current SignupForm ids; no confirm-password field)
        await page.fill('#signup-name', dynamicUser.name);
        await page.fill('#signup-mobile', `+30 69${Date.now() % 100000000}`);
        await page.fill('#signup-email', dynamicUser.email);
        await page.fill('#signup-password', dynamicUser.password);

        // Accept terms (click checkbox)
        await page.click('#signup-terms', { force: true });

        // Initial signup button
        console.log('🚀 Clicking submit...');
        await page.click('button[type="submit"]');

        // Wait for redirect
        try {
            await page.waitForURL(url => !url.href.includes('/auth/signup') && !url.href.includes('/auth/signin'), { timeout: 60000 });
            console.log('✅ Successfully left signup page. Current URL:', page.url());
        } catch (regError) {
            console.error('❌ Registration redirect timeout for user:', dynamicUser.email);
            throw regError;
        }
    }

    // Handle Onboarding Flow if we landed there
    if (page.url().includes('onboarding')) {
        console.log('🚀 Landed on Onboarding. Completing flow...');

        // Step 1: Welcome - "Get Started"
        await page.click('button:has-text("Get Started")');
        // Wait for animation/transition
        await page.waitForTimeout(1000);

        // Step 2: Preferences - "Skip"
        // Wait for button to be visible
        await page.waitForSelector('button:has-text("Skip")');
        await page.click('button:has-text("Skip")');
        await page.waitForTimeout(1000);

        // Step 3: Upload - "Skip for now"
        await page.waitForSelector('button:has-text("Skip for now")');
        await page.click('button:has-text("Skip for now")');
        await page.waitForTimeout(1000);

        // Step 4: Success - "Start Exploring"
        await page.waitForSelector('button:has-text("Start Exploring")');
        await page.click('button:has-text("Start Exploring")');

        // Wait for final redirect to dashboard/wallet
        await page.waitForURL(/\/wallet|\/dashboard/);
        console.log('✅ Onboarding completed');
    }

    console.log('📍 Current URL:', page.url());

    // Save signed-in state to file
    await page.context().storageState({ path: authFile });
    console.log('✅ Authentication state saved to:', authFile);
});
