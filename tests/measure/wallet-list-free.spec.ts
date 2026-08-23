/**
 * T-015 baseline — Πορτοφόλι `/wallet`, FREE tier.
 *
 * `FREE_SPECS` (2 policies, deliberately over the free gap-preview boundary)
 * on `e2e-ph-free@policywallet.test`. Runs in `measure-free`.
 *
 * Run:  npx playwright test --project=measure-free wallet-list-free
 */
import { test } from "@playwright/test"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("wallet-list")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, FREE_SPECS))
})

test("baseline: 2-policy wallet (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/wallet", width)
        await captureSurface(page, dirs, "populated-free", width, [], { tier: "free", state: "populated-2-policies" })
    }
})
