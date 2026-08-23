/**
 * T-015 baseline — upload flow `/wallet/add`, FREE tier landing state.
 * Coverage-Limit-Modal (the overlay that fires when adding would exceed the
 * free plan's policy cap) is NOT captured here — it requires driving the
 * add-policy form to the limit interactively, which this pass does not
 * attempt; recorded as a gap in the surface's BASELINE.md.
 *
 * Run:  npx playwright test --project=measure-free wallet-add-free
 */
import { test } from "@playwright/test"
import { evidenceDirs, ensureDirs, openSurface, captureSurface } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const dirs = evidenceDirs("wallet-add")

test.describe.configure({ mode: "serial" })

test.beforeAll(() => ensureDirs(dirs))

test("baseline: upload landing (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/wallet/add", width)
        // minSections: 0 — see wallet-add-baseline.spec.ts's comment.
        await captureSurface(page, dirs, "landing-free", width, [], { tier: "free" }, 300, 0)
    }
})
