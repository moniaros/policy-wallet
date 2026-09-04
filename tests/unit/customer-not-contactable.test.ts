import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Owner decision D3: a customer with no email is identified by ΑΦΜ + Greek
 * mobile and keyed on a synthetic, non-deliverable address. Nothing may be
 * SENT to them — the invite flow and the consent request refuse with
 * CUSTOMER_NOT_CONTACTABLE before any write — and the one way out is
 * `updateCustomerContact`, which replaces the address and clears the flag
 * under the agent's living relationship, on a phantom only.
 */

vi.mock("@/lib/auth-helpers", () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))
vi.mock("@/lib/services/customer.service", () => ({ CustomerService: class { createCustomer = vi.fn() } }))
vi.mock("@/lib/services/customer-resolution.service", () => ({
    customerResolutionService: { resolveCustomerCandidates: vi.fn() },
}))
vi.mock("@/lib/services/ai/ai-service.factory", () => ({
    AIServiceFactory: {}, getAIService: vi.fn(() => ({ isAvailable: () => false })),
}))
vi.mock("@/lib/services/collaboration.service", () => ({ collaborationService: {} }))
const sendPolicyInviteEmail = vi.fn(async (..._a: unknown[]) => ({ success: true }))
const sendAiConsentRequestEmail = vi.fn(async (..._a: unknown[]) => ({ success: true }))
vi.mock("@/lib/email/invite-emails", () => ({
    sendPolicyInviteEmail: (...a: unknown[]) => sendPolicyInviteEmail(...a),
    sendAiConsentRequestEmail: (...a: unknown[]) => sendAiConsentRequestEmail(...a),
}))
const emit = vi.fn()
vi.mock("@/lib/notifications/dispatch", () => ({ emit: (...a: unknown[]) => emit(...a) }))
vi.mock("@/lib/notifications", () => ({ notifyCounterparty: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/server", () => ({ after: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
vi.mock("@/lib/subscription-entitlements", () => ({
    canAgentAddCustomer: vi.fn(async () => ({ allowed: true })),
    canAgentAddPolicyForCustomer: vi.fn(async () => ({ allowed: true })),
    canAgentRunAnalysis: vi.fn(async () => ({ allowed: true })),
}))

const userFindUnique = vi.fn()
const userCreate = vi.fn()
const userUpdate = vi.fn()
const relFindFirst = vi.fn()
const relFindUnique = vi.fn()
const relUpsert = vi.fn()
const inviteCreate = vi.fn()
const policyFindUnique = vi.fn()
const grantFindFirst = vi.fn()
const activityCreate = vi.fn()
vi.mock("@/lib/db", () => ({
    db: {
        user: {
            findUnique: (...a: unknown[]) => userFindUnique(...a),
            create: (...a: unknown[]) => userCreate(...a),
            update: (...a: unknown[]) => userUpdate(...a),
        },
        customerRelationship: {
            findFirst: (...a: unknown[]) => relFindFirst(...a),
            findUnique: (...a: unknown[]) => relFindUnique(...a),
            upsert: (...a: unknown[]) => relUpsert(...a),
            update: vi.fn(),
        },
        invite: { create: (...a: unknown[]) => inviteCreate(...a) },
        policy: { findUnique: (...a: unknown[]) => policyFindUnique(...a), findFirst: vi.fn(async () => null) },
        accessGrant: { findFirst: (...a: unknown[]) => grantFindFirst(...a) },
        activityLog: { create: (...a: unknown[]) => activityCreate(...a) },
        $transaction: vi.fn(),
    },
}))

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { createAgentInvite, inviteCustomer, requestAiConsent, updateCustomerContact } from "@/app/(protected)/agent/actions"
import { syntheticNoEmailAddress } from "@/lib/identity/synthetic-email"

const AGENT = { dbUser: { id: "agent-1", roles: "agent", name: "Agent A", email: "a@x.gr", preferredLanguage: "el" } } as any
const SYNTHETIC = syntheticNoEmailAddress("123456783")
const PHANTOM: { id: string; email: string; password: string | null; emailVerified: Date | null; lastActiveAt: Date | null } = {
    id: "cust-1", email: SYNTHETIC, password: null, emailVerified: null, lastActiveAt: null,
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUserOrNull).mockResolvedValue(AGENT)
    userUpdate.mockResolvedValue({})
    activityCreate.mockResolvedValue({})
    inviteCreate.mockResolvedValue({ id: "inv-1", token: "tok" })
    relUpsert.mockResolvedValue({})
})

describe("createAgentInvite refuses a customer who has no email", () => {
    it("returns CUSTOMER_NOT_CONTACTABLE before any read or write", async () => {
        const res = await createAgentInvite(SYNTHETIC, "portfolio")
        expect(res).toEqual({ success: false, error: "CUSTOMER_NOT_CONTACTABLE" })
        expect(userFindUnique).not.toHaveBeenCalled()
        expect(inviteCreate).not.toHaveBeenCalled()
        expect(relUpsert).not.toHaveBeenCalled()
        expect(sendPolicyInviteEmail).not.toHaveBeenCalled()
    })

    it("the form-data door reaches the same refusal", async () => {
        const fd = new FormData()
        fd.append("email", SYNTHETIC.toUpperCase())
        expect(await inviteCustomer(fd)).toEqual({ success: false, error: "CUSTOMER_NOT_CONTACTABLE" })
        expect(inviteCreate).not.toHaveBeenCalled()
    })

    it("still invites a real address", async () => {
        userFindUnique.mockResolvedValue({ id: "cust-2", email: "maria@x.gr" })
        relFindUnique.mockResolvedValue(null)
        const res = await createAgentInvite("maria@x.gr", "portfolio")
        expect(res).toMatchObject({ success: true, inviteId: "inv-1" })
        expect(sendPolicyInviteEmail).toHaveBeenCalledTimes(1)
    })
})

describe("requestAiConsent refuses a customer who has no email", () => {
    beforeEach(() => {
        policyFindUnique.mockResolvedValue({ id: "pol-1", ownerUserId: "cust-1", policyNumber: "P-1" })
        grantFindFirst.mockResolvedValue({ id: "grant-1" })
    })

    it("returns CUSTOMER_NOT_CONTACTABLE and writes neither an invite nor a notification", async () => {
        userFindUnique.mockResolvedValue({
            ...PHANTOM, contactEmailMissing: true, preferredLanguage: "el", aiProcessingConsentVersion: null,
        })
        expect(await requestAiConsent("pol-1")).toEqual({ error: "CUSTOMER_NOT_CONTACTABLE" })
        expect(inviteCreate).not.toHaveBeenCalled()
        expect(emit).not.toHaveBeenCalled()
        expect(sendPolicyInviteEmail).not.toHaveBeenCalled()
        expect(sendAiConsentRequestEmail).not.toHaveBeenCalled()
    })

    it("reads the flag from the owner row (the column travels with the select)", async () => {
        userFindUnique.mockResolvedValue({
            ...PHANTOM, contactEmailMissing: true, preferredLanguage: "el", aiProcessingConsentVersion: null,
        })
        await requestAiConsent("pol-1")
        expect(userFindUnique.mock.calls[0]![0]).toMatchObject({ select: expect.objectContaining({ contactEmailMissing: true }) })
    })
})

describe("updateCustomerContact — a real address for a customer who had none", () => {
    const phantomByIdNobodyByEmail = (phantom = PHANTOM) =>
        userFindUnique.mockImplementation(async (args: any) => (args.where.id ? phantom : null))

    it("replaces the synthetic address, clears the flag, and leaves a trace", async () => {
        relFindFirst.mockResolvedValue({ id: "rel-1", status: "pending_activation" })
        phantomByIdNobodyByEmail()

        const res = await updateCustomerContact({ customerId: "cust-1", email: " Nikos@X.GR " })

        expect(res).toEqual({ success: true, customerId: "cust-1", email: "nikos@x.gr" })
        expect(userUpdate).toHaveBeenCalledWith({
            where: { id: "cust-1" },
            data: { email: "nikos@x.gr", contactEmailMissing: false },
        })
        expect(activityCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ actionType: "CUSTOMER_CONTACT_EMAIL_ADDED", targetUserId: "cust-1" }),
        }))
    })

    it("refuses without a living relationship", async () => {
        relFindFirst.mockResolvedValue({ id: "rel-1", status: "terminated" })
        phantomByIdNobodyByEmail()
        expect(await updateCustomerContact({ customerId: "cust-1", email: "nikos@x.gr" })).toEqual({ success: false, error: "CUSTOMER_ACCESS_DENIED" })
        relFindFirst.mockResolvedValue(null)
        expect(await updateCustomerContact({ customerId: "cust-1", email: "nikos@x.gr" })).toEqual({ success: false, error: "CUSTOMER_ACCESS_DENIED" })
        expect(userUpdate).not.toHaveBeenCalled()
    })

    it("refuses an activated account — its address is the customer's own", async () => {
        relFindFirst.mockResolvedValue({ id: "rel-1", status: "active" })
        phantomByIdNobodyByEmail({ ...PHANTOM, emailVerified: new Date("2026-01-01") })
        expect(await updateCustomerContact({ customerId: "cust-1", email: "nikos@x.gr" })).toEqual({ success: false, error: "CUSTOMER_ACCOUNT_OWNED" })
        phantomByIdNobodyByEmail({ ...PHANTOM, lastActiveAt: new Date("2026-01-01") })
        expect(await updateCustomerContact({ customerId: "cust-1", email: "nikos@x.gr" })).toEqual({ success: false, error: "CUSTOMER_ACCOUNT_OWNED" })
        expect(userUpdate).not.toHaveBeenCalled()
    })

    it("refuses an address that already keys another account", async () => {
        relFindFirst.mockResolvedValue({ id: "rel-1", status: "pending_activation" })
        userFindUnique.mockImplementation(async (args: any) => (args.where.id ? PHANTOM : { id: "someone-else" }))
        expect(await updateCustomerContact({ customerId: "cust-1", email: "taken@x.gr" })).toEqual({ success: false, error: "EMAIL_IN_USE" })
        expect(userUpdate).not.toHaveBeenCalled()
    })

    it("refuses the synthetic address itself, on the email path, before any read", async () => {
        const res = await updateCustomerContact({ customerId: "cust-1", email: SYNTHETIC })
        expect(res).toMatchObject({ success: false, error: "VALIDATION_ERROR" })
        expect((res as any).details.some((d: any) => d.path === "email")).toBe(true)
        expect(relFindFirst).not.toHaveBeenCalled()
        expect(userUpdate).not.toHaveBeenCalled()
    })
})
