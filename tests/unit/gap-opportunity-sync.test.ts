/**
 * WP-07 — detected gaps become agent opportunities without anyone pressing a
 * button.
 *
 * Opportunity rows were only ever created by an EXPLICIT cross-sell run, so the
 * agent dashboard's pipeline value read €0 however many gaps an analysis found.
 * The whole "the agent watches the opportunity appear" story did not work
 * because nothing made it appear.
 *
 * The three properties that matter are all ways this could go wrong quietly:
 * raising opportunities on policies the agent was never allowed to see,
 * duplicating them on every re-analysis, and spending an LLM call on a hot path
 * for text the gap already carries.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const accessGrantFindMany = vi.fn()
const policyFindUnique = vi.fn()
const gapFindMany = vi.fn()
const relationshipFindMany = vi.fn()
const opportunityFindMany = vi.fn()
const opportunityCreate = vi.fn()
const notificationCreate = vi.fn()

vi.mock("@/lib/db", () => ({
    db: {
        policy: { findUnique: (...a: unknown[]) => policyFindUnique(...a) },
        accessGrant: { findMany: (...a: unknown[]) => accessGrantFindMany(...a) },
        gapInstance: { findMany: (...a: unknown[]) => gapFindMany(...a) },
        customerRelationship: { findMany: (...a: unknown[]) => relationshipFindMany(...a) },
        opportunity: {
            findMany: (...a: unknown[]) => opportunityFindMany(...a),
            create: (...a: unknown[]) => opportunityCreate(...a),
        },
        notificationEvent: { create: (...a: unknown[]) => notificationCreate(...a) },
    },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

const OWNER = "owner-1"
const AGENT = "agent-1"

function scenario(opts: {
    createdBy?: string | null
    grants?: string[]
    gaps?: number
    relationships?: boolean
    existing?: Array<{ relationshipId: string; gapInstanceId: string }>
}) {
    policyFindUnique.mockResolvedValue({
        id: "policy-1",
        ownerUserId: OWNER,
        createdByUserId: opts.createdBy === undefined ? null : opts.createdBy,
        lineOfBusiness: "motor",
    })
    accessGrantFindMany.mockResolvedValue((opts.grants ?? []).map((granteeUserId) => ({ granteeUserId })))
    gapFindMany.mockResolvedValue(
        Array.from({ length: opts.gaps ?? 0 }, (_, i) => ({
            id: `gap-${i}`,
            severity: "high",
            aiExplanation: `Gap ${i} explanation`,
            aiExplanationEl: `Εξήγηση ${i}`,
        }))
    )
    relationshipFindMany.mockResolvedValue(
        opts.relationships === false ? [] : [{ id: "rel-1", agentUserId: AGENT }]
    )
    opportunityFindMany.mockResolvedValue(opts.existing ?? [])
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("syncOpportunitiesForPolicy", () => {
    it("creates an opportunity per gap for an agent holding a policy grant", async () => {
        scenario({ grants: [AGENT], gaps: 2 })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )

        const result = await syncOpportunitiesForPolicy("policy-1")

        expect(result.created).toBe(2)
        expect(opportunityCreate).toHaveBeenCalledTimes(2)
    })

    it("raises nothing when the agent has no visibility of the policy", async () => {
        // A relationship is created unilaterally by the agent and is NOT
        // permission. Without a grant or their own upload, they see nothing —
        // so there is nothing to sell against either.
        scenario({ grants: [], createdBy: null, gaps: 3 })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )

        expect((await syncOpportunitiesForPolicy("policy-1")).created).toBe(0)
        expect(opportunityCreate).not.toHaveBeenCalled()
    })

    it("counts the uploading agent as having visibility", async () => {
        scenario({ grants: [], createdBy: AGENT, gaps: 1 })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )

        expect((await syncOpportunitiesForPolicy("policy-1")).created).toBe(1)
    })

    it("does not treat the owner's own upload as an agent opportunity", async () => {
        scenario({ grants: [], createdBy: OWNER, gaps: 2 })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )

        expect((await syncOpportunitiesForPolicy("policy-1")).created).toBe(0)
    })

    it("does not duplicate on re-analysis", async () => {
        // Without dedupe on gapInstanceId, every re-run would inflate the
        // agent's pipeline with copies of the same finding.
        scenario({
            grants: [AGENT],
            gaps: 2,
            existing: [
                { relationshipId: "rel-1", gapInstanceId: "gap-0" },
                { relationshipId: "rel-1", gapInstanceId: "gap-1" },
            ],
        })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )

        expect((await syncOpportunitiesForPolicy("policy-1")).created).toBe(0)
        expect(opportunityCreate).not.toHaveBeenCalled()
    })

    it("creates only the gaps that are new since last time", async () => {
        scenario({
            grants: [AGENT],
            gaps: 3,
            existing: [{ relationshipId: "rel-1", gapInstanceId: "gap-0" }],
        })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )

        expect((await syncOpportunitiesForPolicy("policy-1")).created).toBe(2)
    })

    it("links each opportunity back to its gap", async () => {
        scenario({ grants: [AGENT], gaps: 1 })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )
        await syncOpportunitiesForPolicy("policy-1")

        expect(opportunityCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ gapInstanceId: "gap-0", policyId: "policy-1" }),
            })
        )
    })

    it("reuses the gap's own explanation instead of calling a model", async () => {
        scenario({ grants: [AGENT], gaps: 1 })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )
        await syncOpportunitiesForPolicy("policy-1")

        const data = opportunityCreate.mock.calls[0][0].data
        expect(data.notes).toBe("Gap 0 explanation")
    })

    it("notifies the agent once, not once per gap", async () => {
        scenario({ grants: [AGENT], gaps: 4 })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )
        await syncOpportunitiesForPolicy("policy-1")

        expect(notificationCreate).toHaveBeenCalledTimes(1)
    })

    it("keeps the notification free of personal contact details", async () => {
        scenario({ grants: [AGENT], gaps: 1 })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )
        await syncOpportunitiesForPolicy("policy-1")

        const payload = JSON.stringify(notificationCreate.mock.calls[0][0])
        expect(payload).toContain(AGENT)
        expect(payload).not.toMatch(/@/)
    })

    it("stays silent when the analysis found no gaps", async () => {
        scenario({ grants: [AGENT], gaps: 0 })
        const { syncOpportunitiesForPolicy } = await import(
            "@/lib/services/gap-engine/gap-opportunity-sync"
        )

        expect((await syncOpportunitiesForPolicy("policy-1")).created).toBe(0)
        expect(notificationCreate).not.toHaveBeenCalled()
    })
})
