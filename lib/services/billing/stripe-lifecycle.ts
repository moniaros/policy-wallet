import type Stripe from "stripe"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { extractStripeCustomerId, extractSubscriptionPeriod, persistStripeCustomerId } from "@/lib/billing"
import { logger } from "@/lib/logger"

/**
 * Sync Stripe-side subscription lifecycle into the local DB. Before this
 * existed, the v1 webhook only handled checkout.session.completed: failed
 * payments were never marked past_due (no dunning) and cancellations made
 * inside Stripe (incl. the billing portal) never reached the app — the
 * legacy /api/stripe/webhook was the only place with this logic.
 *
 * Status mapping is deliberately coarse because entitlements gate on
 * status === "active" (lib/subscription-entitlements.ts): `past_due` pauses
 * access during dunning and `invoice.paid` restores it.
 */

const HANDLED_EVENTS = new Set([
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
])

export function isStripeLifecycleEvent(eventType: string): boolean {
    return HANDLED_EVENTS.has(eventType)
}

function mapStripeStatus(stripeStatus: string): "active" | "past_due" | "expired" {
    if (stripeStatus === "active" || stripeStatus === "trialing") return "active"
    if (stripeStatus === "past_due") return "past_due"
    // canceled, unpaid, incomplete, incomplete_expired, paused
    return "expired"
}

/**
 * Mirror one Stripe subscription object onto its local row. Subscriptions we
 * don't know (no matching stripeSubscriptionId) are ignored — this webhook
 * may receive events for objects created outside the app.
 */
async function syncSubscriptionRecord(stripeSub: Stripe.Subscription): Promise<boolean> {
    const local = await db.subscription.findUnique({
        where: { stripeSubscriptionId: stripeSub.id },
        select: { id: true, userId: true },
    })
    if (!local) return false

    const period = extractSubscriptionPeriod(stripeSub)
    await db.subscription.update({
        where: { id: local.id },
        data: {
            status: mapStripeStatus(stripeSub.status),
            autoRenew: !stripeSub.cancel_at_period_end,
            ...(period.start ? { currentPeriodStart: period.start } : {}),
            ...(period.end ? { currentPeriodEnd: period.end } : {}),
        },
    })
    await persistStripeCustomerId(local.userId, extractStripeCustomerId(stripeSub.customer))
    return true
}

async function markSubscriptionStatus(
    stripeSubscriptionId: string,
    status: "active" | "past_due" | "expired",
    extra: { autoRenew?: boolean } = {}
): Promise<boolean> {
    const updated = await db.subscription.updateMany({
        where: { stripeSubscriptionId },
        data: { status, ...extra },
    })
    return updated.count > 0
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    const sub = (invoice as { subscription?: string | { id?: string } | null }).subscription
    if (typeof sub === "string") return sub || null
    return sub?.id ?? null
}

/**
 * Handle one lifecycle event. Returns true when the event mutated a local
 * subscription; false when it was irrelevant (unknown subscription, no
 * subscription on the invoice, or an unhandled event type).
 */
export async function handleStripeLifecycleEvent(event: Stripe.Event): Promise<boolean> {
    switch (event.type) {
        case "customer.subscription.updated":
            return syncSubscriptionRecord(event.data.object as Stripe.Subscription)

        case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription
            return markSubscriptionStatus(sub.id, "expired", { autoRenew: false })
        }

        case "invoice.paid": {
            const subscriptionId = invoiceSubscriptionId(event.data.object as Stripe.Invoice)
            if (!subscriptionId) return false
            // A paid invoice means a fresh period — pull the authoritative
            // period bounds (and post-dunning status) from Stripe.
            try {
                const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)
                return await syncSubscriptionRecord(stripeSub)
            } catch (error) {
                logger("warn", "invoice.paid: subscription retrieve failed", {
                    subscriptionId,
                    error: error instanceof Error ? error.message : String(error),
                })
                // Degrade gracefully: at least restore access.
                return markSubscriptionStatus(subscriptionId, "active")
            }
        }

        case "invoice.payment_failed": {
            const subscriptionId = invoiceSubscriptionId(event.data.object as Stripe.Invoice)
            if (!subscriptionId) return false
            return markSubscriptionStatus(subscriptionId, "past_due")
        }

        default:
            return false
    }
}
