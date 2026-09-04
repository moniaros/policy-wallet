/**
 * `closeReviewsByPolicyEvidence` — the service half of "evidence closes a
 * review" (docs/planning/PERSONAL_RISK_PROFILE.md §I), against a fake client.
 *
 * The pure matrix (same sphere closes, another stays, not-held closes nothing,
 * closed rows untouched) lives in tests/unit/risk-review-policy.test.ts. This
 * file pins what the SERVICE adds: the row it writes, the owner scoping, the
 * `life_event` sphere resolved through the causing business event, idempotence,
 * and that it never throws.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const dbMock = vi.hoisted(() => ({
    policy: { findUnique: vi.fn() },
    riskReview: { findMany: vi.fn(), updateMany: vi.fn() },
    businessEvent: { findMany: vi.fn() },
    protectionScore: { findUnique: vi.fn() },
}))
vi.mock("@/lib/db", () => ({ db: dbMock }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

import { closeReviewsByPolicyEvidence } from "@/lib/services/risk-review/service"
import { REVIEW_OUTCOME_POLICY_EVIDENCE } from "@/lib/services/risk-review/evidence"

const NEXT_YEAR = new Date(Date.now() + 200 * 24 * 3600_000)
const LAST_YEAR = new Date(Date.now() - 200 * 24 * 3600_000)

function policyRow(over: Partial<{ lineOfBusiness: string; endDate: Date; status: string }> = {}) {
    return {
        ownerUserId: "owner-1",
        lineOfBusiness: "life",
        status: "active",
        endDate: NEXT_YEAR,
        acordData: null,
        policyNumber: "LIFE-1",
        insurerName: "Ethniki",
        ...over,
    }
}

beforeEach(() => {
    for (const table of Object.values(dbMock)) for (const fn of Object.values(table)) fn.mockReset()
    dbMock.protectionScore.findUnique.mockResolvedValue({ overallScore: 61 })
    dbMock.riskReview.updateMany.mockImplementation(async (args: any) => ({ count: args.where.id.in.length }))
    dbMock.businessEvent.findMany.mockResolvedValue([])
})

describe("closeReviewsByPolicyEvidence", () => {
    it("closes the open review for the policy's sphere with the evidence outcome, scoped to the owner", async () => {
        dbMock.policy.findUnique.mockResolvedValue(policyRow())
        dbMock.riskReview.findMany.mockResolvedValue([
            { id: "rv-birth", status: "open", trigger: "child_born", causedByEventId: "evt-1" },
        ])

        const outcome = await closeReviewsByPolicyEvidence({ policyId: "pol-1" })

        expect(outcome).toEqual({ closed: 1, reason: "closed" })
        expect(dbMock.riskReview.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: "owner-1", status: "open" } })
        )
        const [call] = dbMock.riskReview.updateMany.mock.calls
        expect(call[0].where).toEqual({ id: { in: ["rv-birth"] }, userId: "owner-1", status: "open" })
        expect(call[0].data.status).toBe("completed")
        expect(call[0].data.outcome).toBe(REVIEW_OUTCOME_POLICY_EVIDENCE)
        expect(call[0].data.outcome).toBe("policy_evidence")
        expect(call[0].data.scoreAtClose).toBe(61)
        expect(call[0].data.completedAt).toBeInstanceOf(Date)
    })

    it("leaves a review for another sphere open, and never touches the whole-picture reviews", async () => {
        dbMock.policy.findUnique.mockResolvedValue(policyRow({ lineOfBusiness: "motor" }))
        dbMock.riskReview.findMany.mockResolvedValue([
            { id: "rv-birth", status: "open", trigger: "child_born", causedByEventId: null },
            { id: "rv-annual", status: "open", trigger: "annual", causedByEventId: null },
            { id: "rv-mortgage", status: "open", trigger: "mortgage_added", causedByEventId: null },
        ])

        const outcome = await closeReviewsByPolicyEvidence({ policyId: "pol-1" })

        expect(outcome.closed).toBe(0)
        expect(dbMock.riskReview.updateMany).not.toHaveBeenCalled()
    })

    it("an expired policy is not evidence — nothing closes", async () => {
        dbMock.policy.findUnique.mockResolvedValue(policyRow({ endDate: LAST_YEAR }))
        dbMock.riskReview.findMany.mockResolvedValue([
            { id: "rv-birth", status: "open", trigger: "child_born", causedByEventId: null },
        ])

        const outcome = await closeReviewsByPolicyEvidence({ policyId: "pol-1" })

        expect(outcome).toEqual({ closed: 0, reason: "not_held" })
        expect(dbMock.riskReview.updateMany).not.toHaveBeenCalled()
    })

    it("resolves the generic life_event sphere through the causing event's definitionId", async () => {
        dbMock.policy.findUnique.mockResolvedValue(policyRow({ lineOfBusiness: "pet" }))
        dbMock.riskReview.findMany.mockResolvedValue([
            { id: "rv-pet", status: "open", trigger: "life_event", causedByEventId: "evt-pet" },
            { id: "rv-orphan", status: "open", trigger: "life_event", causedByEventId: null },
            { id: "rv-vehicle", status: "open", trigger: "life_event", causedByEventId: "evt-car" },
        ])
        dbMock.businessEvent.findMany.mockResolvedValue([
            { id: "evt-pet", payload: { definitionId: "pet_adoption" } },
            { id: "evt-car", payload: { definitionId: "vehicle_purchase" } },
        ])

        const outcome = await closeReviewsByPolicyEvidence({ policyId: "pol-1" })

        expect(outcome.closed).toBe(1)
        expect(dbMock.businessEvent.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: { in: ["evt-pet", "evt-car"] } } })
        )
        expect(dbMock.riskReview.updateMany.mock.calls[0][0].where.id).toEqual({ in: ["rv-pet"] })
    })

    it("is idempotent: once closed, a second completion finds nothing open", async () => {
        dbMock.policy.findUnique.mockResolvedValue(policyRow())
        dbMock.riskReview.findMany
            .mockResolvedValueOnce([{ id: "rv-birth", status: "open", trigger: "child_born", causedByEventId: null }])
            .mockResolvedValueOnce([])

        expect((await closeReviewsByPolicyEvidence({ policyId: "pol-1" })).closed).toBe(1)
        expect(await closeReviewsByPolicyEvidence({ policyId: "pol-1" })).toEqual({ closed: 0, reason: "nothing_open" })
        expect(dbMock.riskReview.updateMany).toHaveBeenCalledTimes(1)
    })

    it("a line that answers no sphere (the residual `other`) closes nothing", async () => {
        dbMock.policy.findUnique.mockResolvedValue(policyRow({ lineOfBusiness: "other" }))
        dbMock.riskReview.findMany.mockResolvedValue([
            { id: "rv-pet", status: "open", trigger: "life_event", causedByEventId: "evt-pet" },
        ])

        expect(await closeReviewsByPolicyEvidence({ policyId: "pol-1" })).toEqual({ closed: 0, reason: "no_domain" })
        expect(dbMock.riskReview.findMany).not.toHaveBeenCalled()
    })

    it("never throws — a review is a prompt, not a precondition of the analysis", async () => {
        dbMock.policy.findUnique.mockRejectedValue(new Error("connection reset"))
        await expect(closeReviewsByPolicyEvidence({ policyId: "pol-1" })).resolves.toEqual({ closed: 0, reason: "error" })
    })
})
