/**
 * BASELINE — `/insights/risk-profile`, FREE tier, PW-MOBILE-TRANSFORM-02.
 *
 * No tier check exists anywhere in this surface's own code
 * (`app/(protected)/insights/risk-profile/page.tsx`,
 * `lib/services/risk-dna/*`, `components/risk-dna/*`,
 * `components/coverage/RiskGraphPanel.tsx` — confirmed by grep before writing
 * this spec, mirroring the `/branches` finding). This captures the FREE
 * account's natural state: `FREE_SPECS` (2 policies), no profile fixture —
 * the contrast against the paid `unowned-lines` capture is what confirms or
 * refutes tier-driven differences on this surface.
 *
 * Run:  npx playwright test --project=measure-free risk-profile-free
 */
import { test, expect } from "@playwright/test"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("risk-profile")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, FREE_SPECS))
})

test("reachability: free policyholder session reaches /insights/risk-profile (no bounce)", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/insights/risk-profile", { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForTimeout(500)
    expect(page.url(), "must not have bounced to /dashboard or /auth/signin").not.toMatch(/\/dashboard(?!\/)|\/auth\/signin/)
    expect(page.url()).toContain("/insights/risk-profile")
    console.log(`[measure] reachability confirmed (free): ${page.url()}`)
})

test("baseline: /insights/risk-profile — natural 2-policy state, no declared exposures (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/insights/risk-profile", width)
        await captureSurface(
            page,
            dirs,
            "risk-profile-natural-free",
            width,
            [],
            { tier: "free", state: "populated-2-policies, no declared exposures" }
        )
    }
})
