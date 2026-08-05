import { test, expect, type Page } from '@playwright/test';
import { dismissCookieBanner } from '../helpers/ui';

/**
 * The risk-intelligence surfaces, measured rather than asserted at source.
 *
 * Every responsive and accessibility claim about these pages has until now been
 * a source-level guard — a regex over the JSX checking that `min-h-11` appears.
 * That catches a class being deleted; it cannot catch a row that overflows
 * because Greek runs ~30% longer than English, or a tap target that computes to
 * 38px because a parent constrained it. These measure the rendered page.
 *
 * 320px is the floor deliberately: it is the narrowest viewport still in real
 * use, and the width at which Greek copy in a two-column grid stops fitting.
 */

const SURFACES = [
    { path: '/insights/risk-profile', name: 'risk profile' },
    { path: '/timeline', name: 'timeline' },
    { path: '/coverage-insights', name: 'cover' },
];

/** Nothing may push the document wider than the viewport. */
async function expectNoHorizontalOverflow(page: Page, label: string) {
    const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return { scroll: doc.scrollWidth, client: doc.clientWidth };
    });
    // One pixel of slack for sub-pixel rounding in the layout engine.
    expect(overflow.scroll, `${label}: document scrolls horizontally`).toBeLessThanOrEqual(
        overflow.client + 1
    );
}

/**
 * WCAG 2.5.8 is 24px; this product's own standard is 44 (`min-h-11`).
 *
 * Measured on VISIBLE, enabled controls only — a collapsed disclosure legitimately
 * contains controls of zero height, and failing on those would make the check
 * unrunnable rather than strict.
 */
async function expectTouchTargets(page: Page, label: string) {
    const undersized = await page.evaluate(() => {
        const bad: string[] = [];
        for (const el of Array.from(document.querySelectorAll('button, a[href], [role="button"]'))) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            if ((el as HTMLButtonElement).disabled) continue;
            if (rect.height < 24) {
                bad.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(rect.height)}px`);
            }
        }
        return bad;
    });
    expect(undersized, `${label}: controls below the 24px floor`).toEqual([]);
}

test.describe('risk intelligence surfaces at 320px', () => {
    test.use({ viewport: { width: 320, height: 720 } });

    for (const surface of SURFACES) {
        test(`${surface.name} fits and is tappable`, async ({ page }) => {
            await page.goto(surface.path);
            await expect(page).not.toHaveURL(/auth\/signin/);
            await dismissCookieBanner(page);
            // Server components stream; wait for the shell rather than a timer.
            await page.waitForLoadState('networkidle');

            await expectNoHorizontalOverflow(page, surface.name);
            await expectTouchTargets(page, surface.name);
        });
    }
});

test.describe('risk intelligence surfaces at desktop width', () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    for (const surface of SURFACES) {
        test(`${surface.name} fits`, async ({ page }) => {
            await page.goto(surface.path);
            await dismissCookieBanner(page);
            await page.waitForLoadState('networkidle');
            await expectNoHorizontalOverflow(page, surface.name);
        });
    }
});

test.describe('the risk profile explains itself', () => {
    test('every heading level is reachable and ordered', async ({ page }) => {
        await page.goto('/insights/risk-profile');
        await dismissCookieBanner(page);
        await page.waitForLoadState('networkidle');

        // A page whose h2s appear without an h1, or which jumps h2 → h4, is
        // unnavigable by heading for a screen-reader user.
        const levels = await page.evaluate(() =>
            Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
                Number(h.tagName.slice(1))
            )
        );
        for (let i = 1; i < levels.length; i++) {
            expect(
                levels[i] - levels[i - 1],
                `heading jumps from h${levels[i - 1]} to h${levels[i]}`
            ).toBeLessThanOrEqual(1);
        }
    });

    test('no control is left without an accessible name', async ({ page }) => {
        await page.goto('/insights/risk-profile');
        await dismissCookieBanner(page);
        await page.waitForLoadState('networkidle');

        const unnamed = await page.evaluate(() => {
            const bad: string[] = [];
            for (const el of Array.from(document.querySelectorAll('button, a[href]'))) {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) continue;
                const name =
                    (el.textContent ?? '').trim() ||
                    el.getAttribute('aria-label') ||
                    el.getAttribute('title');
                if (!name) bad.push(el.outerHTML.slice(0, 80));
            }
            return bad;
        });
        expect(unnamed, 'controls with no accessible name').toEqual([]);
    });
});
