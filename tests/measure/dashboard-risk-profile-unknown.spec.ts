/**
 * BASELINE — `/insights/risk-profile`, DASH account, PW-MOBILE-TRANSFORM-02.
 *
 * Two states, both needing the dashboard account's own fixtures
 * (`tests/measure/dashboard-fixtures.ts`, not modified here beyond the
 * Deliverable-1 correction to `applyUnknownHouseholdFixture` itself) and its
 * own session (`measure-dash` project — routed by this file's `dashboard*`
 * name, matching `dashboard-baseline.spec.ts`'s convention), so this cannot
 * live in `risk-profile-baseline.spec.ts` without racing the shared paid
 * account across two Playwright projects.
 *
 * STATE 1 — the corrected unknown-household fixture (Deliverable 1):
 * `applyPortfolioState(db, DASH_EMAIL, "empty")` first, to guarantee
 * isolation — `applyUnknownHouseholdFixture`'s own doc comment notes it
 * composes safely with the portfolio matrix on the SAME account, but a
 * matrix policy with a real, readable sum-insured/perils would flip the
 * motor_liability `limit`/`peril` dimensions off `unevaluable` for the whole
 * wallet (`assessLimit`/`assessPeril` in `lib/services/risk-graph/
 * protection.ts` union perils/sum-insured across every MATCHED policy, not
 * per-policy), which would silently prevent the very state this run exists
 * to capture. Cleared first, so only the 22 `E2E-DASH-UNK-MOT-` policies
 * (unreadable coverage data by construction) are present.
 *
 * STATE 2 — the `heavy` portfolio state (one of "the normal matrix states"),
 * chosen deliberately over the other four: it is the one state in
 * `PORTFOLIO_STATES` holding a policy at EXACTLY the 45-day edge
 * (`ΣΥΜΒ-2026-H7`, travel, `endInDays: 45`) — inside `monitorRisk`'s
 * `cover_lapsing` window (`days <= 45`, monitoring.ts:69) but OUTSIDE
 * `resolvePolicyLifecycle`'s `expiring_soon` window (`daysUntilExpiry <= 30`,
 * policy-status.ts:192) that the dashboard's OWN fact-strip counts
 * (`PolicyholderHome.tsx:299`). Both counts are rendered somewhere in this
 * account's UI, so this state is the one capture that can empirically PROVE
 * or refute a count contradiction rather than only cite the two thresholds.
 * The test navigates to `/dashboard` immediately after `/insights/risk-profile`
 * in the SAME session/state, so the two numbers being compared were never
 * allowed to drift apart between captures (§0.5).
 *
 * Run:  npx playwright test --project=measure-dash dashboard-risk-profile-unknown
 */
import { test, expect } from "@playwright/test"
import { applyPortfolioState } from "./dashboard-fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const DASH_EMAIL = "e2e-ph-dash@policywallet.test"
const dirs = evidenceDirs("risk-profile")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
})

test("reachability: dash policyholder session reaches /insights/risk-profile (no bounce)", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/insights/risk-profile", { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForTimeout(500)
    expect(page.url(), "must not have bounced to /dashboard or /auth/signin").not.toMatch(/\/dashboard(?!\/)|\/auth\/signin/)
    expect(page.url()).toContain("/insights/risk-profile")
    console.log(`[measure] reachability confirmed (dash): ${page.url()}`)
})

test("baseline: /insights/risk-profile — corrected unknown-household fixture (motor_liability -> unknown)", async ({ page }) => {
    test.setTimeout(8 * 60_000)

    const { applyUnknownHouseholdFixture } = await import("./dashboard-fixtures")
    await withDb(async (db) => {
        await applyPortfolioState(db, DASH_EMAIL, "empty")
        await applyUnknownHouseholdFixture(db, DASH_EMAIL, 22)
    })

    for (const width of WIDTHS) {
        await openSurface(page, "/insights/risk-profile", width)
        const text = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))
        expect(text.toLowerCase(), `${width}: expected the ΑΓΝΩΣΤΟ motor_liability row to render`).toMatch(/αγνωστο|unknown/i)
        await captureSurface(
            page,
            dirs,
            "risk-profile-unknown-household-dash",
            width,
            [],
            { tier: "n/a (no gating on this surface)", state: "unknown-household — 22 unreadable-coverage motor policies, only 'vehicles' known" }
        )
    }
})

test("baseline: /insights/risk-profile + /dashboard cross-check — heavy portfolio, expiry-count comparison", async ({ page }) => {
    test.setTimeout(8 * 60_000)

    await withDb((db) => applyPortfolioState(db, DASH_EMAIL, "heavy"))

    for (const width of WIDTHS) {
        await openSurface(page, "/insights/risk-profile", width)
        await captureSurface(
            page,
            dirs,
            "risk-profile-heavy-dash",
            width,
            [],
            { tier: "n/a (no gating on this surface)", state: "heavy portfolio (12 policies, one at exactly 45-day edge)" }
        )
    }

    // Same state, same session, immediately after — so a comparison against
    // the dashboard's own numbers is never comparing captures whose
    // underlying data moved between passes (§0.5).
    await openSurface(page, "/dashboard", 320)
    await captureSurface(
        page,
        dirs,
        "dashboard-heavy-dash-crosscheck",
        320,
        [],
        { tier: "n/a", state: "heavy portfolio — same session as the risk-profile capture above, for direct count comparison" }
    )
})
