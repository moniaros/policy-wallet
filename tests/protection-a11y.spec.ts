/**
 * «Καλύψεις & κενά» — axe on the story page (goal series, Goal 15), phone and
 * desktop, both lenses. Runs in the policyholder `chromium` project. Fails on
 * critical and serious violations; lists the rest so the backlog can see them.
 */
import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { dismissCookieBanner } from "./helpers/ui"

const CASES = [
    ["/protection", 390, 844],
    ["/protection", 1280, 900],
    ["/protection?lens=risk", 390, 844],
] as const

for (const [path, width, height] of CASES) {
    test(`${path} @ ${width}px has no serious accessibility violations`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize({ width, height })
        await page.goto(path, { waitUntil: "domcontentloaded", timeout: 90_000 })
        await page.waitForSelector("h1", { timeout: 60_000 })
        await dismissCookieBanner(page)
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
        const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")
        const describe = (v: (typeof results.violations)[number]) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`
        if (results.violations.length > 0) console.log(`[a11y ${path} @ ${width}]\n  ` + results.violations.map(describe).join("\n  "))
        expect(serious.map(describe), "critical/serious axe violations").toEqual([])
    })
}
