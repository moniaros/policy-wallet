import { test, expect } from "@playwright/test"
import { duplicateFacts, settle } from "./metrics"

/**
 * THE PROBE FOR THE DUPLICATE-FACT SCAN.
 *
 * `data-fact` exists so a duplicated fact is measurable rather than argued
 * about. `data-fact-subject` scopes a key to one row — a 29-policy wallet
 * renders `policy.daysRemaining` 29 times legitimately, because those are 29
 * different policies.
 *
 * The scan grouped by key alone and reported `{policy.daysRemaining, count:29}`
 * on every wallet capture. A metric that cries wolf on a correct page is worse
 * than no metric: it trains the reader to skip the line where a real duplicate
 * would appear. `countConsistency` in ./dashboard.ts had already learned about
 * subjects; this scanner had not, and nothing noticed because nothing probed
 * the two against each other.
 *
 * These cases prove the fix did not also blunt it.
 *
 * Run: npx playwright test tests/measure/duplicate-facts-probe.spec.ts \
 *        --project=measure --no-deps
 */
test.describe("the duplicate-fact scan distinguishes rows from repeats", () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 800 })
        await page.goto("/wallet")
        await settle(page)
    })

    test("a real wallet reports no duplicates — 29 rows are 29 subjects", async ({ page }) => {
        const d = await duplicateFacts(page, [])
        expect(
            d.dataFactDuplicates,
            `subject-scoped rows must not read as duplicates: ${JSON.stringify(d.dataFactDuplicates)}`
        ).toEqual([])
        // Non-vacuous: the page really does carry subject-scoped facts.
        const scoped = await page.locator("[data-fact][data-fact-subject]").count()
        expect(scoped, "no subject-scoped facts on /wallet — wrong page or lost instrumentation").toBeGreaterThan(1)
    })

    test("the SAME key on the SAME subject twice is still a duplicate", async ({ page }) => {
        await page.evaluate(() => {
            for (let i = 0; i < 2; i++) {
                const s = document.createElement("span")
                s.setAttribute("data-fact", "probe.thing")
                s.setAttribute("data-fact-subject", "same-id")
                s.textContent = "42"
                document.body.appendChild(s)
            }
        })
        const d = await duplicateFacts(page, [])
        expect(d.dataFactDuplicates).toContainEqual({ key: "probe.thing", subject: "same-id", count: 2 })
    })

    test("an unscoped key repeated is still a duplicate", async ({ page }) => {
        await page.evaluate(() => {
            for (let i = 0; i < 2; i++) {
                const s = document.createElement("span")
                s.setAttribute("data-fact", "probe.unscoped")
                s.textContent = "42"
                document.body.appendChild(s)
            }
        })
        const d = await duplicateFacts(page, [])
        expect(d.dataFactDuplicates).toContainEqual({ key: "probe.unscoped", count: 2 })
    })

    test("the same key on DIFFERENT subjects is not a duplicate", async ({ page }) => {
        await page.evaluate(() => {
            for (const id of ["a", "b", "c"]) {
                const s = document.createElement("span")
                s.setAttribute("data-fact", "probe.perRow")
                s.setAttribute("data-fact-subject", id)
                s.textContent = "42"
                document.body.appendChild(s)
            }
        })
        const d = await duplicateFacts(page, [])
        expect(d.dataFactDuplicates.filter((x) => x.key === "probe.perRow")).toEqual([])
    })
})
