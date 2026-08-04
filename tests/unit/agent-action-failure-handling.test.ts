import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Production-readiness guard for the defect class behind Sentry POLICYWALLET-V.
 *
 * Agent server actions fail in TWO shapes and both must be handled:
 *   1. they RETURN `{ error }` for business failures (unauthorized, not found);
 *   2. they REJECT for transport failures — an oversized body, a session that
 *      proxy.ts 307s to signin, a deployment skew.
 *
 * A bare `await` on one of these does two harmful things at once: the rejection
 * escapes to window.onunhandledrejection, and every state reset written after
 * the await is skipped, pinning the UI on a spinner an advisor cannot clear
 * without reloading. Ignoring a RETURNED error is worse — the UI reports
 * success for a write the server refused.
 *
 * Source-level assertions rather than renders: these are cheap, and the whole
 * point is that no interactive surface reintroduces the pattern.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

/** Interactive agent surfaces that call server actions on user input. */
const SURFACES = [
    "app/(protected)/opportunities/OpportunitiesClient.tsx",
    "app/(protected)/customers/[id]/CustomerProfileClient.tsx",
    "app/(protected)/renewals/RenewalsClient.tsx",
    "components/agent/InviteModal.tsx",
    "components/agent/UploadPolicyModal.tsx",
    "components/agent/AddCustomerModal.tsx",
    "components/agent/QuestionnaireSender.tsx",
]

describe("agent surfaces handle server-action failure", () => {
    it.each(SURFACES)("%s either catches its awaits or propagates them", (file) => {
        const src = read(file)
        const awaits = (src.match(/await\s/g) ?? []).length
        if (awaits === 0) return

        // Two legitimate shapes. Catching locally is the common one. Explicitly
        // THROWING is equally valid when the surface delegates to a caller that
        // handles it — OpportunitiesClient rethrows so OpportunityUpdateModal's
        // existing catch (Sentry + toast + keep the modal open) fires. What is
        // NOT acceptable is a bare await that does neither.
        const handles = /catch\s*[({]/.test(src) || /throw new Error/.test(src)
        expect(handles, `${file} awaits ${awaits} time(s) and neither catches nor throws`).toBe(true)
    })

    it("OpportunitiesClient surfaces a returned error instead of updating state", () => {
        const src = read("app/(protected)/opportunities/OpportunitiesClient.tsx")
        // The action returns { error } rather than throwing, so the modal's own
        // try/catch never fired and it closed reporting success on a rejected
        // write — while opportunity status feeds pipeline and revenue reporting.
        expect(src).toMatch(/updateOpportunityStatus/)
        expect(src).toMatch(/"error"\s+in\s+res/)
        expect(src).toMatch(/throw new Error/)
    })

    it("CustomerProfileClient reports a rejected status update", () => {
        const src = read("app/(protected)/customers/[id]/CustomerProfileClient.tsx")
        // Previously: no refresh, no toast — the advisor clicked and nothing
        // happened, with nothing to say why.
        expect(src).toMatch(/"error"\s+in\s+result/)
        expect(src).toMatch(/toast\.error/)
    })

    it("RenewalsClient clears its saving/sending state in finally", () => {
        const src = read("app/(protected)/renewals/RenewalsClient.tsx")
        expect(src).toMatch(/finally\s*\{\s*\n\s*setIsSaving\(false\)/)
        expect(src).toMatch(/finally\s*\{\s*\n\s*setIsSending\(false\)/)
    })

    it("RenewalsClient keeps the selection when a batch send fails", () => {
        const src = read("app/(protected)/renewals/RenewalsClient.tsx")
        // Clearing on failure would force the advisor to re-select every
        // renewal before they could retry.
        const batch = src.slice(src.indexOf("handleBatchReminder"))
        const clearIdx = batch.indexOf("setSelectedIds(new Set())")
        const guardIdx = batch.indexOf("if (!result.success)")
        expect(guardIdx).toBeGreaterThan(-1)
        expect(clearIdx).toBeGreaterThan(guardIdx)
    })

    it("InviteModal clears its sending state in finally", () => {
        const src = read("components/agent/InviteModal.tsx")
        expect(src).toMatch(/finally\s*\{\s*\n\s*setSending\(false\)/)
    })
})
