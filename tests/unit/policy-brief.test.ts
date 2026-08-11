import { describe, it, expect } from "vitest"
import { derivePolicyBriefCoverage } from "@/lib/wallet/policy-brief"

/**
 * Guards for the brief's coverage arithmetic.
 *
 * Two extraction vintages coexist: v2 rows have no `status` and free-text
 * `limit` strings; v3 rows carry statuses and structured limits[]. The rules
 * under test: an unstated status counts as covered-as-stated (never as "not
 * covered"), free-text amounts are reported but never parsed, and the
 * not-covered bucket reads ONLY coverage statuses — disjoint by construction
 * from the exclusions[] the exclusions bucket counts.
 */

const v3 = {
    coverages: [
        { name: "Own damage", status: "included", limits: [{ amount: 10000 }] },
        { name: "Theft", status: "optional_taken", deductibles: [{ amount: 500 }] },
        { name: "Glass", status: "optional_not_taken" },
        { name: "Flood", status: "excluded" },
    ],
    exclusions: ["Racing", "Wear and tear"],
}

const v2 = {
    coverages: [
        { name: "Fire", limit: "€100.000" },
        { name: "Earthquake", limit: "" },
        { name: "Contents" },
    ],
    exclusions: ["War"],
}

describe("derivePolicyBriefCoverage", () => {
    it("splits a v3 policy into covered / excluded / not-taken", () => {
        const brief = derivePolicyBriefCoverage(v3)
        expect(brief.hasStatuses).toBe(true)
        expect(brief.coveredCount).toBe(2)
        expect(brief.coveredNames).toEqual(["Own damage", "Theft"])
        expect(brief.excludedCount).toBe(1)
        expect(brief.notTakenCount).toBe(1)
        expect(brief.structuredAmountCount).toBe(2)
    })

    it("counts unstated statuses as covered-as-stated, never as not covered", () => {
        const brief = derivePolicyBriefCoverage(v2)
        expect(brief.hasStatuses).toBe(false)
        expect(brief.coveredCount).toBe(3)
        expect(brief.excludedCount).toBe(0)
        expect(brief.notTakenCount).toBe(0)
    })

    it("reports v2 free-text amounts without parsing them", () => {
        const brief = derivePolicyBriefCoverage(v2)
        expect(brief.structuredAmountCount).toBe(0)
        // Only the non-empty limit string counts; "" and absent do not.
        expect(brief.freeTextAmountCount).toBe(1)
    })

    it("not-covered reads coverage statuses only — disjoint from exclusions[]", () => {
        // A document with exclusions[] but no excluded coverage statuses must
        // contribute NOTHING to the not-covered bucket: the two buckets read
        // disjoint sources, so no finding can be counted twice.
        const brief = derivePolicyBriefCoverage({
            coverages: [{ name: "Fire", status: "included" }],
            exclusions: ["War", "Racing", "Nuclear"],
        })
        expect(brief.excludedCount).toBe(0)
        expect(brief.notTakenCount).toBe(0)
    })

    it("handles an empty or malformed envelope without inventing counts", () => {
        for (const acord of [null, undefined, {}, { coverages: "not-an-array" }]) {
            const brief = derivePolicyBriefCoverage(acord)
            expect(brief.hasCoverages).toBe(false)
            expect(brief.coveredCount).toBe(0)
            expect(brief.excludedCount).toBe(0)
        }
    })

    it("caps the covered-name preview at three", () => {
        const brief = derivePolicyBriefCoverage({
            coverages: [1, 2, 3, 4, 5].map((i) => ({ name: `Cover ${i}`, status: "included" })),
        })
        expect(brief.coveredCount).toBe(5)
        expect(brief.coveredNames).toHaveLength(3)
    })
})
