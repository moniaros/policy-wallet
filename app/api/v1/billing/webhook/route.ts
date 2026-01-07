import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { handleSubscriptionSuccess } from "@/lib/billing";
import { createApiResponse, createApiError } from "@/lib/api-utils";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET!
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
