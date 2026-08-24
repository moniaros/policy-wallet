/**
 * T-015 / V2-P0-BASE(a) baseline — Κλάδοι ασφάλισης `/branches`, FREE tier.
 *
 * No tier-gated content exists on this page (no `isPro`/`plan`/`tier` check
 * anywhere in `app/(protected)/branches/page.tsx`,
 * `lib/insurance/branch-page.ts` or `components/branches/ProductBranchCard.tsx`
 * — confirmed by grep before writing this spec) — the only thing tier can
 * change is which policies and which cached score the account holds. This
 * captures the FREE account's own natural state: the same force-refresh as
 * the paid spec, but WITHOUT `applyUnownedLinesProfileFixture` — this
 * account's `PolicyholderProfile` has never declared pets/cyber/dependants,
 * so `expectedLines` should come back thin, and every branch the account
 * does not hold a policy for should render `neutral`, not `gap`. That
 * contrast — same nine tiles, no §2.2 red state without a declared exposure
 * behind it — is the free-tier evidence this pass is for.
 *
 * Run:  npx playwright test --project=measure-free branches-free
 */
import { test, expect } from "@playwright/test"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("branches")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, FREE_SPECS))
})

test("warm: force-refresh the protection score cache (free)", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/branches", { waitUntil: "domcontentloaded", timeout: 60_000 })
    const res = await page.request.get("/api/v1/protection-score?fresh=true")
    const body = await res.json().catch(() => null)
    console.log(`[measure] protection-score warm refresh (free): ${res.status()} expectedLines=${JSON.stringify(body?.data?.expectedLines ?? body?.expectedLines)}`)
    expect(res.ok(), `protection-score?fresh=true should succeed, got ${res.status()}: ${JSON.stringify(body)}`).toBeTruthy()
})

test("baseline: /branches — natural 2-policy state, no declared exposures (free)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/branches", width)
        await captureSurface(
            page,
            dirs,
            "branches-natural-free",
            width,
            [],
            { tier: "free", state: "populated-2-policies, no declared exposures" },
            300,
            0
        )
    }
})
