/**
 * T-015 / V2-P0-BASE(a) baseline — Χρονολόγιο `/timeline`, PAID tier.
 *
 * `/timeline` was never measured in v1. `lib/services/timeline/build.ts`'s
 * `buildTimeline` writes the `policy_added` entry title from
 * `policy.insurerName?.trim()` DIRECTLY (line ~202-214) — it never routes
 * through `lib/wallet/policy-identity.ts`'s `displayInsurerName`/
 * `scrubPolicyIdentity`, the ONE place CLAUDE.md says a policy's identity
 * may be rendered from. `LifeTimeline.tsx` then prints `entry.title[lang]`
 * verbatim (line ~249), with no scrubbing on the client side either. So a
 * policy whose `insurerName` is the extractor's own sentinel
 * (`__PENDING_EXTRACTION__`) reaches the page as literal text — this is the
 * §2.6 candidate, confirmed by reading the code before this spec was written.
 *
 * `tests/measure/fixtures.ts`'s `defect-placeholder-identity` spec (part of
 * `DEFECT_SPECS`, already the paid account's standing state from every other
 * baseline in this run) sets exactly `insurerName: "__PENDING_EXTRACTION__"`
 * on an `active` motor policy — this spec does not invent a new fixture, it
 * reuses that one.
 *
 * ONE thing this spec does that provisioning alone does not: `getTimeline`
 * takes the newest 60 entries across a shared E2E account with weeks of
 * activity from every other spec in this run, sorted by each entry's own
 * date (`policy_added`'s date is `policy.createdAt`). `provisionMatrixFixtures`
 * only ever UPDATEs an existing fixture policy's mutable columns — `createdAt`
 * is not among them — so a fixture policy created in an earlier session could
 * silently age out of the 60-entry window and the candidate would read as
 * "did not reproduce" for a reason that has nothing to do with the product.
 * This spec stamps `defect-placeholder-identity`'s `createdAt` to "now"
 * immediately after provisioning, once, so its `policy_added` entry is
 * guaranteed to sort at (or within a few slots of) the top — a deliberate,
 * visible test-only write, not a product behavior.
 *
 * Run:  npx playwright test --project=measure timeline-baseline
 */
import { test } from "@playwright/test"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("timeline")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb(async (db) => {
        const ids = await provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS])
        const placeholderId = ids["defect-placeholder-identity"]
        if (!placeholderId) {
            throw new Error("timeline-baseline: defect-placeholder-identity fixture id missing from provisionMatrixFixtures result")
        }
        await db.policy.update({ where: { id: placeholderId }, data: { createdAt: new Date() } })
    })
})

test("baseline: /timeline — dozens of entries, one carries __PENDING_EXTRACTION__ (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/timeline", width)
        await captureSurface(
            page,
            dirs,
            "timeline-paid",
            width,
            [],
            { tier: "paid", state: "60-entry window, defect-placeholder-identity forced to the top" }
        )
    }
})
