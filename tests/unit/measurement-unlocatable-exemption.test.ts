/**
 * P5-INFRA-00 REFUSAL PROBE — the exemption decision, without a browser.
 *
 * `captureSurface` refuses to record a capture containing identity fields the
 * harness could not locate, unless the surface/field pair is documented. That
 * refusal sits on the critical path of EVERY measurement spec, and it needs a
 * live `Page` to reach — so `tsc`, lint and the unit suite all pass over it
 * without executing it once. The first version of the decision was wrong in
 * two independent ways and every one of those checks was green.
 *
 * Each test below carries `legacyDecision` — the decision exactly as it
 * shipped — and asserts it gets the answer WRONG where the current one gets it
 * right. That is the probe: the guard is demonstrated failing, in the repo,
 * rather than asserted to have once failed. Same shape as `legacyCollect` in
 * policy-detail-section-budget.test.tsx.
 */
import { describe, expect, it } from "vitest"
import { undocumentedUnlocatable } from "../measure/surface-harness"

type Row = { index: number; missingFields: string[] }

/** The decision as it shipped: drop the last label segment, test field [0] only. */
function legacyDecision(label: string, rows: Row[], exemptions: Record<string, string[]>): Row[] {
    const surface = label.split("-").slice(0, -1).join("-")
    const exempt = exemptions[surface] || []
    return rows.filter((item) => !exempt.includes(item.missingFields[0]!))
}

const EXEMPT = { "policy-detail": ["subject"] }

describe("undocumentedUnlocatable", () => {
    it("finds the exemption through the state segments a real label carries", () => {
        const label = "policy-detail-motor-active-320"
        const rows: Row[] = [{ index: 0, missingFields: ["subject"] }]

        expect(undocumentedUnlocatable(label, rows, EXEMPT)).toEqual([])

        // PROBE: segment arithmetic derived "policy-detail-motor-active", matched
        // nothing, and would have refused every policy-detail capture on a run
        // that never reached one before this test existed.
        expect(legacyDecision(label, rows, EXEMPT)).toHaveLength(1)
    })

    it("refuses a row whose OTHER missing field is undocumented", () => {
        const label = "policy-detail-motor-active-320"
        const rows: Row[] = [{ index: 3, missingFields: ["subject", "insurer"] }]

        // The absent insurer is not exempt, so the row is still refused.
        expect(undocumentedUnlocatable(label, rows, EXEMPT)).toHaveLength(1)

        // PROBE: testing missingFields[0] alone waved this through on "subject".
        expect(legacyDecision("policy-detail-320", rows, EXEMPT)).toEqual([])
    })

    it("exempts nothing on a surface that documented nothing", () => {
        const rows: Row[] = [{ index: 0, missingFields: ["subject"] }]
        expect(undocumentedUnlocatable("dashboard-typical-390", rows, EXEMPT)).toHaveLength(1)
    })

    it("matches on a segment boundary, so a shorter surface cannot swallow a longer one", () => {
        const rows: Row[] = [{ index: 0, missingFields: ["subject"] }]
        const both = { policy: ["insurer"], "policy-detail": ["subject"] }

        // Longest match wins: policy-detail, not policy.
        expect(undocumentedUnlocatable("policy-detail-motor-320", rows, both)).toEqual([])
        // And "policy-detail" must not be read as the "policy" surface.
        expect(undocumentedUnlocatable("policyholder-list-320", rows, both)).toHaveLength(1)
    })

    it("is empty in, empty out — a clean capture reaches no refusal", () => {
        expect(undocumentedUnlocatable("wallet-heavy-320", [], EXEMPT)).toEqual([])
    })
})
