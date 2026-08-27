"use server"

/**
 * Admin billing operations — refund, cancel, credit — so support can act on a
 * subscriber without leaving for the Stripe dashboard. Every action:
 *  - is admin-gated (verifyAdminRole) and zod-validated,
 *  - returns a discriminated { ok, error } result (never throws to the client),
 *  - maps Stripe errors to a friendly message (no raw Stripe dumps),
 *  - writes a logAdminAction audit row (actor, target, action, metadata).
 *
 * The Stripe secret stays server-side (this is a "use server" module).
 *
 * The audit descriptions below write raw `€${n.toFixed(2)}` ON PURPOSE and are
 * exempt from the no-raw-euro-money-interpolation rule: they are stored log
 * records, not UI. A log wants a deterministic, locale-independent, cent-exact
 * shape (and uniformity with the rows already written); display formatting
 * belongs to whatever surface renders them, and the exact figure is carried in
 * the structured metadata beside each message anyway.
 */

import { z } from "zod"
import * as Sentry from "@sentry/nextjs"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"

export type BillingActionResult<T = Record<string, never>> =
    | ({ ok: true } & T)
    | { ok: false; error: string; code?: string }

/**
 * Turn a thrown Stripe/unknown error into a short operator-facing message.
 * Stripe SDK errors carry `.code` (e.g. charge_already_refunded, resource_missing)
 * and `.type` (e.g. StripeInvalidRequestError, StripeCardError).
 */
function mapStripeError(err: unknown): { error: string; code?: string } {
    const e = err as { code?: string; type?: string; message?: string }
    const code = e?.code || e?.type
    switch (e?.code) {
        case "charge_already_refunded":
            return { error: "This payment has already been fully refunded.", code }
        case "resource_missing":
            return { error: "No matching object was found in Stripe. Check the ID.", code }
        case "amount_too_large":
            return { error: "The refund amount is larger than the remaining charge.", code }
        case "charge_disputed":
            return { error: "This payment is disputed and can't be refunded here.", code }
        case "balance_insufficient":
            return { error: "The Stripe balance is insufficient for this refund.", code }
    }
    if (e?.type === "StripeInvalidRequestError") {
        return { error: e.message || "Stripe rejected the request as invalid.", code }
    }
    return { error: "The billing provider rejected the operation. Please retry or check Stripe.", code }
}

const refundSchema = z.object({
    paymentIntentId: z.string().trim().min(1),
    // Optional partial refund, in whole euros from the UI; converted to cents here.
    amountEur: z.number().positive().finite().optional(),
    reason: z.string().trim().max(500).optional(),
})

export async function issueRefund(input: {
    paymentIntentId: string
    amountEur?: number
    reason?: string
}): Promise<BillingActionResult<{ refundId: string }>> {
    const admin = await verifyAdminRole()
    const parsed = refundSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Invalid refund details." }

    const { paymentIntentId, amountEur, reason } = parsed.data
    try {
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            ...(amountEur ? { amount: Math.round(amountEur * 100) } : {}),
            reason: "requested_by_customer",
            metadata: { adminId: admin.id, adminReason: reason || "" },
        })

        await logAdminAction(
            admin.id,
            admin.email,
            "BILLING_REFUND",
            `Refunded ${amountEur ? `€${amountEur.toFixed(2)}` : "full amount"} on ${paymentIntentId}`,
            { paymentIntentId, amountEur: amountEur ?? null, reason: reason || null, refundId: refund.id }
        )
        return { ok: true, refundId: refund.id }
    } catch (err) {
        Sentry.captureException(err)
        return { ok: false, ...mapStripeError(err) }
    }
}

const cancelSchema = z.object({
    subscriptionId: z.string().trim().min(1),
    immediately: z.boolean(),
})

export async function cancelSubscriptionAsAdmin(input: {
    subscriptionId: string
    immediately: boolean
}): Promise<BillingActionResult<{ mode: "immediate" | "period_end" }>> {
    const admin = await verifyAdminRole()
    const parsed = cancelSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Invalid cancellation details." }

    const { subscriptionId, immediately } = parsed.data
    const sub = await db.subscription.findUnique({
        where: { id: subscriptionId },
        select: { id: true, userId: true, stripeSubscriptionId: true, provider: true },
    })
    if (!sub) return { ok: false, error: "Subscription not found." }
    if (sub.provider !== "stripe" || !sub.stripeSubscriptionId) {
        return { ok: false, error: "This subscription is not a cancellable Stripe subscription." }
    }

    try {
        if (immediately) {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionId)
        } else {
            await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true })
        }

        // Reflect locally for immediate UI feedback; the Stripe webhook remains
        // authoritative and will reconcile status on its own.
        await db.subscription.update({
            where: { id: sub.id },
            data: immediately ? { status: "cancelled", autoRenew: false } : { autoRenew: false },
        })

        await logAdminAction(
            admin.id,
            admin.email,
            "BILLING_CANCEL_SUBSCRIPTION",
            `Cancelled subscription ${sub.id} (${immediately ? "immediately" : "at period end"})`,
            { subscriptionId: sub.id, userId: sub.userId, stripeSubscriptionId: sub.stripeSubscriptionId, immediately }
        )
        return { ok: true, mode: immediately ? "immediate" : "period_end" }
    } catch (err) {
        Sentry.captureException(err)
        return { ok: false, ...mapStripeError(err) }
    }
}

const creditSchema = z.object({
    userId: z.string().trim().min(1),
    amountEur: z.number().positive().finite(),
    memo: z.string().trim().min(1).max(500),
})

export async function applyCredit(input: {
    userId: string
    amountEur: number
    memo: string
}): Promise<BillingActionResult<{ balanceTransactionId: string }>> {
    const admin = await verifyAdminRole()
    const parsed = creditSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Invalid credit details." }

    const { userId, amountEur, memo } = parsed.data
    const user = await db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true, email: true } })
    if (!user) return { ok: false, error: "User not found." }
    if (!user.stripeCustomerId) return { ok: false, error: "This user has no Stripe customer record to credit." }

    try {
        // Negative amount = credit toward the customer's future invoices.
        const txn = await stripe.customers.createBalanceTransaction(user.stripeCustomerId, {
            amount: -Math.round(amountEur * 100),
            currency: "eur",
            description: memo,
            metadata: { adminId: admin.id, userId },
        })

        await logAdminAction(
            admin.id,
            admin.email,
            "BILLING_APPLY_CREDIT",
            `Applied €${amountEur.toFixed(2)} credit to ${user.email}`,
            { userId, amountEur, memo, balanceTransactionId: txn.id }
        )
        return { ok: true, balanceTransactionId: txn.id }
    } catch (err) {
        Sentry.captureException(err)
        return { ok: false, ...mapStripeError(err) }
    }
}
