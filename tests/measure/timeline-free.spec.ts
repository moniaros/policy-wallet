/**
 * T-015 / V2-P0-BASE(a) baseline — Χρονολόγιο `/timeline`, FREE tier.
 *
 * `FREE_SPECS` (tests/measure/fixtures.ts) has no `placeholderIdentity`
 * fixture — it is deliberately small and gap-heavy for the €3-unlock
 * boundary, not the T-012 defect matrix — so this is the surface's NATURAL
 * state for a low-activity account: two policies, no life events, no
 * risk-profile version history, no advisor relationship. Captured for
 * contrast against the paid account's dozens-of-rows state, and to answer
 * the brief's "whether it justifies a menu slot at all" question for the
 * account most likely to see it close to empty.
 *
 * Run:  npx playwright test --project=measure-free timeline-free
 */
import { test } from "@playwright/test"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("timeline")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, FREE_SPECS))
})

test("baseline: /timeline — natural low-activity state (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/timeline", width)
        await captureSurface(
            page,
            dirs,
            "timeline-free",
            width,
            [],
            { tier: "free", state: "natural 2-policy account, no defect fixtures" }
        )
    }
})
