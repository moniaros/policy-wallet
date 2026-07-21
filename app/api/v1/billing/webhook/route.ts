import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { fulfillCheckoutSession } from "@/lib/billing";
import { handleStripeLifecycleEvent, isStripeLifecycleEvent } from "@/lib/services/billing/stripe-lifecycle";
import { createApiResponse, createApiError } from "@/lib/api-utils";
import { withApiGuard } from "@/lib/api-guard";
import { processWebhookEventOnce } from "@/lib/services/billing/webhook-idempotency";
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

        // Atomic claim + release-on-error + mark-on-success, all inside the
        // wrapper: concurrent redeliveries of the same event both passed the
        // old check-then-mark and double-processed; exactly one claims now.
        const session = event.data.object as any
        const outcome = await processWebhookEventOnce(
            {
                provider: "stripe",
                eventId: event.id,
                sourceRoute: "/api/v1/billing/webhook",
            },
            async () => {
                if (
                    event.type === "checkout.session.completed" ||
                    event.type === "checkout.session.async_payment_succeeded"
                ) {
                    // Shared fulfillment (report unlock / token pack /
                    // subscription) with the payment_status gate applied in ONE
                    // place for both webhook endpoints.
                    await fulfillCheckoutSession(session)
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
                return { eventType: event.type }
            }
        )

        if (outcome === "duplicate") {
            return createApiResponse({ received: true, duplicate: true })
        }
        return createApiResponse({ received: true })
    }
)
