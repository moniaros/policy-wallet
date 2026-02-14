
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { z } from 'zod';
import { createApiResponse, createApiError } from "@/lib/api-utils";

// PUBLIC_ENDPOINT_AUTH_STRATEGY: bearer_webhook_secret + zod_payload_validation

const revenueCatEventSchema = z.object({
    app_user_id: z.string().min(1),
    type: z.string().min(1),
    product_id: z.string().min(1),
    expiration_at_ms: z.union([z.number(), z.string()]).optional(),
    purchased_at_ms: z.union([z.number(), z.string()]).optional(),
});

const revenueCatWebhookSchema = z.object({
    event: revenueCatEventSchema,
});

export async function POST(req: NextRequest) {
    try {
        if (!env.REVENUECAT_WEBHOOK_AUTH_VALUE) {
            logger('error', 'RevenueCat webhook secret is not configured');
            return createApiError("SERVICE_UNAVAILABLE", "Webhook auth not configured", 503);
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return createApiError("UNAUTHORIZED", "Unauthorized", 401);
        }
        if (authHeader !== `Bearer ${env.REVENUECAT_WEBHOOK_AUTH_VALUE}`) {
            return createApiError("UNAUTHORIZED", "Unauthorized", 401);
        }

        const { event } = revenueCatWebhookSchema.parse(await req.json());

        const userId = event.app_user_id;
        const type = event.type;
        const productIdentifier = event.product_id;
        const expirationAt = event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)) : null;
        const purchaseDate = event.purchased_at_ms ? new Date(Number(event.purchased_at_ms)) : new Date();

        logger('info', 'RevenueCat Webhook Received', { type, userId, productIdentifier });

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
                        currentPeriodEnd: expirationAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        autoRenew: true,
                        provider: 'revenue_cat'
                    },
                    create: {
                        userId,
                        planId,
                        provider: 'revenue_cat',
                        status: 'active',
                        currentPeriodStart: purchaseDate,
                        currentPeriodEnd: expirationAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

        return createApiResponse({ received: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid webhook payload", 400, error.issues);
        }
        logger('error', 'RevenueCat Webhook Error', { error });
        return createApiError("INTERNAL_ERROR", "Internal Server Error", 500);
    }
}
