/**
 * T-015 baseline — Αναλύσεις `/coverage-insights` (priority 5 of the §4.5
 * order). §7.5 of the run's brief calls this "the densest surface in the
 * app" — on evidence that had never been measured before this pass.
 *
 * PAID tier, on the same 15-policy fixture matrix `wallet-list-baseline`
 * provisions (idempotent — either spec may run first).
 *
 * Run:  npx playwright test --project=measure coverage-insights-baseline
 */
import { test } from "@playwright/test"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("coverage-insights")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS]))
})

test("baseline: coverage insights over a 15-policy portfolio (paid)", async ({ page }) => {
    test.setTimeout(8 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/coverage-insights", width)
        await captureSurface(page, dirs, "populated-paid", width, [], { tier: "paid", state: "populated-15-policies" })
    }
})
