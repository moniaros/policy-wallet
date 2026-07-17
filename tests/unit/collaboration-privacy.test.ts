import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
    db: { collaborationThread: { findUnique: vi.fn() } },
}))
vi.mock("@/lib/notifications", () => ({ sendNotification: vi.fn() }))

import { collaborationService } from "@/lib/services/collaboration.service"
import { db } from "@/lib/db"

const THREAD = {
    id: "t1",
    relationship: { agentUserId: "agent-1", policyholderUserId: "cust-1" },
    participants: [{ userId: "cust-1" }, { userId: "agent-1" }],
    messages: [],
}

/** The include.messages of the second findUnique (the detail query). */
async function detailMessagesArg(userId: string, roles: string) {
    await collaborationService.getThreadDetail(userId, roles, "t1")
    const calls = vi.mocked(db.collaborationThread.findUnique).mock.calls
    return (calls[calls.length - 1][0] as any).include.messages
}

describe("getThreadDetail — private notes filtered server-side (B1)", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(db.collaborationThread.findUnique).mockResolvedValue(THREAD as any)
    })

    it("policyholder viewer: isPrivate messages excluded at the DB layer", async () => {
        const messages = await detailMessagesArg("cust-1", "policyholder")
        expect(messages.where).toEqual({ isPrivate: false })
    })

    it("agent-on-the-relationship viewer: no filter (sees private notes)", async () => {
        const messages = await detailMessagesArg("agent-1", "agent")
        expect(messages.where).toBeUndefined()
    })

    it("admin viewer: no filter (full audit visibility)", async () => {
        const messages = await detailMessagesArg("some-admin", "admin")
        expect(messages.where).toBeUndefined()
    })

    it("a viewer with no access to the thread is denied entirely (null), not just filtered", async () => {
        // Not the relationship agent, not a participant → assertThreadAccess
        // returns null, so no detail query runs at all.
        const result = await collaborationService.getThreadDetail("agent-999", "agent", "t1")
        expect(result).toBeNull()
        // Only the access-check findUnique ran; no detail query.
        expect(vi.mocked(db.collaborationThread.findUnique).mock.calls).toHaveLength(1)
    })
})
