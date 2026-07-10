
import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Agent Authentication Setup for Playwright Tests
 * 
 * This runs once before agent tests to authenticate as an agent
 * and save the authentication state for reuse.
 */

const authFile = path.join(__dirname, '../playwright/.auth/agent.json');
const TEST_AGENT = {
    email: 'test-agent@example.com',
    password: 'password123'
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

setup('authenticate as agent', async ({ page }) => {
    // Increase timeout to 2 minutes
    setup.setTimeout(120000);
    console.log('🔐 Authenticating test agent...');

    try {
        // Navigate to sign-in page
        await page.goto('/auth/signin');
        await page.waitForLoadState('networkidle');

        // The consent banner overlays the submit button — clear it first
        await dismissCookieBanner(page);

        // Fill in credentials (signin form has no #email id — target by type)
        await page.fill('input[type="email"]', TEST_AGENT.email);
        await page.fill('#signin-password', TEST_AGENT.password);

        // Click sign in button
        // Looking for submit button
        await page.click('button[type="submit"]');

        // Wait for redirect to agent dashboard or similar
        // If successful, we should move away from /auth/signin
        await page.waitForURL(url => !url.href.includes('/auth/signin'), { timeout: 10000 });
        console.log('✅ Successfully authenticated as agent via Login. Current URL:', page.url());

    } catch (e) {
        console.log('⚠️ Login failed or timed out. Attempting registration with new agent...');
        console.log('Error during login:', e);

        // Navigate to the agent signup form directly (role comes from the route)
        await page.goto('/auth/signup/agent');
        await page.waitForLoadState('networkidle');
        await dismissCookieBanner(page);

        // Generate dynamic user
        const timestamp = Date.now();
        const dynamicAgent = {
            ...TEST_AGENT,
            email: `agent_${timestamp}@example.com`,
            name: 'Test Agent',
        };

        console.log(`📝 Registering as Agent: ${dynamicAgent.email}...`);

        // Fill registration form (current SignupForm ids; license/agency fields
        // no longer exist at signup — they live in agent settings)
        await page.fill('#signup-name', dynamicAgent.name);
        await page.fill('#signup-mobile', `+30 69${timestamp % 100000000}`);
        await page.fill('#signup-email', dynamicAgent.email);
        await page.fill('#signup-password', dynamicAgent.password);

        // Accept terms (click checkbox)
        console.log('Accepting terms...');
        await page.check('#signup-terms', { force: true });

        // Check if actually checked
        const isChecked = await page.isChecked('#signup-terms');
        console.log(`Terms checked: ${isChecked}`);

        // Submit
        console.log('🚀 Clicking create account...');
        await page.click('button[type="submit"]');

        // Check for immediate error messages
        await page.waitForTimeout(2000);
        const errorLocator = page.locator('.text-red-400, .bg-red-500');
        if (await errorLocator.isVisible()) {
            const errorMsg = await errorLocator.innerText();
            console.error('❌ Page shows error:', errorMsg);
        }

        // Wait for redirect away from signup
        try {
            await page.waitForURL(url => !url.href.includes('/auth/signup') && !url.href.includes('/auth/signin'), { timeout: 30000 });
            console.log('✅ Successfully registered/logged in. Current URL:', page.url());
        } catch (error) {
            console.error('❌ Agent authentication failed:', error);
            await page.screenshot({ path: 'playwright/agent-setup-error.png', fullPage: true });
            throw error;
        }
    }

    // Save signed-in state to file
    await page.context().storageState({ path: authFile });
    console.log('✅ Agent authentication state saved to:', authFile);
});
