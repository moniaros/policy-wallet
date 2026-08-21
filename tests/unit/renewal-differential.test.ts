import { describe, it, expect } from "vitest"
import { buildRenewalDifferential } from "@/lib/services/renewal-differential"

/**
 * «Τι άλλαξε στην ανανέωση» on a crafted original + renewal pair.
 *
 * The document these tests model is a real ανανεωτήριο: it prices the next
 * term, restates one or two sums, drops a cover, and says nothing whatever
 * about the rest of the contract.
 */
const ORIGINAL_DOC = "doc_original_2025"
const RENEWAL_DOC = "doc_renewal_2026"

const original = {
    policy: { premium: { amount: 420 }, sumInsured: null },
    vehicle: {
        make: "Toyota",
        model: "Yaris",
        insuredValue: 9000,
        estimatedMarketValue: 9000,
        deductible: 300,
        ownVehicleDamage: true,
        glassBreakage: true,
        hasRoadsideAssistance: true,
        greenCardExpiryDate: "2026-09-30",
    },
}

// What the renewal notice actually prints: a new premium, a lower value, a
// higher excess, glass breakage dropped. Silent about everything else.
const renewal = {
    policy: { premium: { amount: 465 } },
    vehicle: {
        insuredValue: 6500,
        deductible: 500,
        glassBreakage: false,
    },
}

describe("the renewal differential states facts, with citations", () => {
    const diff = buildRenewalDifferential({
        fromDocumentId: ORIGINAL_DOC,
        toDocumentId: RENEWAL_DOC,
        before: original,
        after: renewal,
    })

    it("reports the premium delta", () => {
        expect(diff.premiumBefore).toBe(420)
        expect(diff.premiumAfter).toBe(465)
        expect(diff.premiumDelta).toBe(45)
    })

    it("separates money changes from term changes", () => {
        const sums = Object.fromEntries(diff.sumChanges.map((c) => [c.path, c]))
        expect(sums["vehicle.insuredValue"]).toMatchObject({ before: 9000, after: 6500, kind: "modified" })
        expect(sums["vehicle.deductible"]).toMatchObject({ before: 300, after: 500, kind: "modified" })

        const terms = Object.fromEntries(diff.termChanges.map((c) => [c.path, c]))
        expect(terms["vehicle.glassBreakage"]).toMatchObject({
            before: true,
            after: false,
            kind: "removed",
        })
    })

    it("calls an explicit false a REMOVAL, because that is the thing worth seeing", () => {
        const dropped = diff.termChanges.find((c) => c.path === "vehicle.glassBreakage")
        expect(dropped?.kind).toBe("removed")
    })

    it("does not invent changes from silence", () => {
        // The renewal never mentions these. They must not appear at all —
        // reporting "roadside assistance removed" because a notice was terse
        // is the failure mode this whole design exists to avoid.
        const paths = [...diff.sumChanges, ...diff.termChanges].map((c) => c.path)
        expect(paths).not.toContain("vehicle.hasRoadsideAssistance")
        expect(paths).not.toContain("vehicle.ownVehicleDamage")
        expect(paths).not.toContain("vehicle.make")
        expect(paths).not.toContain("vehicle.greenCardExpiryDate")
        expect(paths).not.toContain("vehicle.estimatedMarketValue")
    })

    it("cites both source documents on every entry", () => {
        for (const change of [...diff.sumChanges, ...diff.termChanges]) {
            expect(change.fromDocumentId).toBe(ORIGINAL_DOC)
            expect(change.toDocumentId).toBe(RENEWAL_DOC)
        }
    })

    it("reports an addition when the renewal states something new", () => {
        const d = buildRenewalDifferential({
            fromDocumentId: ORIGINAL_DOC,
            toDocumentId: RENEWAL_DOC,
            before: { vehicle: { make: "Toyota" } },
            after: { vehicle: { legalProtection: true } },
        })
        expect(d.termChanges).toHaveLength(1)
        expect(d.termChanges[0]).toMatchObject({ path: "vehicle.legalProtection", kind: "added", before: null })
    })

    it("is empty when the renewal restates the same terms", () => {
        const d = buildRenewalDifferential({
            fromDocumentId: ORIGINAL_DOC,
            toDocumentId: RENEWAL_DOC,
            before: original,
            after: { vehicle: { insuredValue: 9000 } },
        })
        expect(d.isEmpty).toBe(true)
        expect(d.premiumDelta).toBeNull()
    })

    it("carries no severity and no advice", () => {
        const serialized = JSON.stringify(diff)
        expect(serialized).not.toMatch(/critical|high|medium|severity/i)
        expect(serialized).not.toMatch(/recommend|should|μειώστε|προτείν/i)
    })
})
