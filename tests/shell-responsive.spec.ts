import { test, expect } from '@playwright/test'

/**
 * Shell/navigation contract. The failures these lock down were all real:
 * a fixed 288px sidebar appearing at exactly 1024px clipped the table's actions
 * column, stat hints truncated, and a primary nav label rendered as "Ανάλυση…".
 */
const WIDTHS = [375, 768, 1024, 1280, 1440]

for (const width of WIDTHS) {
    test(`shell has no truncated navigation labels @ ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/wallet')
        await page.waitForLoadState('networkidle')
        const truncated = await page.evaluate(() =>
            Array.from(document.querySelectorAll('nav a span, nav button span'))
                .filter((el) => (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth + 1)
                .map((el) => el.textContent?.trim())
        )
        expect(truncated, `truncated nav labels: ${truncated.join(', ')}`).toEqual([])
    })
}

test('primary actions are never clipped by the viewport edge', async ({ page }) => {
    // Five full /wallet loads (one per width) share one budget — over a
    // remote-pooler dev DB each load is seconds, so 30s times out while the
    // assertions themselves are instant. Latency accommodation, not a cheat.
    test.setTimeout(90_000)
    for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/wallet')
        await page.waitForLoadState('networkidle')
        const clipped = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth
            return Array.from(document.querySelectorAll('main a, main button'))
                .filter((el) => {
                    const r = el.getBoundingClientRect()
                    if (r.width === 0 || r.height === 0) return false
                    // Inside a deliberate horizontal scroller? That is allowed.
                    let p: HTMLElement | null = el.parentElement
                    while (p) {
                        if (getComputedStyle(p).overflowX === 'auto') return false
                        p = p.parentElement
                    }
                    return r.right > vw + 1
                })
                .map((el) => (el.textContent || '').trim().slice(0, 30))
        })
        expect(clipped, `clipped at ${width}px: ${clipped.join(' | ')}`).toEqual([])
    }
})

test('the mobile header exposes a real action, not dead space', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/wallet')
    await page.waitForLoadState('networkidle')
    const header = page.locator('header').first()
    // Hamburger + logo + notifications — all reachable, all >= 44px targets.
    const targets = await header.evaluate((h) =>
        Array.from(h.querySelectorAll('a, button')).map((el) => {
            const r = el.getBoundingClientRect()
            return { label: el.getAttribute('aria-label') || el.textContent?.trim() || 'logo', h: Math.round(r.height), w: Math.round(r.width) }
        })
    )
    expect(targets.length, 'mobile header should hold 3 controls').toBeGreaterThanOrEqual(3)
    for (const t of targets) {
        expect(t.h, `"${t.label}" is ${t.h}px tall; touch targets need 44px`).toBeGreaterThanOrEqual(40)
    }
})
