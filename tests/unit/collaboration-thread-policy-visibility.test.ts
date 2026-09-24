import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
    db: {
        collaborationThread: { findUnique: vi.fn(), create: vi.fn(async () => ({ id: "t1" })) },
        customerRelationship: { findUnique: vi.fn() },
        policy: { findFirst: vi.fn() },
        accessGrant: { findMany: vi.fn(async () => []) },
        notificationEvent: { create: vi.fn() },
    },
}))
vi.mock("@/lib/notifications", () => ({ sendNotification: vi.fn() }))

import { collaborationService } from "@/lib/services/collaboration.service"
import { db } from "@/lib/db"

/**
 * Prevention brief — the one BROKEN/insecure finding: createThread accepted any
 * policyId, so a customer's thread could name a policy their advisor was never
 * shown. The policy must belong to the relationship's customer AND pass the
 * agent visibility rule.
 */
describe("createThread refuses a policy the advisor cannot see", () => {
    const rel = { id: "rel-1", agentUserId: "agent-1", policyholderUserId: "cust-1", status: "active" }
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(db.customerRelationship.findUnique).mockResolvedValue(rel as any)
    })

    it("invisible policy → rejected, nothing written", async () => {
        vi.mocked(db.policy.findFirst).mockResolvedValue(null)
        await expect(
            collaborationService.createThread("cust-1", "policyholder", { relationshipId: "rel-1", policyId: "p-private", subject: "x" } as any)
        ).rejects.toThrow("Policy not visible to this advisor")
        expect(db.collaborationThread.create).not.toHaveBeenCalled()
        const where = (vi.mocked(db.policy.findFirst).mock.calls[0][0] as any).where
        expect(where).toMatchObject({ id: "p-private", ownerUserId: "cust-1" })
        expect(where.OR).toBeDefined()
    })

    it("visible policy → allowed to proceed to the write", async () => {
        vi.mocked(db.policy.findFirst).mockResolvedValue({ id: "p-shared" } as any)
        await collaborationService.createThread("cust-1", "policyholder", { relationshipId: "rel-1", policyId: "p-shared", subject: "x" } as any).catch(() => undefined)
        expect(db.collaborationThread.create).toHaveBeenCalled()
    })

    it("no policy named → no visibility query", async () => {
        await collaborationService.createThread("cust-1", "policyholder", { relationshipId: "rel-1", subject: "x" } as any).catch(() => undefined)
        expect(db.policy.findFirst).not.toHaveBeenCalled()
    })
})
