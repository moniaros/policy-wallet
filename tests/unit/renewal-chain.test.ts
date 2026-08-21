import { describe, it, expect } from "vitest"
import {
    chainCompleteness,
    newestRenewal,
    orderChain,
    originalDocument,
    type ChainDocument,
} from "@/lib/wallet/renewal-chain"

const doc = (
    id: string,
    documentKind: string | null,
    effectiveFrom: string | null,
    uploadedAt: string
): ChainDocument => ({
    id,
    documentKind,
    effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
    effectiveTo: null,
    uploadedAt: new Date(uploadedAt),
})

describe("the chain is ordered by what documents cover, not when they arrived", () => {
    it("puts a back-filled older renewal in its right place", () => {
        // The 2024 renewal was uploaded LAST, months after the 2026 one. Sorting
        // by uploadedAt would make it the newest and let its terms override.
        const chain = [
            doc("original", "policy_schedule", "2023-01-01", "2026-01-05"),
            doc("r2026", "renewal_notice", "2026-01-01", "2026-01-06"),
            doc("r2024", "renewal_notice", "2024-01-01", "2026-08-20"),
        ]
        expect(orderChain(chain).map((d) => d.id)).toEqual(["original", "r2024", "r2026"])
        expect(newestRenewal(chain)?.id).toBe("r2026")
    })

    it("falls back to upload time only for documents that state no period", () => {
        const chain = [
            doc("undated", "renewal_notice", null, "2020-01-01"),
            doc("dated", "renewal_notice", "2026-01-01", "2026-01-01"),
        ]
        // The dated one sorts first despite the undated one being older by
        // upload: a document that does not say what it covers cannot outrank
        // one that does.
        expect(orderChain(chain).map((d) => d.id)).toEqual(["dated", "undated"])
    })

    it("finds the original", () => {
        const chain = [
            doc("inv", "invoice", null, "2026-01-01"),
            doc("orig", "policy_schedule", "2023-01-01", "2026-01-02"),
        ]
        expect(originalDocument(chain)?.id).toBe("orig")
    })
})

describe("a renewal without its original is labelled, not refused", () => {
    it("reports incomplete terms rather than pretending to be a policy", () => {
        const chain = [doc("r", "renewal_notice", "2026-01-01", "2026-01-01")]
        expect(chainCompleteness(chain)).toEqual({
            state: "incomplete_terms",
            reason: "renewal_without_original",
            renewalId: "r",
        })
    })

    it("is complete once the original arrives", () => {
        const chain = [
            doc("r", "renewal_notice", "2026-01-01", "2026-01-01"),
            doc("o", "policy_schedule", "2023-01-01", "2026-02-01"),
        ]
        expect(chainCompleteness(chain)).toEqual({ state: "complete", originalId: "o" })
    })

    it("distinguishes 'no terms at all' from 'renewal only'", () => {
        const chain = [doc("i", "invoice", null, "2026-01-01")]
        expect(chainCompleteness(chain).state).toBe("no_terms")
    })
})
