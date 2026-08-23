/**
 * T-015 baseline — Ασφαλιστήριο `/wallet/[id]`, FREE tier.
 *
 * Closes the gap the original Goal 0 `docs/evidence/policy-detail-mobile/BASELINE.md`
 * documents about itself: that baseline's 18 captures were all on an account
 * that turned out to hold an active `ph-pro` subscription, so the locked gap
 * report + €3 unlock CTA, the PDF-preview lock, premium-insight upsell cards
 * and the sidebar upgrade banner were never rendered once. `FREE_SPECS`
 * (fixtures.ts) is deliberately gappy — more than `FREE_GAP_PREVIEW_COUNT` (3)
 * findings per fixture — so the paywall boundary actually renders.
 *
 * Run:  npx playwright test --project=measure-free wallet-detail-free
 */
import { test, expect } from "@playwright/test"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("wallet-detail")

test.describe.configure({ mode: "serial" })

let ids: Record<string, string> = {}

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    ids = await withDb(async (db) => {
        const result = await provisionMatrixFixtures(db, EMAIL, FREE_SPECS)
        // The report unlock is a one-off purchase that survives re-analysis —
        // reset it so the paywall boundary renders on every run, exactly as
        // `policy-detail-free.spec.ts` already does for the same reason.
        await db.policy.updateMany({ where: { id: { in: Object.values(result) } }, data: { reportUnlockedAt: null } })
        return result
    })
})

for (const spec of FREE_SPECS) {
    test(`baseline free-tier: ${spec.key}`, async ({ page }) => {
        test.setTimeout(8 * 60_000)
        const policyId = ids[spec.key]
        expect(policyId, `fixture ${spec.key} provisioned`).toBeTruthy()
        for (const width of WIDTHS) {
            await openSurface(page, `/wallet/${policyId}`, width)
            expect(page.url(), `${spec.key}@${width}: landed on the wrong page`).toContain(`/wallet/${policyId}`)
            await captureSurface(page, dirs, spec.key, width, [{ key: "policy.policyNumber", value: spec.policyNumber }], {
                tier: "free",
                fixtureState: spec.state,
                lineOfBusiness: spec.lineOfBusiness,
            })
        }
    })
}

/** Tier + paywall sanity, same shape as `policy-detail-free.spec.ts`'s own check. */
test("the free-tier surfaces are actually on screen", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    const policyId = ids["free-motor-active"]
    await openSurface(page, `/wallet/${policyId}`, 390)
    const text = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))
    expect(text, "this session is not free-tier — captures would be mislabelled").not.toContain("Εξαγωγή αναφοράς")
    // "Ξεκλειδ" without the accented ι — the rendered imperative is
    // «Ξεκλειδώστε» (unlock!), which the accented regex `/Ξεκλείδ/` does not
    // match. Confirmed a TEST bug, not a product one: this run's own capture
    // JSON contains the literal string "Ξεκλειδώστε και τα υπόλοιπα 2 κενά —
    // €3" verbatim — the paywall boundary DOES render, the assertion's regex
    // was just wrong. `policy-detail-free.spec.ts` carries the same accented
    // pattern and may have the identical latent bug; not fixed there in this
    // pass (out of this file's boundary), flagged in `wallet-detail/BASELINE.md`.
    expect(/Ξεκλειδ/.test(text), "gap report is not locked — the paywall boundary never rendered").toBe(true)
})
