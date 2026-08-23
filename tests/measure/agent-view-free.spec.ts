/**
 * T-015 baseline — Σύμβουλος `/agent`, FREE tier.
 * Run:  npx playwright test --project=measure-free agent-view-free
 */
import { test } from "@playwright/test"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("agent-view")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, FREE_SPECS))
})

test("baseline: adviser view (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/agent", width)
        // minSections: 0 — see agent-view-baseline.spec.ts's comment: AgentClient.tsx
        // has neither `.pw-page-shell` nor `section[id]`, so sectionCount() cannot
        // return >0 here regardless of real content.
        await captureSurface(page, dirs, "no-advisor-fixture-free", width, [], { tier: "free", state: "unmodified-relationship" }, 300, 0)
    }
})
