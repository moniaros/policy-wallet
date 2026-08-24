/**
 * BASELINE — `/insights/risk-profile`, PAID tier, PW-MOBILE-TRANSFORM-02.
 *
 * Never measured before this pass: `proxy.ts` classified `/insights/*` as
 * agent-only via a `startsWith` prefix match, so a policyholder hitting this
 * page — its OWN wallet's risk profile — was bounced to `/dashboard` before
 * ever reaching it. `ROUTE_OWNERSHIP` now carries an explicit
 * `["/insights/risk-profile", "policyholder"]` row that wins over the
 * `["/insights", "agent"]` parent (most-specific-pattern-wins), fixing the
 * unreachability. `openSurface` below will refuse to record a capture if the
 * page still bounces, which is this run's live proof the fix holds — not an
 * assumption.
 *
 * Same account and same setup as `branches-baseline.spec.ts`
 * (`provisionMatrixFixtures` 15-policy matrix, motor+health only, then
 * `applyUnownedLinesProfileFixture` layered on top — declares pets, moderate
 * cyber exposure and two dependants, none of which the account holds a
 * matching policy for) so this capture is directly comparable to the
 * existing `/branches` §2.2 evidence: same profile, same wallet, different
 * surface.
 *
 * Run:  npx playwright test --project=measure risk-profile-baseline
 */
import { test, expect } from "@playwright/test"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures, applyUnownedLinesProfileFixture } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("risk-profile")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb(async (db) => {
        await provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS])
        await applyUnownedLinesProfileFixture(db, EMAIL)
    })
})

test("reachability: policyholder session reaches /insights/risk-profile (no bounce)", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/insights/risk-profile", { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForTimeout(500)
    expect(page.url(), "must not have bounced to /dashboard or /auth/signin").not.toMatch(/\/dashboard(?!\/)|\/auth\/signin/)
    expect(page.url()).toContain("/insights/risk-profile")
    console.log(`[measure] reachability confirmed: ${page.url()}`)
})

test("baseline: /insights/risk-profile — unowned-lines profile over a motor+health wallet (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/insights/risk-profile", width)
        await captureSurface(
            page,
            dirs,
            "risk-profile-unowned-lines-paid",
            width,
            [],
            { tier: "paid", state: "unowned-lines-profile (pet/cyber/2-dependants declared, motor+health-only wallet)" }
        )
    }
})
