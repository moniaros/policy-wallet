/**
 * The AI Policy Brief's coverage-status arithmetic — pure, defensive readers
 * over the acord envelope, like the rest of lib/wallet/policy-detail.
 *
 * Two vintages of extraction coexist in the book:
 *
 *  - v2 rows predate `coverages[].status` and structured `limits[]` — a
 *    coverage with NO status must count as covered-as-stated, never as "not
 *    covered", and its free-text `limit` string is reported as free text,
 *    never parsed.
 *  - v3 rows carry `status` (included / optional_taken / optional_not_taken /
 *    excluded) and structured limits/deductibles.
 *
 * The disjointness invariant the brief depends on: "not covered" counts ONLY
 * coverage-item statuses; the exclusions bucket counts ONLY the document's
 * `exclusions[]` strings and flagged clauses. The two sources never overlap,
 * so the brief cannot double-count a finding. (Encoded in policy-brief tests.)
 */

interface CoverageLike {
    name?: unknown
    status?: unknown
    limit?: unknown
    limits?: unknown
    deductibles?: unknown
}

export interface PolicyBriefCoverage {
    hasCoverages: boolean
    /** True when at least one coverage carries a status (a v3 extraction). */
    hasStatuses: boolean
    /** Coverages included, taken, or stated without a status. */
    coveredCount: number
    /** Up to three covered-cover names, for the brief's one-liner. */
    coveredNames: string[]
    /** `status === "excluded"` — excluded by the contract. */
    excludedCount: number
    /** `status === "optional_not_taken"` — offered but not taken. */
    notTakenCount: number
    /** Coverages with structured limits[] or deductibles[] (v3). */
    structuredAmountCount: number
    /** Coverages whose only amount is a free-text `limit` string (v2). */
    freeTextAmountCount: number
}

const COVERED_STATUSES = new Set(["included", "optional_taken"])

function coverageList(acordData: unknown): CoverageLike[] {
    const coverages = (acordData as { coverages?: unknown } | null | undefined)?.coverages
    return Array.isArray(coverages) ? (coverages as CoverageLike[]) : []
}

export function derivePolicyBriefCoverage(acordData: unknown): PolicyBriefCoverage {
    const coverages = coverageList(acordData)
    const hasStatuses = coverages.some((c) => typeof c.status === "string" && c.status.length > 0)

    const covered = coverages.filter((c) => {
        if (typeof c.status !== "string" || c.status.length === 0) return true
        return COVERED_STATUSES.has(c.status)
    })
    const excludedCount = coverages.filter((c) => c.status === "excluded").length
    const notTakenCount = coverages.filter((c) => c.status === "optional_not_taken").length

    // The exact predicate StructuredCoverageTable renders by — one definition
    // of "has structured amounts" across the page.
    const structured = coverages.filter(
        (c) =>
            (Array.isArray(c.limits) && c.limits.length > 0) ||
            (Array.isArray(c.deductibles) && c.deductibles.length > 0)
    )
    const freeText = coverages.filter(
        (c) =>
            !structured.includes(c) &&
            typeof c.limit === "string" &&
            c.limit.trim().length > 0
    )

    return {
        hasCoverages: coverages.length > 0,
        hasStatuses,
        coveredCount: covered.length,
        coveredNames: covered
            .map((c) => (typeof c.name === "string" ? c.name.trim() : ""))
            .filter((name) => name.length > 0)
            .slice(0, 3),
        excludedCount,
        notTakenCount,
        structuredAmountCount: structured.length,
        freeTextAmountCount: freeText.length,
    }
}
