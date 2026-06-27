import { describe, it, expect, vi, beforeEach } from "vitest"
import { resolvePolicyAccess } from "@/lib/services/authorization"

/**
 * Locks in the exact semantics of the owner-or-grant authorization check that
 * was previously hand-rolled in gap-analysis.service.ts. The helper takes an
 * injectable client, so we pass a stub and assert both the decision and the
 * query ordering (no wasted/extra DB calls).
 */
function makeClient(opts: { grant?: unknown; relationship?: unknown } = {}) {
    const accessGrantFindFirst = vi.fn().mockResolvedValue(opts.grant ?? null)
    const customerRelationshipFindFirst = vi.fn().mockResolvedValue(opts.relationship ?? null)
    return {
        client: {
            accessGrant: { findFirst: accessGrantFindFirst },
            customerRelationship: { findFirst: customerRelationshipFindFirst },
        } as any,
        accessGrantFindFirst,
        customerRelationshipFindFirst,
    }
}

describe("resolvePolicyAccess", () => {
    beforeEach(() => vi.clearAllMocks())

    it("allows the owner without querying the database", async () => {
        const { client, accessGrantFindFirst, customerRelationshipFindFirst } = makeClient()
        const res = await resolvePolicyAccess("user-1", "user-1", { includeAgentRelationship: true }, client)
        expect(res).toEqual({ isOwner: true, hasGrant: false, hasAgentRelationship: false, allowed: true })
        expect(accessGrantFindFirst).not.toHaveBeenCalled()
        expect(customerRelationshipFindFirst).not.toHaveBeenCalled()
    })

    it("allows a non-owner with an active grant", async () => {
        const { client } = makeClient({ grant: { id: "g1" } })
        const res = await resolvePolicyAccess("owner", "agent", {}, client)
        expect(res.allowed).toBe(true)
        expect(res.hasGrant).toBe(true)
    })

    it("denies a non-owner with no grant when relationship is not requested", async () => {
        const { client, customerRelationshipFindFirst } = makeClient({ relationship: { id: "r1" } })
        const res = await resolvePolicyAccess("owner", "agent", {}, client)
        expect(res.allowed).toBe(false)
        // relationship must NOT be consulted unless explicitly requested
        expect(customerRelationshipFindFirst).not.toHaveBeenCalled()
    })

    it("allows a non-owner via agent relationship only when requested and no grant", async () => {
        const { client, customerRelationshipFindFirst } = makeClient({ relationship: { id: "r1" } })
        const res = await resolvePolicyAccess("owner", "agent", { includeAgentRelationship: true }, client)
        expect(res.allowed).toBe(true)
        expect(res.hasAgentRelationship).toBe(true)
        expect(customerRelationshipFindFirst).toHaveBeenCalledOnce()
    })

    it("does not query the relationship when an active grant already exists", async () => {
        const { client, customerRelationshipFindFirst } = makeClient({ grant: { id: "g1" }, relationship: { id: "r1" } })
        const res = await resolvePolicyAccess("owner", "agent", { includeAgentRelationship: true }, client)
        expect(res.allowed).toBe(true)
        expect(res.hasGrant).toBe(true)
        expect(customerRelationshipFindFirst).not.toHaveBeenCalled()
    })

    it("narrows the grant query to the policy scope when policyScopeId is given", async () => {
        const { client, accessGrantFindFirst } = makeClient({ grant: { id: "g1" } })
        const res = await resolvePolicyAccess("owner", "agent", { policyScopeId: "pol-1" }, client)
        expect(res.allowed).toBe(true)
        expect(accessGrantFindFirst).toHaveBeenCalledWith({
            where: { granterUserId: "owner", granteeUserId: "agent", status: "active", scope: "policy:pol-1" },
        })
    })

    it("omits the scope filter entirely when policyScopeId is not given", async () => {
        const { client, accessGrantFindFirst } = makeClient({ grant: { id: "g1" } })
        await resolvePolicyAccess("owner", "agent", {}, client)
        expect(accessGrantFindFirst).toHaveBeenCalledWith({
            where: { granterUserId: "owner", granteeUserId: "agent", status: "active" },
        })
    })

    it("denies a non-owner with neither grant nor relationship", async () => {
        const { client } = makeClient()
        const res = await resolvePolicyAccess("owner", "agent", { includeAgentRelationship: true }, client)
        expect(res.allowed).toBe(false)
        expect(res).toMatchObject({ isOwner: false, hasGrant: false, hasAgentRelationship: false })
    })
})
