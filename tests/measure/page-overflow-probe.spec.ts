import { test, expect } from "@playwright/test"
import { pageOverflow } from "./metrics"
import { settle } from "./metrics"

/**
 * THE PROBE FOR THE PROBE.
 *
 * `pageOverflow` was added because the harness had never asked whether the page
 * scrolls sideways — across ~190 captures at 320/390/430, the one question
 * §6.12 exists to ask went unasked. A new metric that reports 0 everywhere is
 * indistinguishable from a broken one, so this proves it can go red, and proves
 * the distinction it is built around: a strip that scrolls is not a page that
 * scrolls.
 *
 * Run: npx playwright test tests/measure/page-overflow-probe.spec.ts \
 *        --project=measure --no-deps
 * (needs PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH pointing at system Chrome)
 */
test.describe("pageOverflow detects what it claims to", () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 800 })
        await page.goto("/account/history")
        await settle(page)
    })

    test("reports no overflow on a page that does not overflow", async ({ page }) => {
        const before = await pageOverflow(page)
        expect(before.overflowPx, `offenders: ${before.offenders.join(" | ")}`).toBe(0)
        expect(before.viewportWidth).toBe(320)
        // Not vacuous: it really measured a document.
        expect(before.documentScrollWidth).toBeGreaterThan(0)
    })

    test("goes red on an element that pushes the page sideways, and names it", async ({ page }) => {
        await page.evaluate(() => {
            const d = document.createElement("div")
            d.id = "pw-overflow-probe"
            d.textContent = "ΑΝΤΑΣΦΑΛΙΣΤΙΚΗΠΡΟΣΤΑΣΙΑΑΣΤΙΚΗΣΕΥΘΥΝΗΣ"
            d.style.cssText = "width:2000px;height:20px;background:red"
            document.body.appendChild(d)
        })
        const after = await pageOverflow(page)
        expect(after.overflowPx).toBeGreaterThan(1000)
        expect(after.offenders.join(" ")).toContain("#pw-overflow-probe")
    })

    test("does NOT flag a strip that is meant to scroll", async ({ page }) => {
        // The whole point of the distinction. A horizontal scroller clips its
        // own overflow, so its children never extend the document's
        // scrollWidth — the strip scrolls, the page does not. If this ever goes
        // red, `.pw-scroll-strip` has stopped containing its children and the
        // narrow-viewport safety net is back to pushing the page sideways.
        await page.evaluate(() => {
            const strip = document.createElement("div")
            strip.id = "pw-strip-probe"
            strip.style.cssText = "overflow-x:auto;max-width:100%"
            const inner = document.createElement("div")
            inner.style.cssText = "width:2000px;height:20px"
            strip.appendChild(inner)
            document.body.appendChild(strip)
        })
        const after = await pageOverflow(page)
        expect(after.overflowPx, `offenders: ${after.offenders.join(" | ")}`).toBe(0)
        expect(after.offenders.join(" ")).not.toContain("pw-strip-probe")
    })
})
