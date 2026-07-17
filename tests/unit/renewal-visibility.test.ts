import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mock the side-effecting deps BEFORE importing the service ──
vi.mock("@/lib/db", () => ({
    db: {
        policy: { findMany: vi.fn() },
        policyRenewal: {
            findUnique: vi.fn(async () => null),
            create: vi.fn(async (args: any) => ({ id: "renewal-1", ...args.data })),
            update: vi.fn(async () => ({})),
            updateMany: vi.fn(async () => ({ count: 0 })),
        },
        customerRelationship: { findFirst: vi.fn() },
        // getGrantedPolicyIds (real) reads this — return no grants by default.
        accessGrant: { findMany: vi.fn(async () => []) },
        userTask: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})) },
    },
}))
vi.mock("@/lib/notifications", () => ({ sendNotification: vi.fn(async () => {}) }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
vi.mock("@/lib/subscription-entitlements", () => ({
    // Owner gets the full milestone ladder so a reminder actually fires.
    resolveUserEntitlements: vi.fn(async () => ({ limits: { notifications: true } })),
}))

import { runRenewalCheck } from "@/lib/services/renewal.service"
import { db } from "@/lib/db"
import { sendNotification } from "@/lib/notifications"

const AGENT = "agent-1"
const CUSTOMER = "cust-1"

function expiringPolicy(createdByUserId: string) {
    return {
        id: "pol-1",
        ownerUserId: CUSTOMER,
        createdByUserId,
        status: "active",
        // ~20 days out → within the 90-day window, hits the 30-day milestone.
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        owner: { id: CUSTOMER, name: "Cust", email: "c@x.gr", preferredLanguage: "en" },
    }
}

describe("runRenewalCheck — agent notifications respect policy visibility (A1)", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(db.policyRenewal.findUnique).mockResolvedValue(null as any)
        vi.mocked(db.policyRenewal.create).mockImplementation(
            ((args: any) => Promise.resolve({ id: "renewal-1", ...args.data })) as any
        )
        vi.mocked(db.accessGrant.findMany).mockResolvedValue([] as any)
        vi.mocked(db.userTask.findFirst).mockResolvedValue(null as any)
        // A relationship exists between this customer and the agent.
        vi.mocked(db.customerRelationship.findFirst).mockResolvedValue({ agentUserId: AGENT } as any)
    })

    it("does NOT notify the agent about a policy the CUSTOMER uploaded (no grant)", async () => {
        // createdByUserId = customer, no AccessGrant → not visible to the agent.
        vi.mocked(db.policy.findMany).mockResolvedValue([expiringPolicy(CUSTOMER)] as any)

        const summary = await runRenewalCheck()

        expect(summary.policyholderNotificationsSent).toBe(1) // owner still reminded
        expect(summary.agentNotificationsSent).toBe(0)        // agent NOT told
        expect(summary.agentTasksCreated).toBe(0)
        // The renewal record links no agent for a non-visible policy.
        expect(db.policyRenewal.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ agentUserId: null }) })
        )
        // No agent-side notification/task write.
        expect(db.userTask.create).not.toHaveBeenCalled()
    })

    it("DOES notify the agent about a policy the AGENT uploaded (createdByUserId = agent)", async () => {
        vi.mocked(db.policy.findMany).mockResolvedValue([expiringPolicy(AGENT)] as any)

        const summary = await runRenewalCheck()

        expect(summary.agentNotificationsSent).toBe(1)
        expect(summary.agentTasksCreated).toBe(1)
        expect(db.policyRenewal.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ agentUserId: AGENT }) })
        )
    })

    it("DOES notify the agent when they hold an active policy-scoped grant", async () => {
        // Customer-uploaded policy, but the agent has a grant for it.
        vi.mocked(db.policy.findMany).mockResolvedValue([expiringPolicy(CUSTOMER)] as any)
        vi.mocked(db.accessGrant.findMany).mockResolvedValue([{ scope: "policy:pol-1" }] as any)

        const summary = await runRenewalCheck()

        expect(summary.agentNotificationsSent).toBe(1)
    })
})
