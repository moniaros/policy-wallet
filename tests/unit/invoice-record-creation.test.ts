/**
 * WP-27 (C6) — granting a paid subscription must leave an invoice behind.
 *
 * No code ever wrote an Invoice row. Two consequences, both quiet:
 *   - the in-app billing history was permanently empty, so a customer could
 *     never see what they had been charged;
 *   - the billing-reconciliation monitor counts active paid subscriptions with
 *     no recent invoice, so it alarmed on EVERY subscription. A monitor that
 *     always fires is a monitor nobody reads, and a genuine billing incident
 *     would have been indistinguishable from the baseline.
 *
 * The second one is why this could not be left open: WP-16 put that job on a
 * schedule, which without this fix means a daily alarm that means nothing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const invoiceCreate = vi.fn()
const subscriptionCreate = vi.fn((..._args: unknown[]) => ({ id: "sub-new" }))
const planFindUnique = vi.fn()

vi.mock("@/lib/db", () => ({
    db: {
        plan: { findUnique: (...a: unknown[]) => planFindUnique(...a) },
        subscription: {
            findUnique: vi.fn(async () => null),
            findFirst: vi.fn(async () => null),
            findMany: vi.fn(async () => []),
            create: (...a: unknown[]) => subscriptionCreate(...a),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        invoice: { create: (...a: unknown[]) => invoiceCreate(...a) },
        activityLog: { create: vi.fn() },
        // The array form resolves each entry; subscription.create is first.
        $transaction: async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
    },
    isUniqueConstraintViolation: () => false,
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
vi.mock("@/lib/env", () => ({ env: {} }))
vi.mock("stripe", () => ({ default: class {} }))

beforeEach(() => {
    vi.clearAllMocks()
    subscriptionCreate.mockReturnValue({ id: "sub-new" })
    // 49.99 gross is the advertised, VAT-inclusive price.
    planFindUnique.mockResolvedValue({
        id: "plan-1",
        name: "Plus",
        price: 49.99,
        planType: "b2c",
    })
})

async function grant() {
    const { handleSubscriptionSuccess } = await import("@/lib/billing")
    await handleSubscriptionSuccess("user-1", "plan-1", "stripe-sub-1", "cus-1")
}

describe("invoice records", () => {
    it("writes an invoice when a subscription is granted", async () => {
        await grant()
        expect(invoiceCreate).toHaveBeenCalledTimes(1)
    })

    it("splits the advertised price into net and VAT rather than adding tax on top", async () => {
        // The advertised price is VAT-inclusive. Treating it as net is exactly
        // the bug that once charged 49.99 as 61.99.
        await grant()
        const data = invoiceCreate.mock.calls[0][0].data

        expect(data.totalAmount).toBeCloseTo(49.99, 2)
        expect(Number(data.amount) + Number(data.taxAmount)).toBeCloseTo(49.99, 2)
        expect(Number(data.amount)).toBeLessThan(49.99)
    })

    it("links the invoice to the subscription it belongs to", async () => {
        await grant()
        const data = invoiceCreate.mock.calls[0][0].data

        expect(data.subscriptionId).toBe("sub-new")
        expect(data.userId).toBe("user-1")
    })

    it("records it as paid, with a billing date", async () => {
        await grant()
        const data = invoiceCreate.mock.calls[0][0].data

        expect(data.status).toBe("paid")
        expect(data.paidAt).toBeInstanceOf(Date)
        expect(data.billingDate).toBeInstanceOf(Date)
    })

    it("does not cost the customer their entitlement if the invoice write fails", async () => {
        // The subscription is already granted and durable at this point; an
        // accounting record failing must not surface as a failed purchase.
        invoiceCreate.mockRejectedValueOnce(new Error("db down"))
        await expect(grant()).resolves.not.toThrow()
    })
})
