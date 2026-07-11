import { test, expect } from '@playwright/test';
import { LOGGED_OUT, dismissCookieBanner } from '../helpers/ui';

// These specs assert LOGGED-OUT behavior — drop the project's authed state.
test.use({ storageState: LOGGED_OUT });

test.describe('Authentication Flow', () => {
    test('protected routes redirect anonymous users to signin', async ({ page }) => {
        await page.goto('/wallet');
        await expect(page).toHaveURL(/.*auth\/signin/);
    });

    test('landing page is public (no signin redirect)', async ({ page }) => {
        await page.goto('/');
        await expect(page).not.toHaveURL(/.*auth\/signin/);
    });

    test('signin form renders email, password and submit', async ({ page }) => {
        await page.goto('/auth/signin');

        // Current form: email input has no id; password is #signin-password
        await expect(page.locator('input[type="email"]').first()).toBeVisible();
        await expect(page.locator('#signin-password')).toBeVisible();
        await expect(page.locator('button[type="submit"]').first()).toBeVisible();
    });

    test('invalid credentials show an error and stay on signin', async ({ page }) => {
        await page.goto('/auth/signin');
        await dismissCookieBanner(page);

        await page.fill('input[type="email"]', 'nobody@example.com');
        await page.fill('#signin-password', 'definitely-wrong');
        await page.click('button[type="submit"]');

        // Stays on signin; an error message appears (EL or EN)
        await expect(page).toHaveURL(/.*auth\/signin/);
        await expect(
            page.getByText(/invalid|λάθος|αποτυχία|credentials|σφάλμα/i).first()
        ).toBeVisible({ timeout: 10000 });
    });

    test('signin links to signup', async ({ page }) => {
        await page.goto('/auth/signin');
        await dismissCookieBanner(page);

        const signupLink = page.getByRole('link', { name: /sign ?up|εγγραφή/i }).first();
        await expect(signupLink).toBeVisible();
        await signupLink.click();
        await expect(page).toHaveURL(/.*auth\/signup/);
    });
});

test.describe('Signup Flow', () => {
    test('policyholder signup form: mobile + optional email + password + terms, no name field', async ({ page }) => {
        await page.goto('/auth/signup/policyholder');

        await expect(page.locator('#signup-mobile')).toBeVisible();
        await expect(page.locator('#signup-email')).toBeVisible();
        await expect(page.locator('#signup-password')).toBeVisible();
        await expect(page.locator('#signup-terms')).toBeVisible();
        // The full-name field is agent-only
        await expect(page.locator('#signup-name')).toHaveCount(0);
    });

    test('agent signup form additionally has the full-name field', async ({ page }) => {
        await page.goto('/auth/signup/agent');

        await expect(page.locator('#signup-name')).toBeVisible();
        await expect(page.locator('#signup-mobile')).toBeVisible();
        await expect(page.locator('#signup-email')).toBeVisible();
        await expect(page.locator('#signup-password')).toBeVisible();
    });

    test('/auth/signup redirects to the policyholder variant', async ({ page }) => {
        await page.goto('/auth/signup');
        await expect(page).toHaveURL(/auth\/signup\/policyholder/);
    });

    test('signup links back to signin', async ({ page }) => {
        await page.goto('/auth/signup/policyholder');
        const signinLink = page.getByRole('link', { name: /sign ?in|σύνδεση/i }).first();
        await expect(signinLink).toBeVisible();
    });
});

test.describe('Password Reset Flow', () => {
    test('signin offers a password-recovery entry point', async ({ page }) => {
        await page.goto('/auth/signin');
        await dismissCookieBanner(page);

        // Link text: «Ξέχασα τον κωδικό μου» / "Forgot my password"
        const forgotTrigger = page.getByText(/forgot|ξέχασα/i).first();
        await expect(forgotTrigger).toBeVisible();
    });
});
