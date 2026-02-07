
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;

/**
 * Syncs a user's subscription status from RevenueCat
 * @param userId - Our internal User ID, which should match RevenueCat's App User ID
 */
export async function syncRevenueCatSubscription(userId: string) {
    if (!REVENUECAT_API_KEY) {
        logger('warn', 'REVENUECAT_API_KEY is not set. Skipping sync.');
        return null;
    }

    try {
        const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${REVENUECAT_API_KEY}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`RevenueCat API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const entitlements = data.subscriber?.entitlements?.active;

        if (!entitlements || Object.keys(entitlements).length === 0) {
            // No active entitlements. Expire existing RC sub
            await (db.subscription as any).updateMany({
                where: { userId, provider: 'revenue_cat', status: 'active' },
                data: { status: 'expired' }
            });
            return null;
        }

        // Find the "best" or most relevant entitlement
        let activeEntitlement = entitlements['pro'] || entitlements['plus'] || entitlements['premium'] || Object.values(entitlements)[0];
        if (!activeEntitlement) return null;

        const productIdentifier = (activeEntitlement as any).product_identifier;
        const expirationDate = (activeEntitlement as any).expires_date ? new Date((activeEntitlement as any).expires_date) : null;

        // Map RC entitlement to internal plan ID
        let planId = 'ph-free';
        const entitlementId = Object.keys(entitlements).find(key => entitlements[key] === activeEntitlement);

        if (entitlementId === 'pro') planId = 'ph-pro';
        else if (entitlementId === 'plus') planId = 'ph-plus';
        else if (entitlementId === 'premium') planId = 'ph-premium';

        // Upsert subscription
        const existingSub = await (db.subscription as any).findFirst({
            where: { userId, provider: 'revenue_cat' }
        });

        if (existingSub) {
            await (db.subscription as any).update({
                where: { id: existingSub.id },
                data: {
                    status: 'active',
                    planId: planId,
                    currentPeriodEnd: expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    autoRenew: (activeEntitlement as any).will_renew,
                    revenueCatIdentifier: productIdentifier,
                    updatedAt: new Date()
                }
            });
        } else {
            await (db.subscription as any).create({
                data: {
                    userId,
                    planId,
                    provider: 'revenue_cat',
                    status: 'active',
                    currentPeriodStart: new Date((activeEntitlement as any).purchase_date),
                    currentPeriodEnd: expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    autoRenew: (activeEntitlement as any).will_renew,
                    revenueCatIdentifier: productIdentifier
                }
            });
        }

        logger('info', 'Synced RevenueCat subscription', { userId, planId });
        return { planId, status: 'active' };

    } catch (error) {
        logger('error', 'Failed to sync RevenueCat subscription', { userId, error });
        return null;
    }
}
