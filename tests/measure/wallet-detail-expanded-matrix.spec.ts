/**
 * T-016c — `/wallet/[id]` EXPANDED, full metric set, ALL SIX healthy-matrix
 * fixtures (`FIXTURE_SPECS`), so the expanded state can be published as a
 * genuine row-for-row companion to `wallet-detail-baseline.spec.ts`'s table
 * "0a" rather than a single spot-check.
 *
 * Supersedes the numbers this run's OWN `wallet-detail-expanded.spec.ts`
 * (motor-active only) published, for a reason found while writing this file,
 * not assumed: that spec clicks each of the six `PolicySection` headers in
 * document order WITHOUT resetting scroll afterward. Playwright's `click()`
 * auto-scrolls its target into view when the target is not already on
 * screen, and by the time the LAST header ("documents") is clicked on a page
 * that has grown to 10,000+px, the click has scrolled the viewport to near
 * the BOTTOM of the page. Every metric in `metrics.ts` that filters on
 * "visible" uses `getBoundingClientRect()` (viewport-relative) and treats
 * `r.bottom <= 0` (scrolled ABOVE the current viewport) as invisible — there
 * is no equivalent check for content below the viewport, so that half of the
 * asymmetry is harmless, but content the accordion-clicking scrolled PAST
 * silently drops out of every tap-target / contrast / duplicate-fact / 1.4.11
 * scan for that capture. Confirmed directly: a standalone probe against
 * `motor-active@320` found the SAME policy-number `<span>` inside the
 * "claims" `PolicySection` at `getBoundingClientRect().y = -205` at the
 * moment `captureSurface` ran — already scrolled past, and invisible to
 * `duplicateFacts`'s value scan, which is why the previously published
 * `motor-active-all-expanded` row measured 0 duplicate-fact hits instead of
 * the 2 that are actually on the page (confirmed via `document.body.innerText`
 * containing the policy number 4 times regardless of viewport width — the
 * DOM content does not change, only which of it the scroll position happened
 * to leave "on screen" for the scan).
 *
 * Fix: after every section is force-opened, explicitly `window.scrollTo(0,
 * 0)` and settle again before calling `captureSurface` — the same
 * scroll-position convention every OTHER capture in this evidence set uses
 * implicitly (`openSurface` never scrolls, so a freshly-loaded page is always
 * measured from the top). This file does not change any metric definition —
 * only the point in the sequence at which they run.
 *
 * Run:  npx playwright test --project=measure wallet-detail-expanded-matrix
 */
import { test, expect } from "@playwright/test"
import { FIXTURE_SPECS, provisionMatrixFixtures, fixtureDates, type FixtureSpec } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"
import type { FactSpec } from "./metrics"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("wallet-detail")
const SECTION_IDS = ["coverage", "terms", "review", "dates", "claims", "documents"]

test.describe.configure({ mode: "serial" })

let ids: Record<string, string> = {}

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    ids = await withDb((db) => provisionMatrixFixtures(db, EMAIL, FIXTURE_SPECS))
})

/** Same format as wallet-detail-baseline.spec.ts's fmt/factsFor — d/m/yyyy, no leading zero. */
function fmt(d: Date): string {
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
}

function factsFor(spec: FixtureSpec): FactSpec[] {
    const { start, end } = fixtureDates(spec.state)
    return [
        { key: "policy.policyNumber", value: spec.policyNumber },
        { key: "policy.endDate", value: fmt(end) },
        { key: "policy.startDate", value: fmt(start) },
    ]
}

for (const spec of FIXTURE_SPECS) {
    test(`expanded matrix: ${spec.key}`, async ({ page }) => {
        test.setTimeout(10 * 60_000)
        const policyId = ids[spec.key]
        expect(policyId, `fixture ${spec.key} provisioned`).toBeTruthy()
        for (const width of WIDTHS) {
            await openSurface(page, `/wallet/${policyId}`, width)
            for (const id of SECTION_IDS) {
                const header = page.locator(`#${id} button`).first()
                if (await header.count()) {
                    const expanded = await header.getAttribute("aria-expanded")
                    if (expanded !== "true") {
                        await header.click()
                        await page.waitForTimeout(150)
                    }
                }
            }
            // THE FIX: reset scroll to the top before measuring. Every metric
            // in metrics.ts that filters on "visible" is viewport-relative and
            // treats content scrolled ABOVE the viewport as gone — the last
            // accordion click otherwise leaves the scroll position wherever
            // Playwright's actionability-wait happened to land it (near the
            // bottom, on a page this tall), silently hiding earlier sections
            // from every tap-target / contrast / duplicate-fact scan below.
            await page.evaluate(() => window.scrollTo(0, 0))
            await page.waitForTimeout(400)
            await captureSurface(page, dirs, `${spec.key}-all-expanded`, width, factsFor(spec), {
                tier: "paid",
                fixtureState: spec.state,
                lineOfBusiness: spec.lineOfBusiness,
                note: "all 6 PolicySection accordions force-expanded; scroll reset to top before capture",
            })
        }
    })
}
