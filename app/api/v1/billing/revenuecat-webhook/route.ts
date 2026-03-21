
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { z } from 'zod';
import { createApiResponse, createApiError } from "@/lib/api-utils";
import { withApiGuard } from "@/lib/api-guard";
import { hasProcessedWebhookEvent, markWebhookEventProcessed } from "@/lib/services/billing/webhook-idempotency";
import { daysFromNow, SUBSCRIPTION_PERIOD_DAYS } from "@/lib/constants/time";

// PUBLIC_ENDPOINT_AUTH_STRATEGY: bearer_webhook_secret + zod_payload_validation

const revenueCatEventSchema = z.object({
    id: z.string().optional(),
    app_user_id: z.string().min(1),
    type: z.string().min(1),
    product_id: z.string().min(1),
    expiration_at_ms: z.union([z.number(), z.string()]).optional(),
    purchased_at_ms: z.union([z.number(), z.string()]).optional(),
});

const revenueCatWebhookSchema = z.object({
    event: revenueCatEventSchema,
});

export const POST = withApiGuard(
    {
        auth: {
            mode: "webhook",
            verify: ({ req }) => {
                if (!env.REVENUECAT_WEBHOOK_AUTH_VALUE) {
                    logger('error', 'RevenueCat webhook secret is not configured')
                    return createApiError("SERVICE_UNAVAILABLE", "Webhook auth not configured", 503)
                }
                const authHeader = req.headers.get('Authorization')
                if (!authHeader?.startsWith('Bearer ')) {
                    return createApiError("UNAUTHORIZED", "Unauthorized", 401)
                }
                if (authHeader !== `Bearer ${env.REVENUECAT_WEBHOOK_AUTH_VALUE}`) {
                    return createApiError("UNAUTHORIZED", "Unauthorized", 401)
                }
                return null
            },
        },
        validation: { body: revenueCatWebhookSchema },
        rateLimit: {
            limit: 120,
            windowMs: 60 * 1000,
            key: ({ ip }) => `webhook:revenuecat:v1:${ip}`,
        },
    },
    async ({ body }) => {
        try {
            const { event } = body!

        const userId = event.app_user_id;
        const type = event.type;
        const productIdentifier = event.product_id;
        const expirationAt = event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)) : null;
        const purchaseDate = event.purchased_at_ms ? new Date(Number(event.purchased_at_ms)) : new Date();
        const idempotencyEventId = event.id || `${userId}:${type}:${productIdentifier}:${event.purchased_at_ms || event.expiration_at_ms || "na"}`

        logger('info', 'RevenueCat Webhook Received', { type, userId, productIdentifier });

        const duplicate = await hasProcessedWebhookEvent("revenuecat", idempotencyEventId)
        if (duplicate) {
            return createApiResponse({ received: true, duplicate: true });
        }

        let planId = 'ph-free';
        if (productIdentifier.includes('pro')) planId = 'ph-pro';
        else if (productIdentifier.includes('plus')) planId = 'ph-plus';
        else if (productIdentifier.includes('premium')) planId = 'ph-premium';

        switch (type) {
            case 'INITIAL_PURCHASE':
            case 'RENEWAL':
            case 'UNCANCEL':
                // Use the new @unique revenueCatIdentifier for upserts
                await (db.subscription as any).upsert({
                    where: {
                        revenueCatIdentifier: productIdentifier
                    },
                    update: {
                        status: 'active',
                        planId,
                        currentPeriodEnd: expirationAt || daysFromNow(SUBSCRIPTION_PERIOD_DAYS),
                        autoRenew: true,
                        provider: 'revenue_cat'
                    },
                    create: {
                        userId,
                        planId,
                        provider: 'revenue_cat',
                        status: 'active',
                        currentPeriodStart: purchaseDate,
                        currentPeriodEnd: expirationAt || daysFromNow(SUBSCRIPTION_PERIOD_DAYS),
                        revenueCatIdentifier: productIdentifier
                    }
                });
                break;

            case 'CANCELLATION':
            case 'EXPIRATION':
                await (db.subscription as any).updateMany({
                    where: { userId, provider: 'revenue_cat' },
                    data: { status: 'expired', autoRenew: false }
                });
                break;

            case 'BILLING_ISSUE':
                await (db.subscription as any).updateMany({
                    where: { userId, provider: 'revenue_cat' },
                    data: { status: 'past_due' }
                });
                break;

            default:
                logger('info', 'Unhandled RevenueCat event type', { type });
        }

            await markWebhookEventProcessed({
                provider: "revenuecat",
                eventId: idempotencyEventId,
                sourceRoute: "/api/v1/billing/revenuecat-webhook",
                status: "processed",
                result: { type, userId, productIdentifier },
            })

            return createApiResponse({ received: true });
        } catch (error) {
            logger('error', 'RevenueCat Webhook Error', { error });
            return createApiError("INTERNAL_ERROR", "Internal Server Error", 500);
        }
    }
)
