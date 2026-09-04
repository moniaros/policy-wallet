import { describe, it, expect, vi, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Every agent action that writes a Policy or a User validates its input first.
 *
 * addCustomerManually, addPolicyForCustomer, commitScannedPolicy and
 * createAgentInvite took their arguments on trust: `new Date('')` became an
 * Invalid Date column that rendered as "NaN days", a NaN premium was stored,
 * the line of business was free text the taxonomy could not resolve, and an
 * address with no `@` minted a phantom nobody could ever sign up as.
 *
 * The action list is derived from the SOURCE — every `export async function`
 * in agent/actions.ts whose body writes a Policy or User — so a new writer is
 * covered the day it is written. Probes at the bottom prove the matcher.
 */

const repoRoot = join(__dirname, "..", "..")
const ACTIONS = "app/(protected)/agent/actions.ts"

function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

/**
 * Exported actions and their bodies. A body ends at the next TOP-LEVEL
 * function — exported or not — so a private helper's write (backfillCustomerTaxId)
 * is never attributed to the exported action above it.
 */
function exportedActions(source: string): Array<{ name: string; body: string }> {
    const code = stripComments(source)
    const boundaries = [...code.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\(/gm)]
    const out: Array<{ name: string; body: string }> = []
    boundaries.forEach((m, i) => {
        if (!m[0].startsWith("export ")) return
        const end = i + 1 < boundaries.length ? boundaries[i + 1].index! : code.length
        out.push({ name: m[1], body: code.slice(m.index!, end) })
    })
    return out
}

const WRITES_POLICY_OR_USER = /\b(?:tx|db)\.(?:policy|user)\.(?:create|update|upsert|delete)\w*\(|\bcreateCustomer\(/
const PARSES_INPUT = /\.(?:parse|safeParse)\(/

/** Writers that never parse. */
export function unvalidatedWriters(source: string): string[] {
    return exportedActions(source)
        .filter((a) => WRITES_POLICY_OR_USER.test(a.body) && !PARSES_INPUT.test(a.body))
        .map((a) => a.name)
}

describe("agent actions that write a Policy or User parse their input", () => {
    const source = readFileSync(join(repoRoot, ACTIONS), "utf8")

    it("finds the writers it is supposed to guard", () => {
        const writers = exportedActions(source).filter((a) => WRITES_POLICY_OR_USER.test(a.body)).map((a) => a.name)
        for (const expected of ["createAgentInvite", "addCustomerManually", "addPolicyForCustomer", "commitScannedPolicy"]) {
            expect(writers, expected).toContain(expected)
        }
    })

    it("names every writer that skips validation", () => {
        expect(
            unvalidatedWriters(source),
            "These exported actions write a Policy or User without a Zod .parse()/.safeParse() " +
                "on their input. Add the schema to lib/validations/agent-intake.ts and parse at the top."
        ).toEqual([])
    })

    it("the matcher is proven against committed probes", () => {
        const probe = (name: string) => readFileSync(join(repoRoot, "tests/fixtures/guard-probes", name), "utf8")
        expect(unvalidatedWriters(probe("action-writes-without-parse.ts.txt"))).toEqual(["addPolicyProbe"])
        expect(unvalidatedWriters(probe("action-writes-with-parse.ts.txt"))).toEqual([])
    })
})

// ── Behaviour: what an invalid input does at the boundary ──

vi.mock("@/lib/auth-helpers", () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))
const mockCreateCustomer = vi.fn()
vi.mock("@/lib/services/customer.service", () => ({
    CustomerService: class {
        createCustomer(...args: unknown[]) { return mockCreateCustomer(...args) }
    },
}))
vi.mock("@/lib/services/customer-resolution.service", () => ({
    customerResolutionService: { resolveCustomerCandidates: vi.fn() },
}))
vi.mock("@/lib/services/ai/ai-service.factory", () => ({
    AIServiceFactory: {}, getAIService: vi.fn(() => ({ isAvailable: () => false })),
}))
vi.mock("@/lib/services/collaboration.service", () => ({ collaborationService: {} }))
vi.mock("@/lib/email/invite-emails", () => ({
    sendPolicyInviteEmail: vi.fn(async () => ({ success: true })),
    sendAiConsentRequestEmail: vi.fn(async () => ({ success: true })),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/server", () => ({ after: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

const canAgentAddCustomer = vi.fn()
const canAgentAddPolicyForCustomer = vi.fn()
vi.mock("@/lib/subscription-entitlements", () => ({
    canAgentAddCustomer: (...a: unknown[]) => canAgentAddCustomer(...a),
    canAgentAddPolicyForCustomer: (...a: unknown[]) => canAgentAddPolicyForCustomer(...a),
    canAgentRunAnalysis: vi.fn(async () => ({ allowed: true })),
}))

const dbTransaction = vi.fn()
const relFindFirst = vi.fn()
vi.mock("@/lib/db", () => ({
    db: {
        user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        customerRelationship: { findFirst: (...a: unknown[]) => relFindFirst(...a), findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
        policy: { findFirst: vi.fn(async () => null) },
        invite: { create: vi.fn() },
        notificationEvent: { create: vi.fn() },
        $transaction: (...a: unknown[]) => dbTransaction(...a),
    },
}))

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { addCustomerManually, addPolicyForCustomer, commitScannedPolicy } from "@/app/(protected)/agent/actions"

const AGENT = { dbUser: { id: "agent-1", roles: "agent", name: "Agent A", email: "a@x.gr" } } as any
const GOOD_POLICY = {
    insurerName: "Allianz", policyNumber: "P-1", lineOfBusiness: "motor",
    startDate: "2026-01-01", endDate: "2027-01-01", premiumAmount: 500,
}
const GOOD_CUSTOMER = { name: "Nikos", surname: "Ioannou", email: "nikos@x.gr", phone: "6900000000" }

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUserOrNull).mockResolvedValue(AGENT)
    canAgentAddCustomer.mockResolvedValue({ allowed: true })
    canAgentAddPolicyForCustomer.mockResolvedValue({ allowed: true })
    relFindFirst.mockResolvedValue({ id: "rel-1", status: "pending_activation" })
    mockCreateCustomer.mockResolvedValue({ policyholderUserId: "cust-1" })
    dbTransaction.mockImplementation(async (fn: any) => fn({
        policy: { create: vi.fn(async () => ({ id: "pol-1", policyNumber: "P-1" })) },
        accessGrant: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})) },
        policyDocument: { create: vi.fn(async () => ({})) },
        user: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({ id: "cust-1" })) },
        customerRelationship: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({ id: "rel-1", policyholderUserId: "cust-1" })) },
        activityLog: { create: vi.fn(async () => ({})) },
    }))
})

describe("addCustomerManually rejects before any write", () => {
    it("a bad date", async () => {
        const res = await addCustomerManually({
            ...GOOD_CUSTOMER,
            policy: { ...GOOD_POLICY, startDate: "" },
        })
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect((res as any).details.some((d: any) => d.path === "policy.startDate")).toBe(true)
        expect(dbTransaction).not.toHaveBeenCalled()
        expect(canAgentAddCustomer).not.toHaveBeenCalled()
    })

    it("an end date before the start date", async () => {
        const res = await addCustomerManually({
            ...GOOD_CUSTOMER,
            policy: { ...GOOD_POLICY, startDate: "2027-01-01", endDate: "2026-01-01" },
        })
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect((res as any).details.some((d: any) => d.path === "policy.endDate")).toBe(true)
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it("a bad email", async () => {
        const res = await addCustomerManually({ ...GOOD_CUSTOMER, email: "nikos-at-x.gr" })
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect((res as any).details.some((d: any) => d.path === "email")).toBe(true)
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it("a line of business outside the taxonomy", async () => {
        const res = await addCustomerManually({
            ...GOOD_CUSTOMER,
            policy: { ...GOOD_POLICY, lineOfBusiness: "αυτοκίνητο" },
        })
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect((res as any).details.some((d: any) => d.path === "policy.lineOfBusiness")).toBe(true)
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it("a NaN premium", async () => {
        const res = await addCustomerManually({
            ...GOOD_CUSTOMER,
            policy: { ...GOOD_POLICY, premiumAmount: Number.NaN },
        })
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it("a 9-digit ΑΦΜ that fails the mod-11 checksum", async () => {
        const res = await addCustomerManually({ ...GOOD_CUSTOMER, taxId: "123456789" })
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect((res as any).details.some((d: any) => d.path === "taxId")).toBe(true)
    })

    it("and commits a valid customer + policy in ONE transaction", async () => {
        const res = await addCustomerManually({ ...GOOD_CUSTOMER, email: " Nikos@X.GR ", taxId: "123456783", policy: GOOD_POLICY })
        expect(res).toMatchObject({ success: true, customerId: "cust-1", policyId: "pol-1" })
        expect(dbTransaction).toHaveBeenCalledTimes(1)
        expect(mockCreateCustomer).toHaveBeenCalledWith("agent-1", expect.objectContaining({
            email: "nikos@x.gr", name: "Nikos Ioannou", taxId: "123456783",
        }))
    })
})

describe("addPolicyForCustomer rejects before any write", () => {
    it("a bad date", async () => {
        const res = await addPolicyForCustomer({ customerId: "cust-1", policy: { ...GOOD_POLICY, endDate: "not a date" } })
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect(relFindFirst).not.toHaveBeenCalled()
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it("a line of business outside the taxonomy", async () => {
        const res = await addPolicyForCustomer({ customerId: "cust-1", policy: { ...GOOD_POLICY, lineOfBusiness: "car" } })
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect(dbTransaction).not.toHaveBeenCalled()
    })
})

describe("commitScannedPolicy rejects before any write", () => {
    it("a new customer with a bad email", async () => {
        const res = await commitScannedPolicy(
            { mode: "create_new", customer: { name: "N", email: "nope" } },
            GOOD_POLICY,
        )
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect(mockCreateCustomer).not.toHaveBeenCalled()
        expect(canAgentAddCustomer).not.toHaveBeenCalled()
    })

    it("a policy with a bad date, even when the decision is valid", async () => {
        const res = await commitScannedPolicy(
            { mode: "attach", customerId: "cust-1" },
            { ...GOOD_POLICY, startDate: "01/01/2026" },
        )
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect(dbTransaction).not.toHaveBeenCalled()
    })
})
