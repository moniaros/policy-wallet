import type { Page } from '@playwright/test';

/** Fresh, unauthenticated context for specs that test logged-out pages. */
export const LOGGED_OUT = { cookies: [], origins: [] };

/**
 * The GDPR cookie banner mounts after hydration and overlays the bottom of
 * every page, intercepting clicks. Wait briefly for it and dismiss with the
 * privacy-preserving option. No-op when it never appears (already consented).
 *
 * NOTE: locator.isVisible() returns immediately (its timeout option is
 * deprecated and ignored) — waitFor() is required to catch the banner's
 * delayed mount.
 */
export async function dismissCookieBanner(page: Page) {
    const necessaryOnly = page
        .locator('button:has-text("Μόνο Απαραίτητα"), button:has-text("Necessary Only")')
        .first();
    try {
        await necessaryOnly.waitFor({ state: 'visible', timeout: 4000 });
        await necessaryOnly.click();
    } catch {
        // Banner absent (consent already stored) — nothing to do.
    }
}
