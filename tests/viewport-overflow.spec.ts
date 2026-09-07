import { test, expect } from '@playwright/test'

/**
 * Responsive guards for the authenticated surface.
 *
 * These exist because the wallet used to render a completely different component
 * tree below the breakpoint; now that it is one responsive tree, "does it fit"
 * is a property worth asserting rather than eyeballing.
 */

const WIDTHS = [375, 390, 768, 1024, 1440]
const PAGES = ['/wallet', '/dashboard', '/account', '/protection', '/protection?lens=risk']

for (const width of WIDTHS) {
    for (const path of PAGES) {
        test(`${path} @ ${width}px has no horizontal overflow`, async ({ page }) => {
            await page.setViewportSize({ width, height: 800 })
            await page.goto(path)
            await page.waitForLoadState('domcontentloaded')
            const overflow = await page.evaluate(() => ({
                scrollW: document.documentElement.scrollWidth,
                clientW: document.documentElement.clientWidth,
                offenders: Array.from(document.querySelectorAll('*'))
                    .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
                    .slice(0, 5)
                    .map(el => `${el.tagName}.${(el.className || '').toString().split(' ').slice(0, 3).join('.')}`),
            }))
            expect(
                overflow.scrollW,
                `horizontal overflow; first offenders: ${overflow.offenders.join(' | ')}`
            ).toBeLessThanOrEqual(overflow.clientW + 1)
        })
    }
}

test('fixed bottom elements do not stack on top of each other at 375px', async ({ page }) => {
    // The wallet's add-policy button sat at bottom-8 while the mobile bottom nav
    // is 77px tall — both z-40, overlapping by ~45px, so half the button was
    // buried behind the nav.
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')

    const boxes = await page.evaluate(() =>
        Array.from(document.querySelectorAll('*'))
            .filter(el => getComputedStyle(el).position === 'fixed')
            .map(el => {
                const r = el.getBoundingClientRect()
                return { cls: (el.className || '').toString().slice(0, 60), top: r.top, bottom: r.bottom, height: r.height }
            })
            // Only real, bottom-anchored chrome; skip full-bleed backdrops.
            .filter(b => b.height > 0 && b.height < 300 && b.bottom > 500)
    )

    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j]
            const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
            expect(overlap, `"${a.cls}" overlaps "${b.cls}" by ${Math.round(overlap)}px`).toBeLessThanOrEqual(0)
        }
    }
})
