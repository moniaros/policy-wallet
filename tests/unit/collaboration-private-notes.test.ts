import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
    db: {
        collaborationMessage: { create: vi.fn() },
        collaborationThread: { update: vi.fn() },
    },
}))

import { db } from "@/lib/db"
import { collaborationService } from "@/lib/services/collaboration.service"

/**
 * Audit finding F-12 (escalated: this turned out to be a confidentiality
 * defect, not a fencing gap).
 *
 * CollaborationTimeline has always posted `isPrivate: true` when an advisor
 * ticks "private note". The route schema never accepted the field, so Zod
 * stripped it, `addMessage` never received it, and the message was written with
 * isPrivate defaulting to false — visible to the policyholder. An advisor wrote
 * internal commentary about a client believing it was private, and the client
 * could read it.
 *
 * Two further leaks sat behind it: a private note would have flipped the thread
 * to "waiting for the policyholder", and the notification body carries the first
 * 140 characters of the message — so the note would have leaked its own contents
 * to the person it was hidden from.
 */

const AGENT = "agent-1"
const CUSTOMER = "cust-1"

const thread = {
    id: "thr-1",
    status: "open",
    relationshipId: "rel-1",
    relationship: { agentUserId: AGENT, policyholderUserId: CUSTOMER },
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.collaborationMessage.create).mockResolvedValue({ id: "msg-1" } as any)
    vi.mocked(db.collaborationThread.update).mockResolvedValue({} as any)
    vi.spyOn(collaborationService as any, "assertThreadAccess").mockResolvedValue(thread)
    vi.spyOn(collaborationService as any, "notifyCollabParticipant").mockResolvedValue(undefined)
})

describe("collaborationService.addMessage — private notes", () => {
    it("persists isPrivate when the thread's agent marks a note private", async () => {
        await collaborationService.addMessage(AGENT, "agent", "thr-1", "client is price sensitive", true)

        expect(db.collaborationMessage.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ isPrivate: true }),
            })
        )
    })

    it("defaults to a public message when privacy is not requested", async () => {
        await collaborationService.addMessage(AGENT, "agent", "thr-1", "hello")

        expect(db.collaborationMessage.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ isPrivate: false }),
            })
        )
    })

    it("does NOT notify the policyholder about a private note", async () => {
        await collaborationService.addMessage(AGENT, "agent", "thr-1", "internal: chase renewal", true)

        // The notification body is message.slice(0,140) — sending it would leak
        // the private note's own text to the person it is hidden from.
        expect((collaborationService as any).notifyCollabParticipant).not.toHaveBeenCalled()
    })

    it("still notifies for a normal message", async () => {
        await collaborationService.addMessage(AGENT, "agent", "thr-1", "your quote is ready")

        expect((collaborationService as any).notifyCollabParticipant).toHaveBeenCalledWith(
            expect.objectContaining({ recipientId: CUSTOMER })
        )
    })

    it("does not move the thread to waiting-on-policyholder for a private note", async () => {
        await collaborationService.addMessage(AGENT, "agent", "thr-1", "internal", true)

        const arg = vi.mocked(db.collaborationThread.update).mock.calls[0][0] as any
        // Only activity is touched: a status change is a promise to the client
        // that a reply is owed.
        expect(arg.data.status).toBeUndefined()
        expect(arg.data.lastActivityAt).toBeInstanceOf(Date)
    })

    it("does update status for a normal message", async () => {
        await collaborationService.addMessage(AGENT, "agent", "thr-1", "hello")

        const arg = vi.mocked(db.collaborationThread.update).mock.calls[0][0] as any
        expect(arg.data.status).toBeDefined()
    })

    it("REFUSES a policyholder asking for a private note rather than downgrading it", async () => {
        // Failing closed matters: silently storing it as public is the original
        // defect. It would also hide the note from the advisor the thread exists
        // to reach.
        await expect(
            collaborationService.addMessage(CUSTOMER, "policyholder", "thr-1", "secret", true)
        ).rejects.toThrow("Forbidden")

        expect(db.collaborationMessage.create).not.toHaveBeenCalled()
    })

    it("lets a policyholder post a normal message", async () => {
        await expect(
            collaborationService.addMessage(CUSTOMER, "policyholder", "thr-1", "thanks!")
        ).resolves.toBeTruthy()
    })
})
