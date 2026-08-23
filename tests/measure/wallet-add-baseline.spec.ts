/**
 * T-015 baseline — upload flow `/wallet/add` (priority 9 of the §4.5 order).
 * PAID tier, landing state only (no file selected / no modal open).
 *
 * Run:  npx playwright test --project=measure wallet-add-baseline
 */
import { test } from "@playwright/test"
import { evidenceDirs, ensureDirs, openSurface, captureSurface } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const dirs = evidenceDirs("wallet-add")

test.describe.configure({ mode: "serial" })

test.beforeAll(() => ensureDirs(dirs))

test("baseline: upload landing (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/wallet/add", width)
        // minSections: 0 — AddPolicyClient.tsx has no `.pw-page-shell` and no
        // `section[id]`, so sectionCount() cannot return >0 regardless of content
        // (see agent-view-baseline.spec.ts's comment for the confirmed pattern).
        await captureSurface(page, dirs, "landing-paid", width, [], { tier: "paid" }, 300, 0)
    }
})
