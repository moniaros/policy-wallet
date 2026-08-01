import { describe, it, expect, vi } from "vitest"
import {
    buildCloseFields,
    recordStageTransition,
    lostOutcomeFromDeclineReason,
    reportingCloseDate,
    PROPOSAL_DECLINE_TO_LOST_OUTCOME,
} from "@/lib/agent/opportunity-lifecycle"
import {
    isTerminalOpportunityStatus,
    isOpportunityOutcomeFor,
    OPPORTUNITY_LOST_OUTCOMES,
} from "@/types/enums"

function fakeWriter() {
    return {
        opportunityStageHistory: { create: vi.fn().mockResolvedValue({}) },
    }
}

describe("buildCloseFields", () => {
    const now = new Date("2026-08-01T10:00:00Z")

    it("stamps outcome + close date when moving to a terminal stage", () => {
        const fields = buildCloseFields("lost", "too_expensive", "  went with a cheaper quote  ", now)
        expect(fields).toEqual({
            outcome: "too_expensive",
            outcomeNotes: "went with a cheaper quote",
            outcomeAt: now,
        })
    })

    it("leaves non-terminal stages unstamped", () => {
        for (const stage of ["open", "contacted", "quoted", "on_hold"] as const) {
            expect(buildCloseFields(stage, "too_expensive", "note", now)).toEqual({
                outcome: null,
                outcomeNotes: null,
                outcomeAt: null,
            })
        }
    })

    it("CLEARS the close when a deal is reopened out of a terminal stage", () => {
        // A deal marked lost then reopened must not keep a stale outcomeAt, or it
        // double-counts in won/lost reporting.
        expect(buildCloseFields("open", null, null, now).outcomeAt).toBeNull()
        expect(buildCloseFields("contacted", "too_expensive", "stale", now).outcome).toBeNull()
    })

    it("drops an outcome that does not belong to the target stage", () => {
        // A wrong reason is worse than none.
        expect(buildCloseFields("won", "too_expensive", null, now).outcome).toBeNull()
        expect(buildCloseFields("lost", "proposal_accepted", null, now).outcome).toBeNull()
        expect(buildCloseFields("won", "proposal_accepted", null, now).outcome).toBe("proposal_accepted")
    })

    it("still records the close date when no reason was given", () => {
        const fields = buildCloseFields("won", null, null, now)
        expect(fields.outcome).toBeNull()
        expect(fields.outcomeAt).toEqual(now)
    })

    it("normalizes blank notes to null", () => {
        expect(buildCloseFields("lost", "other", "   ", now).outcomeNotes).toBeNull()
    })
})

describe("recordStageTransition", () => {
    it("appends one row per real transition", async () => {
        const writer = fakeWriter()
        const wrote = await recordStageTransition(writer, {
            opportunityId: "opp-1",
            fromStatus: "open",
            toStatus: "quoted",
            changedByUserId: "agent-1",
            note: "  sent the quote  ",
        })

        expect(wrote).toBe(true)
        expect(writer.opportunityStageHistory.create).toHaveBeenCalledTimes(1)
        expect(writer.opportunityStageHistory.create.mock.calls[0]![0].data).toMatchObject({
            opportunityId: "opp-1",
            fromStatus: "open",
            toStatus: "quoted",
            changedByUserId: "agent-1",
            note: "sent the quote",
            outcome: null,
        })
    })

    it("is a no-op when the stage did not change", async () => {
        // Re-saving a deal without moving it must not manufacture funnel movement.
        const writer = fakeWriter()
        const wrote = await recordStageTransition(writer, {
            opportunityId: "opp-1",
            fromStatus: "quoted",
            toStatus: "quoted",
        })

        expect(wrote).toBe(false)
        expect(writer.opportunityStageHistory.create).not.toHaveBeenCalled()
    })

    it("records creation of a deal that is born closed (fromStatus null)", async () => {
        const writer = fakeWriter()
        await recordStageTransition(writer, {
            opportunityId: "opp-2",
            fromStatus: null,
            toStatus: "won",
            outcome: "proposal_accepted",
        })

        expect(writer.opportunityStageHistory.create.mock.calls[0]![0].data).toMatchObject({
            fromStatus: null,
            toStatus: "won",
            outcome: "proposal_accepted",
        })
    })

    it("keeps an outcome only on terminal transitions", async () => {
        const writer = fakeWriter()
        await recordStageTransition(writer, {
            opportunityId: "opp-3",
            fromStatus: "open",
            toStatus: "contacted",
            outcome: "too_expensive",
        })

        expect(writer.opportunityStageHistory.create.mock.calls[0]![0].data.outcome).toBeNull()
    })

    it("defaults system-driven transitions to a null actor", async () => {
        const writer = fakeWriter()
        await recordStageTransition(writer, {
            opportunityId: "opp-4",
            fromStatus: "open",
            toStatus: "lost",
            outcome: "unresponsive",
        })

        const data = writer.opportunityStageHistory.create.mock.calls[0]![0].data
        expect(data.changedByUserId).toBeNull()
        expect(data.outcome).toBe("unresponsive")
    })
})

describe("lostOutcomeFromDeclineReason", () => {
    it("maps every reason the decline UI collects onto a real loss reason", () => {
        // These four are the taxonomy the proposal-response UI already gathers.
        for (const reason of ["too_expensive", "not_needed", "prefer_different", "other"]) {
            const mapped = lostOutcomeFromDeclineReason(reason)
            expect(PROPOSAL_DECLINE_TO_LOST_OUTCOME[reason]).toBe(mapped)
            expect(OPPORTUNITY_LOST_OUTCOMES).toContain(mapped)
        }
    })

    it("falls back to `other` for missing or unknown input", () => {
        expect(lostOutcomeFromDeclineReason(undefined)).toBe("other")
        expect(lostOutcomeFromDeclineReason(null)).toBe("other")
        expect(lostOutcomeFromDeclineReason("")).toBe("other")
        expect(lostOutcomeFromDeclineReason("not_a_real_reason")).toBe("other")
    })
})

describe("reportingCloseDate", () => {
    const outcomeAt = new Date("2026-02-10T00:00:00Z")
    const updatedAt = new Date("2026-07-30T00:00:00Z")

    it("prefers the immutable close date", () => {
        // The whole point: a note edited in July must not move February revenue.
        expect(reportingCloseDate({ outcomeAt, updatedAt })).toEqual(outcomeAt)
    })

    it("falls back to updatedAt for rows closed before outcomeAt existed", () => {
        expect(reportingCloseDate({ outcomeAt: null, updatedAt })).toEqual(updatedAt)
        expect(reportingCloseDate({ updatedAt })).toEqual(updatedAt)
    })
})

describe("terminal-stage enum guards", () => {
    it("treats exactly won and lost as terminal", () => {
        expect(isTerminalOpportunityStatus("won")).toBe(true)
        expect(isTerminalOpportunityStatus("lost")).toBe(true)
        for (const stage of ["open", "contacted", "quoted", "on_hold", "nonsense"]) {
            expect(isTerminalOpportunityStatus(stage)).toBe(false)
        }
    })

    it("scopes outcomes to the stage they belong to", () => {
        expect(isOpportunityOutcomeFor("won", "cross_sell")).toBe(true)
        expect(isOpportunityOutcomeFor("won", "competitor")).toBe(false)
        expect(isOpportunityOutcomeFor("lost", "competitor")).toBe(true)
        expect(isOpportunityOutcomeFor("lost", "cross_sell")).toBe(false)
    })
})
