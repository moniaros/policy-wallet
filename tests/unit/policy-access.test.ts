import { describe, it, expect } from "vitest"
import { computePolicyAccess, normalizePermissions } from "@/lib/policy-access"

const POLICY = { id: "pol_1", ownerUserId: "customer_1", createdByUserId: "agent_1" }

const owner = { id: "customer_1", roles: "policyholder" }
const agent = { id: "agent_1", roles: "agent" }
const stranger = { id: "someone_else", roles: "policyholder" }

function grant(permissions: string, overrides: Partial<{ scope: string; status: string }> = {}) {
    return { scope: `policy:${POLICY.id}`, permissions, status: "active", ...overrides }
}

function access(input: Partial<Parameters<typeof computePolicyAccess>[0]>) {
    return computePolicyAccess({
        policy: POLICY,
        viewer: stranger,
        grants: [],
        relationship: null,
        ...input,
    })
}

describe("normalizePermissions", () => {
    it("maps the legacy vocabulary", () => {
        expect(normalizePermissions("read")).toBe("read")
        expect(normalizePermissions("view")).toBe("read")
        expect(normalizePermissions("edit")).toBe("write")
        expect(normalizePermissions("manage")).toBe("manage")
    })

    it("takes the highest level from CSV values", () => {
        expect(normalizePermissions("read,edit")).toBe("write")
        expect(normalizePermissions("view,manage")).toBe("manage")
    })

    it("degrades unknown tokens to read", () => {
        expect(normalizePermissions("frobnicate")).toBe("read")
        expect(normalizePermissions("")).toBe("none")
    })
})

describe("computePolicyAccess — matrix", () => {
    it("missing policy → no access at all", () => {
        const a = access({ policy: null })
        expect(a.exists).toBe(false)
        expect(a.canRead).toBe(false)
        expect(a.canDelete).toBe(false)
    })

    it("owner → everything except nothing (full capabilities)", () => {
        const a = access({ viewer: owner })
        expect(a.isOwner).toBe(true)
        expect(a.canRead).toBe(true)
        expect(a.canWrite).toBe(true)
        expect(a.canManageDocuments).toBe(true)
        expect(a.canAnalyze).toBe(true)
        expect(a.canDelete).toBe(true)
    })

    it("stranger → nothing", () => {
        const a = access({})
        expect(a.canRead).toBe(false)
        expect(a.canWrite).toBe(false)
        expect(a.canAnalyze).toBe(false)
        expect(a.canDelete).toBe(false)
    })

    it("READ grant → read only, no write/analyze/delete", () => {
        const a = access({ grants: [grant("read")] })
        expect(a.grantLevel).toBe("read")
        expect(a.canRead).toBe(true)
        expect(a.canWrite).toBe(false)
        expect(a.canManageDocuments).toBe(false)
        expect(a.canAnalyze).toBe(false)
        expect(a.canDelete).toBe(false)
    })

    it("WRITE ('edit') grant → read+write+docs+analyze, no delete", () => {
        const a = access({ grants: [grant("edit")] })
        expect(a.grantLevel).toBe("write")
        expect(a.canWrite).toBe(true)
        expect(a.canManageDocuments).toBe(true)
        expect(a.canAnalyze).toBe(true)
        expect(a.canDelete).toBe(false)
    })

    it("MANAGE grant → full management including delete", () => {
        const a = access({ viewer: agent, grants: [grant("manage")] })
        expect(a.grantLevel).toBe("manage")
        expect(a.canWrite).toBe(true)
        expect(a.canAnalyze).toBe(true)
        expect(a.canDelete).toBe(true)
    })

    it("revoked grant confers nothing", () => {
        const a = access({ grants: [grant("manage", { status: "revoked" })] })
        expect(a.grantLevel).toBe("none")
        expect(a.canRead).toBe(false)
    })

    it("grant scoped to a DIFFERENT policy confers nothing (IDOR)", () => {
        const a = access({ grants: [grant("manage", { scope: "policy:other" })] })
        expect(a.grantLevel).toBe("none")
        expect(a.canRead).toBe(false)
    })

    it("portfolio / upload_only scopes confer nothing", () => {
        const a = access({
            grants: [grant("manage", { scope: "portfolio" }), grant("edit", { scope: "upload_only" })],
        })
        expect(a.canRead).toBe(false)
    })

    it("multiple grants: highest active policy-scoped level wins", () => {
        const a = access({
            grants: [grant("read"), grant("manage", { status: "revoked" }), grant("edit")],
        })
        expect(a.grantLevel).toBe("write")
    })

    it("agent reads a policy THEY uploaded for the customer (no grant needed)", () => {
        // POLICY.createdByUserId === agent_1 — the agent's own upload.
        const a = access({ viewer: agent, relationship: { status: "active" } })
        expect(a.hasAgentRelationship).toBe(true)
        expect(a.canRead).toBe(true)
        expect(a.canAnalyze).toBe(true)
        expect(a.canWrite).toBe(false)
        expect(a.canDelete).toBe(false)
    })

    // THE PRIVACY BUG: a relationship is created unilaterally by the agent (an
    // invite that was never accepted, or "add customer" by email). It must not
    // expose a single document the policyholder uploaded themselves.
    it("agent CANNOT read a policy the policyholder uploaded themselves", () => {
        const selfUploaded = { ...POLICY, createdByUserId: "customer_1" }
        const a = access({
            policy: selfUploaded,
            viewer: agent,
            relationship: { status: "active" },
        })
        expect(a.hasAgentRelationship).toBe(true)
        expect(a.canRead).toBe(false)
        expect(a.canAnalyze).toBe(false)
        expect(a.canWrite).toBe(false)
        expect(a.canDelete).toBe(false)
    })

    it("…unless the owner explicitly granted THAT policy", () => {
        const selfUploaded = { ...POLICY, createdByUserId: "customer_1" }
        const a = access({
            policy: selfUploaded,
            viewer: agent,
            relationship: { status: "active" },
            grants: [grant("read")],
        })
        expect(a.canRead).toBe(true)
        expect(a.canWrite).toBe(false)
    })

    it("a pending_activation relationship never widens what an agent sees", () => {
        const selfUploaded = { ...POLICY, createdByUserId: "customer_1" }
        expect(
            access({ policy: selfUploaded, viewer: agent, relationship: { status: "pending_activation" } }).canRead
        ).toBe(false)
        // Their own upload is still theirs to manage.
        expect(access({ viewer: agent, relationship: { status: "pending_activation" } }).canRead).toBe(true)
    })

    it("inactive relationship confers nothing", () => {
        const a = access({ viewer: agent, relationship: { status: "inactive" } })
        expect(a.hasAgentRelationship).toBe(false)
        expect(a.canRead).toBe(false)
    })

    it("relationship without the agent role confers nothing", () => {
        const a = access({
            viewer: { id: "agent_1", roles: "policyholder" },
            relationship: { status: "active" },
        })
        expect(a.canRead).toBe(false)
    })

    it("agent with relationship AND manage grant → full management", () => {
        const a = access({
            viewer: agent,
            grants: [grant("manage")],
            relationship: { status: "active" },
        })
        expect(a.canWrite).toBe(true)
        expect(a.canDelete).toBe(true)
    })
})
