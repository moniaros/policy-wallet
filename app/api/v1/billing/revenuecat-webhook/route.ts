
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const REVENUECAT_WEBHOOK_AUTH_VALUE = process.env.REVENUECAT_WEBHOOK_AUTH_VALUE;

export async function POST(req: NextRequest) {
    try {
        if (REVENUECAT_WEBHOOK_AUTH_VALUE) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH_VALUE}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await req.json();
        const { event } = body;

        if (!event) {
            return NextResponse.json({ error: 'No event data' }, { status: 400 });
        }

        const userId = event.app_user_id;
        const type = event.type;
        const productIdentifier = event.product_id;
        const expirationAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
        const purchaseDate = event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date();

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

        return NextResponse.json({ received: true });
    } catch (error) {
        logger('error', 'RevenueCat Webhook Error', { error });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
