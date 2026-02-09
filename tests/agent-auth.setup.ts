
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

setup('authenticate as agent', async ({ page }) => {
    // Increase timeout to 2 minutes
    setup.setTimeout(120000);
    console.log('🔐 Authenticating test agent...');

    try {
        // Navigate to sign-in page
        await page.goto('/auth/signin');
        await page.waitForLoadState('networkidle');

        // Fill in credentials - using IDs as seen in source
        await page.fill('#email', TEST_AGENT.email);
        await page.fill('#password', TEST_AGENT.password);

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

        // Navigate to signup
        await page.goto('/auth/signup');
        await page.waitForLoadState('networkidle');

        // Select Agent Role - robust selector
        // It's a button with text "Agent"
        await page.getByRole('button', { name: 'Agent' }).click();

        // Short wait for state update
        await page.waitForTimeout(500);

        // Generate dynamic user
        const timestamp = Date.now();
        const dynamicAgent = {
            ...TEST_AGENT,
            email: `agent_${timestamp}@example.com`,
            name: 'Test Agent',
            licenseNumber: `LIC-${timestamp}`,
            agencyName: `Agency ${timestamp}`
        };

        console.log(`📝 Registering as Agent: ${dynamicAgent.email}...`);

        // Fill registration form using name attributes
        await page.fill('input[name="name"]', dynamicAgent.name);
        await page.fill('input[name="email"]', dynamicAgent.email);
        await page.fill('input[name="password"]', dynamicAgent.password);
        await page.fill('input[name="confirmPassword"]', dynamicAgent.password);

        // Agent specific fields
        console.log('Filling agent specific fields...');
        await page.waitForSelector('input[name="licenseNumber"]');
        await page.fill('input[name="licenseNumber"]', dynamicAgent.licenseNumber);
        await page.fill('input[name="agencyName"]', dynamicAgent.agencyName);

        // Accept terms (click checkbox)
        console.log('Accepting terms...');
        await page.check('#termsAccepted', { force: true });

        // Check if actually checked
        const isChecked = await page.isChecked('#termsAccepted');
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
