/**
 * T-016b — `/consent/ai` CONTENT (`remaining-surfaces/BASELINE.md` only ever
 * probed the landing URL/redirect outcome, never the page itself).
 *
 * READ-ONLY PER THE BRIEF: this is a §12.2 AI-processing consent surface.
 * Nothing about the page, `AiConsentApprovalClient.tsx`, or `AiConsentModal.tsx`
 * is touched — this spec only reads. The one state change here is the SAME
 * idiom every other spec in this evidence run uses to reach a state that
 * requires specific account data (the relationship flip in
 * `wallet-edit-and-agent-noadvisor-baseline.spec.ts`, the consent flip in
 * `overlays-consent-limit-compare-confirm-baseline.spec.ts`): flip the ONE
 * column that gates this route (`User.aiProcessingConsentVersion`) to `null`
 * for the duration of the capture, restore the exact original value in
 * `finally`. The ACCEPT button is never clicked — accepting would durably
 * record consent server-side (`POST /api/v1/consents`), which is a state
 * change to consent itself, not to the harness's own test fixture, and is
 * exactly what "change nothing about it" rules out.
 *
 * `remaining-surfaces/BASELINE.md`'s own prior finding was that
 * `e2e-ph@policywallet.test` did NOT redirect even without this flip — its
 * `aiProcessingConsentVersion` was already null when that probe ran. Flipped
 * explicitly here anyway so this capture does not depend on that account
 * being in whatever state a previous, unrelated spec left it in.
 *
 * Run:  npx playwright test --project=measure consent-ai-content-baseline
 */
import { test, expect } from "@playwright/test"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("remaining-surfaces")

test.beforeAll(async () => {
    ensureDirs(dirs)
})

test("baseline: /consent/ai content (paid, never-consented state)", async ({ page }) => {
    test.setTimeout(6 * 60_000)

    const original = await withDb(async (db) => {
        const u = await db.user.findUnique({ where: { email: EMAIL }, select: { aiProcessingConsentVersion: true } })
        await db.user.update({ where: { email: EMAIL }, data: { aiProcessingConsentVersion: null } })
        return u?.aiProcessingConsentVersion ?? null
    })

    try {
        for (const width of WIDTHS) {
            await openSurface(page, "/consent/ai", width)
            expect(page.url(), `consent/ai@${width}: should render in place, not redirect`).toContain("/consent/ai")
            await page.waitForSelector("#ai-consent-title", { timeout: 10_000 })
            await page.waitForTimeout(300)
            // minSections: 0 — the route's entire content is a modal over an
            // otherwise-empty `<div className="min-h-[60vh]">`
            // (AiConsentApprovalClient.tsx), no `.pw-page-shell`/`section[id]`.
            await captureSurface(page, dirs, "consent-ai-content", width, [], { tier: "paid", state: "never-consented" }, 200, 0)
        }
    } finally {
        await withDb((db) => db.user.update({ where: { email: EMAIL }, data: { aiProcessingConsentVersion: original } }))
    }
})
