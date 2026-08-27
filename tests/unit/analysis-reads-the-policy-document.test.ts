/**
 * The document analysis reads is the POLICY, not the newest upload.
 *
 * Both the pipeline and the policy-detail page used to take "the most recently
 * uploaded document" — `orderBy: { uploadedAt: "desc" }` then `[0]`. That was
 * only ever correct while every document on a policy was a policy schedule.
 *
 * The moment a customer can attach a terms booklet (όροι) to an already
 * analysed policy, the newest file is no longer the policy, and:
 *
 *   - the next analysis run — `retryPolicyAnalysis`, a renewal attach, the
 *     process-policy job — spends metered tokens reading the booklet, and
 *     caches the extraction against it;
 *   - every «Άνοιγμα εγγράφου» on the detail page (the head's primary action,
 *     the summary card, each unreadable-value CTA) points at the booklet, so
 *     "show me where this figure comes from" lands in a document that does not
 *     contain it.
 *
 * `assessExtractionEvidence` prevents the booklet OVERWRITING stored facts, so
 * this was never data corruption. It was worse in a quieter way: an analysis
 * that had not read the policy, presented as one that had.
 *
 * The selection rule under test (`selectSourceDocument`, renewal-chain.ts):
 * prefer the newest TERM-BEARING document, fall back to the newest overall when
 * none qualifies. A null kind counts, so unclassified and legacy rows behave
 * exactly as before — behaviour changes only for a document explicitly
 * classified as carrying no terms.
 *
 * TERM-bearing, not POLICY-bearing, and the difference is not academic: the two
 * predicates disagree on `renewal_notice`, and the first version of this fix
 * used the wrong one. `isPolicyBearing` answers "is this evidence of a policy at
 * all" for the extraction-refusal gate and excludes renewals — so an ανανεωτήριο
 * attached to a policy would have been skipped in favour of the schedule it
 * supersedes. The test below caught it.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { selectSourceDocument } from "../../lib/wallet/renewal-chain"

/** The rule as BOTH call sites had it before the fix — newest wins, always. */
function legacySelect<T>(newestFirst: T[]): T | undefined {
    return newestFirst[0]
}

const SCHEDULE = { id: "doc-policy", documentKind: "policy_schedule" as const }
const BOOKLET = { id: "doc-booklet", documentKind: "terms_and_conditions" as const }
const RENEWAL = { id: "doc-renewal", documentKind: "renewal_notice" as const }
const LEGACY = { id: "doc-legacy", documentKind: null }

describe("which document analysis reads", () => {
    it("skips a booklet uploaded after the policy", () => {
        // newest first: the booklet was just attached
        const chosen = selectSourceDocument([BOOKLET, SCHEDULE])
        expect(chosen?.id).toBe("doc-policy")

        // PROBE: the pre-fix rule picked the booklet. This is the defect.
        expect(legacySelect([BOOKLET, SCHEDULE])?.id).toBe("doc-booklet")
    })

    it("prefers the newest TERM-bearing document — a renewal counts", () => {
        // A renewal IS term-bearing — it carries the renewed period's terms.
        // This case caught a real error in the first version of the fix, which
        // used isPolicyBearing: that predicate EXCLUDES renewal_notice, so a
        // freshly attached ανανεωτήριο would have been skipped in favour of the
        // superseded schedule.
        expect(selectSourceDocument([RENEWAL, SCHEDULE])?.id).toBe("doc-renewal")
    })

    it("treats an unclassified document as eligible, so legacy rows are unchanged", () => {
        // A null kind counts, deliberately. A policy whose documents predate the
        // documentKind column must behave exactly as it did before this rule.
        expect(selectSourceDocument([LEGACY, SCHEDULE])?.id).toBe("doc-legacy")
        expect(selectSourceDocument([LEGACY])?.id).toBe("doc-legacy")
    })

    it("falls back to the newest when NOTHING carries terms", () => {
        // A policy holding only a booklet must stay analysable and linkable
        // rather than failing MISSING_DOCUMENT or rendering no source link.
        expect(selectSourceDocument([BOOKLET])?.id).toBe("doc-booklet")
    })

    it("returns undefined for no documents", () => {
        expect(selectSourceDocument([])).toBeUndefined()
    })
})

describe("both call sites actually apply the rule", () => {
    // Source-level, because neither site is reachable from a unit test without
    // a database and a rendered page. A guard that cannot see the call site
    // guards the helper, not the invariant.
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")

    it("the orchestrator no longer takes findFirst-newest", () => {
        const src = strip(readFileSync("lib/services/analysis/policy-analysis-orchestrator.service.ts", "utf8"))
        expect(src).toContain("selectSourceDocument")
        // The exact pre-fix shape must be gone.
        expect(src).not.toMatch(/policyDocument\.findFirst\(\{\s*where:\s*\{\s*policyId\s*\},\s*orderBy:\s*\{\s*uploadedAt:\s*"desc"\s*\}/)
    })

    it("the detail page no longer takes documents[0] for the source link", () => {
        const src = strip(readFileSync("components/wallet/PolicyDetailsClientView.tsx", "utf8"))
        expect(src).toContain("selectSourceDocument")
        expect(src).not.toMatch(/const firstDocumentId = policy\.documents\?\.\[0\]\?\.id/)
    })

    it("the orchestrator declares the mime type from verified content, not the label", () => {
        // `fileName` is a generated Greek label with no extension, so
        // documentMimeType() always returned the application/pdf fallback — a
        // phone photo reached the model declared as a PDF. The row's mimeType
        // column is derived from the verified bytes.
        const src = strip(readFileSync("lib/services/analysis/policy-analysis-orchestrator.service.ts", "utf8"))
        expect(src).toContain("document.mimeType || documentMimeType(document.fileName)")
    })
})
