import { test, expect } from '@playwright/test'

/**
 * Responsive guards for the B2B (agent) operational screens.
 *
 * The B2C surface had `viewport-overflow.spec.ts`; the agent screens — which are
 * denser, and where the sortable tables and stacked-card fallback live — had no
 * equivalent. These assert the two properties that actually break on a phone:
 * the page does not scroll sideways, and the sortable tables collapse to the
 * stacked-card layout (thead sr-only) rather than forcing a horizontal scroll.
 *
 * Runs under the `agent-chromium` project, which supplies the agent session.
 */

const WIDTHS = [375, 390, 768, 1024, 1440]
const PAGES = ['/customers', '/renewals', '/opportunities', '/commissions', '/team', '/questionnaires', '/insights']

for (const width of WIDTHS) {
    for (const path of PAGES) {
        test(`${path} @ ${width}px has no horizontal overflow`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 })
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

test('sortable tables collapse to stacked cards on a phone', async ({ page }) => {
    // Below lg, .pw-stacked-table hides thead and turns rows into cards. If a
    // table instead kept its columns, the row would be wider than 375px and the
    // page would scroll sideways — the thing the overflow test above catches, but
    // this pins the mechanism so a regression is legible.
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto('/renewals')
    await page.waitForLoadState('networkidle')

    const stacked = await page.evaluate(() => {
        const table = document.querySelector('.pw-stacked-table')
        if (!table) return { present: false, headVisible: false }
        const thead = table.querySelector('thead')
        const visible = thead ? getComputedStyle(thead).position !== 'absolute' &&
            (thead as HTMLElement).offsetHeight > 1 : true
        return { present: true, headVisible: visible }
    })

    // The table may legitimately be absent (empty state); only assert when present.
    if (stacked.present) {
        expect(stacked.headVisible, 'thead is still visible below lg — table did not collapse').toBe(false)
    }
})

test('a sort control is reachable on a phone where thead is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto('/renewals')
    await page.waitForLoadState('networkidle')

    // If there is a table at all, there must be a visible mobile sort control,
    // because the column headers cannot be used at this width.
    const hasTable = await page.locator('.pw-stacked-table').count()
    if (hasTable > 0) {
        // MobileSortControl renders a <select>; at this width at least one must
        // be visible, since the column headers are sr-only.
        const visibleSelects = await page.locator('select:visible').count()
        expect(visibleSelects, 'no visible sort select on a phone').toBeGreaterThan(0)
    }
})
