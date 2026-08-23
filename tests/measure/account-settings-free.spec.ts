/**
 * T-015 baseline — Ρυθμίσεις `/account` + subpages, FREE tier.
 *
 * Only `/account/plan` differs meaningfully by tier (upgrade CTA, plan
 * limits) — the other four subsections (profile/security/privacy/
 * notifications) are account-identity screens with no tier-gated content, so
 * capturing all six here as well as on paid would not add coverage, only
 * duplicate it. `/account/plan` free is the one that matters.
 *
 * Run:  npx playwright test --project=measure-free account-settings-free
 */
import { test } from "@playwright/test"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("account-settings")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, FREE_SPECS))
})

test("baseline: plan section (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/account/plan", width)
        await captureSurface(page, dirs, "plan-free", width, [], { tier: "free", route: "/account/plan" }, 200)
    }
})
