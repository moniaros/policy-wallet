/**
 * 0.5e — does the layout actually reserve room for the fixed bottom bar?
 *
 * The Goal 0 baseline attributed part of the B1/B4 observation to the bar
 * painting over content in full-page screenshots. That explains the SCREENSHOT.
 * It does not explain the PAGE: if the reservation is smaller than the bar's
 * rendered height, content is occluded in a real viewport on a real phone, and
 * that is a defect rather than a capture artifact.
 *
 * The bar is `min-h-[76px]` plus `env(safe-area-inset-bottom)`; `main` reserves
 * a static `pb-24` (96px). Headless Chrome resolves the inset to 0, so this
 * measures the no-inset case directly and reports the arithmetic for a notched
 * device, where the inset is 34px on every iPhone since the X.
 */
import { test, expect } from "@playwright/test"

test("the bottom bar's height is reserved by the layout", async ({ page }) => {
    test.setTimeout(3 * 60_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/wallet", { waitUntil: "domcontentloaded", timeout: 90_000 })
    await page.waitForTimeout(2500)

    const m = await page.evaluate(() => {
        const main = document.querySelector("#main-content") as HTMLElement | null
        const nav = document.querySelector(".pw-above-consent") as HTMLElement | null
        return {
            reserved: main ? parseFloat(getComputedStyle(main).paddingBottom) : null,
            barHeight: nav ? Math.round(nav.getBoundingClientRect().height) : null,
            barPaddingBottom: nav ? getComputedStyle(nav).paddingBottom : null,
        }
    })
    console.log("[0.5e] " + JSON.stringify(m))
    expect(m.barHeight, "no bottom bar found at 390px").not.toBeNull()
    expect(m.reserved, "main reserves no bottom padding").not.toBeNull()

    // No-inset case must clear the bar.
    expect(m.reserved!, `reserved ${m.reserved}px < bar ${m.barHeight}px`).toBeGreaterThanOrEqual(m.barHeight!)

    // Notched case. `env()` resolves to 0 in headless Chrome, so simulating it
    // by adding the inset to the BAR while leaving the reservation alone would
    // now be measuring the harness's arithmetic rather than the layout. The
    // real question is whether the reservation is DEFINED in terms of the
    // inset — a fixed value that happens to clear the bar at inset 0 is exactly
    // the defect. Read the rule, not the resolved number.
    const tracksInset = await page.evaluate(() => {
        const main = document.querySelector("#main-content") as HTMLElement | null
        if (!main) return null
        // Recurse into grouping rules: Tailwind emits utilities inside
        // `@layer`, so a flat walk over sheet.cssRules finds nothing and the
        // check would report "no env-based rule" for a page that has one.
        const visit = (rules: CSSRuleList): string | null => {
            for (const rule of Array.from(rules)) {
                const grouping = rule as CSSGroupingRule
                if (grouping.cssRules) {
                    const found = visit(grouping.cssRules)
                    if (found) return found
                }
                const r = rule as CSSStyleRule
                if (!r.selectorText || !r.style) continue
                let matches = false
                try {
                    matches = main.matches(r.selectorText)
                } catch {
                    continue
                }
                if (!matches) continue
                const pb = r.style.getPropertyValue("padding-bottom")
                if (pb && pb.includes("safe-area-inset-bottom")) return pb
            }
            return null
        }
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                const found = visit(sheet.cssRules)
                if (found) return found
            } catch {
                continue // cross-origin sheet
            }
        }
        return null
    })

    console.log(`[0.5e] reservation rule: ${tracksInset ?? "(no env-based rule)"}`)
    expect(
        tracksInset,
        "the bottom reservation is a fixed value: it clears the bar only when the safe-area " +
        "inset is 0. On every notched iPhone the bar is taller by the inset and covers the " +
        "bottom of the page. The reservation must be defined with env(safe-area-inset-bottom)."
    ).not.toBeNull()
})
