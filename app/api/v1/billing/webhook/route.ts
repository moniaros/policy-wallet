import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { handleSubscriptionSuccess } from "@/lib/billing";
import { createApiResponse, createApiError } from "@/lib/api-utils";

// PUBLIC_ENDPOINT_AUTH_STRATEGY: stripe_signature_verification + secret_key_validation

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature");

    if (!env.STRIPE_WEBHOOK_SECRET) {
        return createApiError("SERVICE_UNAVAILABLE", "Stripe webhook secret not configured", 503);
    }

    if (!signature) {
        return createApiError("BAD_REQUEST", "Missing Stripe-Signature header", 400);
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error: any) {
        return createApiError("BAD_REQUEST", `Webhook Error: ${error.message}`, 400);
    }

    const session = event.data.object as any;

    if (event.type === "checkout.session.completed") {
        const { userId, planId } = session.metadata;
        const subscriptionId = session.subscription as string;

        await handleSubscriptionSuccess(userId, planId, subscriptionId);
    }

    return createApiResponse({ received: true });
}
