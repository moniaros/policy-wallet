import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should navigate to signin page', async ({ page }) => {
        await page.goto('/');

        // Should redirect to signin if not authenticated
        await expect(page).toHaveURL(/.*auth\/signin/);
    });

    test('should show signin form', async ({ page }) => {
        await page.goto('/auth/signin');

        // Check for email and password fields
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
        await page.goto('/auth/signin');

        // Try to submit empty form
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should show validation errors (implementation dependent)
        // This is a placeholder - adjust based on your actual validation
    });

    test('should have link to signup page', async ({ page }) => {
        await page.goto('/auth/signin');

        // Check for signup link
        const signupLink = page.getByRole('link', { name: /sign up/i });
        await expect(signupLink).toBeVisible();

        // Click and verify navigation
        await signupLink.click();
        await expect(page).toHaveURL(/.*auth\/signup/);
    });
});

test.describe('Signup Flow', () => {
    test('should show signup form', async ({ page }) => {
        await page.goto('/auth/signup');

        // Check for required fields
        await expect(page.getByLabel(/name/i)).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
    });

    test('should have link back to signin', async ({ page }) => {
        await page.goto('/auth/signup');

        const signinLink = page.getByRole('link', { name: /sign in/i });
        await expect(signinLink).toBeVisible();
    });
});

test.describe('Password Reset Flow', () => {
    test('should navigate to forgot password page', async ({ page }) => {
        await page.goto('/auth/signin');

        const forgotLink = page.getByRole('link', { name: /forgot.*password/i });
        if (await forgotLink.isVisible()) {
            await forgotLink.click();
            await expect(page).toHaveURL(/.*auth\/forgot-password/);
        }
    });
});
