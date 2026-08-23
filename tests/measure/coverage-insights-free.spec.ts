/**
 * T-015 baseline — Αναλύσεις `/coverage-insights`, FREE tier.
 * Run:  npx playwright test --project=measure-free coverage-insights-free
 */
import { test } from "@playwright/test"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("coverage-insights")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, FREE_SPECS))
})

test("baseline: coverage insights over a 2-policy portfolio (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/coverage-insights", width)
        await captureSurface(page, dirs, "populated-free", width, [], { tier: "free", state: "populated-2-policies" })
    }
})
