import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { extractStripeCustomerId, fulfillReportUnlockSession, fulfillTokenPurchaseSession, handleSubscriptionSuccess, persistStripeCustomerId } from "@/lib/billing";
import { handleStripeLifecycleEvent, isStripeLifecycleEvent } from "@/lib/services/billing/stripe-lifecycle";
import { createApiResponse, createApiError } from "@/lib/api-utils";
import { withApiGuard } from "@/lib/api-guard";
import { hasProcessedWebhookEvent, markWebhookEventProcessed } from "@/lib/services/billing/webhook-idempotency";
import { recordConversionEvent } from "@/lib/journey/conversion-events";

// PUBLIC_ENDPOINT_AUTH_STRATEGY: stripe_signature_verification + secret_key_validation

export const POST = withApiGuard(
    {
        auth: {
            mode: "webhook",
            verify: ({ req }) => {
                if (!env.STRIPE_WEBHOOK_SECRET) {
                    return createApiError("SERVICE_UNAVAILABLE", "Stripe webhook secret not configured", 503)
                }
                if (!req.headers.get("Stripe-Signature")) {
                    return createApiError("BAD_REQUEST", "Missing Stripe-Signature header", 400)
                }
                return null
            },
        },
        rateLimit: {
            limit: 180,
            windowMs: 60 * 1000,
            key: ({ ip }) => `webhook:stripe:v1:${ip}`,
        },
    },
    async ({ req }) => {
        const webhookSecret = env.STRIPE_WEBHOOK_SECRET
        if (!webhookSecret) {
            return createApiError("SERVICE_UNAVAILABLE", "Stripe webhook secret not configured", 503)
        }

        const body = await req.text()
        const signature = req.headers.get("Stripe-Signature")!

        let event
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (error: any) {
            return createApiError("BAD_REQUEST", `Webhook Error: ${error.message}`, 400)
        }

        const duplicate = await hasProcessedWebhookEvent("stripe", event.id)
        if (duplicate) {
            return createApiResponse({ received: true, duplicate: true })
        }

        const session = event.data.object as any
        if (event.type === "checkout.session.completed") {
            const { userId, planId, tokensPurchased, type, policyId } = session.metadata || {}
            const customerId = extractStripeCustomerId(session.customer)
            if (type === "report_unlock" && userId && policyId) {
                // One-off €3 gap-report unlock (mode: payment)
                await fulfillReportUnlockSession(session.id, userId, policyId)
                await persistStripeCustomerId(userId, customerId)
            } else if (tokensPurchased) {
                // One-off token-pack checkout (mode: payment)
                await fulfillTokenPurchaseSession(session.id, userId, parseInt(tokensPurchased, 10))
                await persistStripeCustomerId(userId, customerId)
            } else if (userId && planId) {
                const subscriptionId = session.subscription as string
                await handleSubscriptionSuccess(userId, planId, subscriptionId, customerId)
            }
        } else if (event.type === "checkout.session.expired") {
            // Stripe expires abandoned sessions (~24h). This is the only
            // server-side signal that a started checkout never converted —
            // it closes the funnel's drop-off step.
            const { userId, planId, billingPeriod, featureKey } = session.metadata || {}
            if (userId) {
                await recordConversionEvent(userId, "checkout_cancelled", {
                    plan: planId,
                    billingPeriod,
                    feature: featureKey,
                    source: "stripe_session_expired",
                })
            }
        } else if (isStripeLifecycleEvent(event.type)) {
            // Dunning, cancellations and plan changes made on Stripe's side
            // (incl. the billing portal) — previously only the deprecated
            // /api/stripe/webhook synced these.
            await handleStripeLifecycleEvent(event)
        }

        await markWebhookEventProcessed({
            provider: "stripe",
            eventId: event.id,
            sourceRoute: "/api/v1/billing/webhook",
            status: "processed",
            result: { eventType: event.type },
        })

        return createApiResponse({ received: true })
    }
)
