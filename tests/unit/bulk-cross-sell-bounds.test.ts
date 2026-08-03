import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
    db: {
        customerRelationship: { findMany: vi.fn() },
    },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

import { db } from "@/lib/db"

/**
 * Audit finding F-06. `runBulkCrossSell` shipped for months with zero UI
 * callers. Exposing it means one advisor click now walks the book, so the
 * sweep must be bounded: the loop is sequential and writes as it goes, and an
 * unbounded agency book would hold a server action past the platform timeout
 * and leave a half-finished pass behind.
 */

const mockFindMany = vi.mocked(db.customerRelationship.findMany)

beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
})

async function loadService() {
    // Imported lazily so the per-customer path can be stubbed per test.
    return import("@/lib/services/cross-sell.service")
}

function relationships(n: number) {
    return Array.from({ length: n }, (_, i) => ({ policyholderUserId: `cust-${i}` }))
}

describe("runBulkCrossSell — bounds", () => {
    it("asks the database for at most cap + 1 rows", async () => {
        mockFindMany.mockResolvedValue([] as any)
        const { runBulkCrossSell, BULK_CROSS_SELL_MAX_CUSTOMERS } = await loadService()

        await runBulkCrossSell("agent-1")

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: BULK_CROSS_SELL_MAX_CUSTOMERS + 1 })
        )
    })

    it("orders oldest-first so repeated runs advance through a large book", async () => {
        mockFindMany.mockResolvedValue([] as any)
        const { runBulkCrossSell } = await loadService()

        await runBulkCrossSell("agent-1")

        // Without a stable order, a book past the cap would re-scan the same
        // head every run and never reach the tail.
        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { createdAt: "asc" } })
        )
    })

    it("reports truncated when the book exceeds the cap", async () => {
        mockFindMany.mockResolvedValue(relationships(6) as any)
        const { runBulkCrossSell } = await loadService()
        const runForCustomer = vi.fn().mockResolvedValue({
            missingLines: [],
            opportunitiesCreated: 0,
        })

        const result = await runBulkCrossSell("agent-1", { maxCustomers: 5, runForCustomer } as any)

        expect(result.truncated).toBe(true)
        expect(result.customersAnalyzed).toBe(5)
    })

    it("is not truncated when the book fits", async () => {
        mockFindMany.mockResolvedValue(relationships(3) as any)
        const { runBulkCrossSell } = await loadService()
        const runForCustomer = vi.fn().mockResolvedValue({
            missingLines: [],
            opportunitiesCreated: 0,
        })

        const result = await runBulkCrossSell("agent-1", { maxCustomers: 5, runForCustomer } as any)

        expect(result.truncated).toBe(false)
        expect(result.customersAnalyzed).toBe(3)
    })

    it("never accepts a cap below 1", async () => {
        mockFindMany.mockResolvedValue([] as any)
        const { runBulkCrossSell } = await loadService()

        await runBulkCrossSell("agent-1", { maxCustomers: 0 })

        expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }))
    })

    it("keeps going when one customer fails, rather than aborting the sweep", async () => {
        mockFindMany.mockResolvedValue(relationships(3) as any)
        const { runBulkCrossSell } = await loadService()
        const runForCustomer = vi.fn()
            .mockResolvedValueOnce({ missingLines: ["home"], opportunitiesCreated: 1 })
            .mockRejectedValueOnce(new Error("boom"))
            .mockResolvedValueOnce({ missingLines: ["life"], opportunitiesCreated: 1 })

        const result = await runBulkCrossSell("agent-1", { runForCustomer } as any)

        expect(result.customersAnalyzed).toBe(2)
        expect(result.opportunitiesCreated).toBe(2)
    })
})
