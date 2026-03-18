import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { handleSubscriptionSuccess } from "@/lib/billing";
import { createApiResponse, createApiError } from "@/lib/api-utils";
import { withApiGuard } from "@/lib/api-guard";
import { hasProcessedWebhookEvent, markWebhookEventProcessed } from "@/lib/services/billing/webhook-idempotency";

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
            const { userId, planId } = session.metadata
            const subscriptionId = session.subscription as string
            await handleSubscriptionSuccess(userId, planId, subscriptionId)
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
