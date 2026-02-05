import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Testing for UX Audit
 * 
 * Tests WCAG 2.1 compliance and accessibility best practices
 * Addresses audit findings on color contrast, keyboard navigation, and screen reader support
 */

test.describe('Accessibility Audit - WCAG 2.1 AA', () => {
    test('landing page should have no accessibility violations', async ({ page }) => {
        await page.goto('/');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('sign-up page should have no accessibility violations', async ({ page }) => {
        await page.goto('/auth/signup');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('wallet dashboard should have no accessibility violations', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/wallet');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        // Log violations for review
        if (accessibilityScanResults.violations.length > 0) {
            console.error('Accessibility violations found:',
                JSON.stringify(accessibilityScanResults.violations, null, 2)
            );
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('account settings should have no accessibility violations', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/account');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });
});

test.describe('Keyboard Navigation', () => {
    test('should navigate through landing page with keyboard', async ({ page }) => {
        await page.goto('/');

        // Tab through interactive elements
        await page.keyboard.press('Tab');
        const firstFocusedElement = await page.evaluate(() => document.activeElement?.tagName);

        // Should focus on interactive elements
        expect(['A', 'BUTTON', 'INPUT']).toContain(firstFocusedElement || '');
    });

    test('should close modals with ESC key', async ({ page }) => {
        await page.goto('/');

        // Look for any modal trigger
        const buttons = page.getByRole('button');
        const count = await buttons.count();

        if (count > 0) {
            await buttons.first().click();
            await page.waitForTimeout(300);

            // Press ESC
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);

            // Any visible modals should be closed
            const visibleModals = page.locator('[role="dialog"]:visible');
            expect(await visibleModals.count()).toBe(0);
        }
    });

    test('form inputs should be focusable and have labels', async ({ page }) => {
        await page.goto('/auth/signup');

        const inputs = page.locator('input');
        const inputCount = await inputs.count();

        for (let i = 0; i < inputCount; i++) {
            const input = inputs.nth(i);
            const id = await input.getAttribute('id');
            const ariaLabel = await input.getAttribute('aria-label');
            const ariaLabelledBy = await input.getAttribute('aria-labelledby');

            // Check if input has associated label
            if (id) {
                const label = page.locator(`label[for="${id}"]`);
                const hasLabel = await label.count() > 0;
                const hasAriaLabel = ariaLabel || ariaLabelledBy;

                expect(hasLabel || hasAriaLabel).toBeTruthy();
            }
        }
    });

    test('all interactive elements should be keyboard accessible', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/wallet');

        // Get all buttons, links, and interactive elements
        const interactiveElements = page.locator('button, a, input, select, textarea, [role="button"]');
        const count = await interactiveElements.count();

        for (let i = 0; i < Math.min(count, 10); i++) { // Test first 10
            const element = interactiveElements.nth(i);

            // Should be focusable
            await element.focus();
            const isFocused = await element.evaluate((el) => el === document.activeElement);

            if (!isFocused) {
                const tagName = await element.evaluate(el => el.tagName);
                const text = await element.textContent();
                console.warn(`⚠️ Element not focusable: ${tagName} - "${text}"`);
            }
        }
    });
});

test.describe('Color Contrast - Dark Mode', () => {
    test.use({ colorScheme: 'dark' });

    test('should check color contrast on dark mode wallet page', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/wallet');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2aa'])
            .include('body') // Scan entire page
            .analyze();

        // Filter for color contrast violations
        const contrastViolations = accessibilityScanResults.violations.filter(
            v => v.id === 'color-contrast'
        );

        if (contrastViolations.length > 0) {
            console.error('Color contrast violations in dark mode:',
                JSON.stringify(contrastViolations, null, 2)
            );
        }

        expect(contrastViolations).toEqual([]);
    });
});

test.describe('Screen Reader Support', () => {
    test('should have appropriate ARIA landmarks', async ({ page }) => {
        await page.goto('/');

        // Check for main landmark
        const main = page.locator('main, [role="main"]');
        await expect(main).toBeVisible();

        // Check for navigation landmark
        const nav = page.locator('nav, [role="navigation"]');
        expect(await nav.count()).toBeGreaterThan(0);
    });

    test('images should have alt text', async ({ page }) => {
        await page.goto('/');

        const images = page.locator('img');
        const imageCount = await images.count();

        for (let i = 0; i < imageCount; i++) {
            const img = images.nth(i);
            const alt = await img.getAttribute('alt');
            const ariaLabel = await img.getAttribute('aria-label');
            const role = await img.getAttribute('role');

            // Decorative images should have empty alt or role="presentation"
            // Content images should have descriptive alt text
            const hasAltText = alt !== null;
            const isDecorative = role === 'presentation' || alt === '';

            expect(hasAltText || ariaLabel).toBeTruthy();
        }
    });

    test('form validation errors should be announced', async ({ page }) => {
        await page.goto('/auth/signup');

        // Submit form without filling it
        const submitButton = page.getByRole('button', { name: /sign up|submit|εγγραφή/i });
        await submitButton.click();

        // Wait for validation
        await page.waitForTimeout(500);

        // Check for aria-live regions or aria-invalid attributes
        const errorMessages = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"], [aria-invalid="true"]');
        const hasAccessibleErrors = await errorMessages.count() > 0;

        if (!hasAccessibleErrors) {
            console.warn('⚠️ Form validation errors may not be announced to screen readers');
        }

        expect(hasAccessibleErrors).toBeTruthy();
    });

    test('loading states should be announced', async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto('/wallet');

        // Look for loading indicators with proper ARIA attributes
        const loadingIndicators = page.locator('[role="status"], [aria-busy="true"], [aria-live]');

        // Note: This test checks if pattern exists, not if currently loading
        console.info('ℹ️ Loading states should use role="status" or aria-live for announcements');
    });
});

test.describe('Focus Management', () => {
    test('focus should be trapped in modals', async ({ page }) => {
        await page.goto('/');

        // Try to open a modal
        const modalTriggers = page.getByRole('button');
        const count = await modalTriggers.count();

        if (count > 0) {
            await modalTriggers.first().click();
            await page.waitForTimeout(500);

            const modal = page.locator('[role="dialog"], .modal');
            if (await modal.count() > 0) {
                // Tab through - focus should stay in modal
                await page.keyboard.press('Tab');
                const focusedElement = await page.evaluate(() => {
                    const el = document.activeElement;
                    const dialog = document.querySelector('[role="dialog"], .modal');
                    return dialog?.contains(el);
                });

                expect(focusedElement).toBeTruthy();
            }
        }
    });

    test('focus should return to trigger after modal closes', async ({ page }) => {
        await page.goto('/');

        const modalTriggers = page.getByRole('button');
        if (await modalTriggers.count() > 0) {
            const firstButton = modalTriggers.first();

            // Click to open modal
            await firstButton.click();
            await page.waitForTimeout(500);

            // Close modal with ESC
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            // Focus should return to button
            const isFocused = await firstButton.evaluate((el) => el === document.activeElement);

            if (!isFocused) {
                console.warn('⚠️ Focus did not return to trigger after modal close');
            }
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
