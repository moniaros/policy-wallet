import { beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("@/lib/db", () => ({ db: {
    tenantMembership: { findFirst: vi.fn(), findMany: vi.fn() },
    customerRelationship: { count: vi.fn() }, opportunity: { findMany: vi.fn() },
} }))
vi.mock("@/lib/notifications", () => ({ sendNotification: vi.fn() }))
vi.mock("@/lib/subscription-entitlements", () => ({ resolveAgentEntitlements: vi.fn() }))
import { db } from "@/lib/db"
import { getTeamOverview } from "@/lib/services/team.service"
beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.tenantMembership.findMany).mockResolvedValue(["self", "peer"].map(userId => ({
        id: userId, userId, role: "member", status: "active", joinedAt: null,
        user: { name: userId, email: `${userId}@example.test`, image: null },
    })) as never)
    vi.mocked(db.customerRelationship.count).mockResolvedValue(1)
    vi.mocked(db.opportunity.findMany).mockResolvedValue([
        { status: "open", estimatedPremium: 100 }, { status: "won", wonPremium: 250 },
    ] as never)
})
describe("team revenue presentation preserves server masking", () => {
    it.each(["owner", "manager", "member"])("states visible scope for %s", async role => {
        vi.mocked(db.tenantMembership.findFirst).mockResolvedValue({ role, tenantId: "agency", tenant: { name: "Agency" } } as never)
        const result = await getTeamOverview("self")
        expect(result?.viewerRole).toBe(role)
        expect(result?.revenueScope).toBe(role === "member" ? "own" : "team")
        expect(result?.members[0]).toMatchObject({ revenueVisible: true, pipelineValue: 100, wonValue: 250 })
        expect(result?.members[1]).toMatchObject(role === "member"
            ? { revenueVisible: false, pipelineValue: 0, wonValue: 0 }
            : { revenueVisible: true, pipelineValue: 100, wonValue: 250 })
        expect(result?.stats.totalWon).toBe(role === "member" ? 250 : 500)
    })
})
