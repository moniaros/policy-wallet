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
async function syncSubscriptionRecord(
    stripeSub: Stripe.Subscription,
    eventId: string
): Promise<boolean> {
    const local = await db.subscription.findUnique({
        where: { stripeSubscriptionId: stripeSub.id },
        select: { id: true, userId: true, status: true, stripePriceId: true },
    })
    if (!local) return false

    const period = extractSubscriptionPeriod(stripeSub)
    const nextStatus = mapStripeStatus(stripeSub.status)
    const nextPriceId = stripeSub.items?.data?.[0]?.price?.id ?? null

    await db.subscription.update({
        where: { id: local.id },
        data: {
            status: nextStatus,
            autoRenew: !stripeSub.cancel_at_period_end,
            ...(nextPriceId ? { stripePriceId: nextPriceId } : {}),
            ...(period.start ? { currentPeriodStart: period.start } : {}),
            ...(period.end ? { currentPeriodEnd: period.end } : {}),
        },
    })
    await persistStripeCustomerId(local.userId, extractStripeCustomerId(stripeSub.customer))

    // Tell the customer what just happened to their plan. Every branch below
    // used to be silent: the row changed and nobody was told, so someone could
    // lose paid features without a word.
    if (nextStatus === "expired" && local.status !== "expired") {
        await notifySubscriptionExpired(local.userId, eventId)
    } else if (nextPriceId && local.stripePriceId && nextPriceId !== local.stripePriceId) {
        await notifyPlanChanged(local.userId, eventId)
    }

    return true
}

async function markSubscriptionStatus(
    stripeSubscriptionId: string,
    status: "active" | "past_due" | "expired",
    extra: { autoRenew?: boolean } = {}
): Promise<{ changed: boolean; userId: string | null; previousStatus: string | null }> {
    // Read first: `updateMany` cannot tell us WHO to notify, and the previous
    // status is what makes this a transition rather than a repeat.
    const local = await db.subscription.findUnique({
        where: { stripeSubscriptionId },
        select: { userId: true, status: true },
    })

    const updated = await db.subscription.updateMany({
        where: { stripeSubscriptionId },
        data: { status, ...extra },
    })

    return {
        changed: updated.count > 0,
        userId: local?.userId ?? null,
        previousStatus: local?.status ?? null,
    }
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
            return syncSubscriptionRecord(event.data.object as Stripe.Subscription, event.id)

        case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription
            const result = await markSubscriptionStatus(sub.id, "expired", { autoRenew: false })
            if (result.changed && result.userId && result.previousStatus !== "expired") {
                await notifySubscriptionExpired(result.userId, event.id)
            }
            return result.changed
        }

        case "invoice.paid": {
            const subscriptionId = invoiceSubscriptionId(event.data.object as Stripe.Invoice)
            if (!subscriptionId) return false
            // A paid invoice means a fresh period — pull the authoritative
            // period bounds (and post-dunning status) from Stripe.
            try {
                const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)
                return await syncSubscriptionRecord(stripeSub, event.id)
            } catch (error) {
                logger("warn", "invoice.paid: subscription retrieve failed", {
                    subscriptionId,
                    error: error instanceof Error ? error.message : String(error),
                })
                // Degrade gracefully: at least restore access.
                return (await markSubscriptionStatus(subscriptionId, "active")).changed
            }
        }

        case "invoice.payment_failed": {
            const subscriptionId = invoiceSubscriptionId(event.data.object as Stripe.Invoice)
            if (!subscriptionId) return false
            const result = await markSubscriptionStatus(subscriptionId, "past_due")

            // The gap this closes: the subscription was flipped to past_due —
            // which pauses entitlements — and the customer was told nothing.
            // They lost paid features mid-session with no idea why, and no
            // prompt to fix the card. Notified on every failure, not only the
            // first: dunning is a sequence, and the second attempt failing is
            // news too.
            if (result.changed && result.userId) {
                await notifyPaymentFailed(result.userId, event.id)
            }
            return result.changed
        }

        default:
            return false
    }
}

// ── Notifications ────────────────────────────────────────────────────────────
//
// Keyed on the Stripe event id. `processWebhookEventOnce` already guards the
// outer call, but Stripe retries across process boundaries and the dedupe key
// is what makes a redelivery silent rather than a second email.

async function notifyPaymentFailed(userId: string, eventId: string): Promise<void> {
    // Publish the FACT. The dunning ladder, the admin escalation and the
    // customer notification are consequences the decision engine decides —
    // dual-written alongside the direct notification during the migration.
    const { publishPaymentFailed } = await import("@/lib/events/publishers")
    await publishPaymentFailed({ userId, subscriptionId: eventId, stripeEventId: eventId })

    const { emit } = await import("@/lib/notifications/dispatch")
    await emit({
        event: "payment_failed",
        userId,
        title: {
            el: "Η πληρωμή σας απέτυχε",
            en: "Your payment failed",
        },
        message: {
            el: "Δεν καταφέραμε να χρεώσουμε την κάρτα σας, οπότε οι επί πληρωμή λειτουργίες είναι προσωρινά σε παύση. Ενημερώστε τον τρόπο πληρωμής σας για να συνεχίσετε.",
            en: "We could not charge your card, so your paid features are paused for now. Update your payment method to restore them.",
        },
        relatedObjectType: "subscription",
        relatedObjectId: eventId,
        dedupeKey: `stripe:${eventId}`,
    })
}

async function notifySubscriptionExpired(userId: string, eventId: string): Promise<void> {
    const { publishSubscriptionExpired } = await import("@/lib/events/publishers")
    await publishSubscriptionExpired({ userId, subscriptionId: eventId, stripeEventId: eventId })

    const { emit } = await import("@/lib/notifications/dispatch")
    await emit({
        event: "subscription_expired",
        userId,
        title: {
            el: "Η συνδρομή σας έληξε",
            en: "Your subscription has ended",
        },
        message: {
            el: "Ο λογαριασμός σας επέστρεψε στο δωρεάν πλάνο. Τα ασφαλιστήριά σας και τα δεδομένα σας παραμένουν στη θέση τους.",
            en: "Your account has returned to the free plan. Your policies and your data stay exactly where they are.",
        },
        relatedObjectType: "subscription",
        relatedObjectId: eventId,
        dedupeKey: `stripe:${eventId}`,
    })
}

async function notifyPlanChanged(userId: string, eventId: string): Promise<void> {
    const { publishSubscriptionChanged } = await import("@/lib/events/publishers")
    await publishSubscriptionChanged({ userId, subscriptionId: eventId, stripeEventId: eventId })

    const { emit } = await import("@/lib/notifications/dispatch")
    await emit({
        event: "subscription_upgraded",
        userId,
        title: {
            el: "Το πλάνο σας άλλαξε",
            en: "Your plan changed",
        },
        message: {
            el: "Η αλλαγή του πλάνου σας ολοκληρώθηκε και ισχύει άμεσα.",
            en: "Your plan change is complete and applies from now.",
        },
        relatedObjectType: "subscription",
        relatedObjectId: eventId,
        dedupeKey: `stripe:${eventId}`,
    })
}
