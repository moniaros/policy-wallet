/**
 * T-015 / V2-P0-BASE(a) baseline — Κλάδοι ασφάλισης `/branches`, PAID tier.
 *
 * `/branches` was never measured in v1. It reads two things at render time:
 * the account's policies (line + lifecycle status) and the CACHED
 * `ProtectionScore.expectedLines` row (`lib/insurance/branch-page.ts`'s
 * `buildBranchOverview`) — never recomputed on a GET, by design
 * (`PolicyholderHome.tsx`'s own comment: "a GET render must not write,
 * freshness is the cron / upload pipeline's job"). So a bare page load against
 * an account with no cached score can only ever show `covered`/`neutral`
 * tiles — the `gap` state (§2.2's «Πιθανό κενό») needs an actual score row on
 * the books first.
 *
 * This spec provisions the shared paid E2E account's usual 15-policy matrix
 * (motor + health only — the account never holds pet/cyber/life), then layers
 * `applyUnownedLinesProfileFixture` (tests/measure/fixtures.ts, not modified
 * here) on top, which declares pets + moderate cyber exposure + dependants —
 * exposures the account holds NO matching policy for. It then force-refreshes
 * the score via `GET /api/v1/protection-score?fresh=true` (the one endpoint
 * that calls `runGapEngine` on demand, per its own doc comment) using the
 * page's own authenticated request context, so the cached row `/branches`
 * reads back is the one this fixture produced — not a stale one written days
 * ago by some other spec run against the same shared account.
 *
 * Run:  npx playwright test --project=measure branches-baseline
 */
import { test, expect } from "@playwright/test"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures, applyUnownedLinesProfileFixture } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("branches")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb(async (db) => {
        await provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS])
        await applyUnownedLinesProfileFixture(db, EMAIL)
    })
})

test("warm: force-refresh the protection score cache (paid)", async ({ page }) => {
    test.setTimeout(60_000)
    // Establishes the session against baseURL before the API call — the
    // storageState cookie is already on the context, but a same-origin
    // request is the least surprising way to exercise it.
    await page.goto("/branches", { waitUntil: "domcontentloaded", timeout: 60_000 })
    const res = await page.request.get("/api/v1/protection-score?fresh=true")
    const body = await res.json().catch(() => null)
    console.log(`[measure] protection-score warm refresh: ${res.status()} expectedLines=${JSON.stringify(body?.data?.expectedLines ?? body?.expectedLines)}`)
    expect(res.ok(), `protection-score?fresh=true should succeed, got ${res.status()}: ${JSON.stringify(body)}`).toBeTruthy()
})

test("baseline: /branches — nine line tiles, three unowned (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/branches", width)
        // No `.pw-page-shell` on this page (plain `<div className="mx-auto
        // max-w-7xl ...">`) and no `section[id]` either — sectionCount()'s two
        // conventions both miss it structurally, exactly the `/agent` lesson
        // documented in surface-harness.ts. minSections: 0 is a deliberate,
        // visible opt-out, not an assumption this page is actually empty.
        await captureSurface(
            page,
            dirs,
            "branches-unowned-lines-paid",
            width,
            [],
            { tier: "paid", state: "unowned-lines-profile (pet/cyber/life declared, zero policies)" },
            300,
            0
        )
    }
})
