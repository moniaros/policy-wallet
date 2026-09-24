import { describe, it, expect } from "vitest"
import { differentialFromDocuments } from "@/lib/wallet/renewal-compare"

const doc = (id: string, uploaded: string, effective: string | null, acord: unknown) => ({
    id, uploadedAt: new Date(uploaded), effectiveFrom: effective ? new Date(effective) : null,
    extractionCache: acord === undefined ? null : { version: "v", extraction: { acordData: acord } },
})

describe("differentialFromDocuments (spec v2 §10.3)", () => {
    it("needs two READ documents — one, or two without extraction, is nothing to compare", () => {
        expect(differentialFromDocuments([doc("a", "2026-01-01", null, { policy: { premium: { amount: 100 } } })])).toBeNull()
        expect(differentialFromDocuments([doc("a", "2026-01-01", null, undefined), doc("b", "2026-02-01", null, undefined)])).toBeNull()
    })
    it("orders by the period covered, not by upload time", () => {
        const late = doc("old", "2026-06-01", "2025-01-01", { policy: { premium: { amount: 100 } } })
        const early = doc("new", "2026-01-01", "2026-01-01", { policy: { premium: { amount: 120 } } })
        const diff = differentialFromDocuments([early, late])
        expect(diff?.fromDocumentId).toBe("old")
        expect(diff?.toDocumentId).toBe("new")
        expect(diff?.premiumDelta).toBe(20)
    })
})
