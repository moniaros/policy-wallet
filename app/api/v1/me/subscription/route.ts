import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { requireApiUser } from "@/lib/api-auth"
import { daysFromNow, SUBSCRIPTION_PERIOD_DAYS } from "@/lib/constants/time"

export async function GET() {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const user = await db.user.findUnique({
            where: { id: authResult.dbUser.id },
            // Only the subscription is read (A-01b).
            select: {
                subscriptions: {
                    where: { status: "active" },
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    include: { plan: true }
                }
            }
        })

        if (!user) return createApiError("NOT_FOUND", "User not found", 404)

        const subscription = user.subscriptions[0]
        const plan = subscription?.plan
        const entitlements = await resolveUserEntitlements(authResult.dbUser.id)

        const finalPlan = plan
            ? {
            name: plan.name, // e.g., 'pro'
            display_name: plan.displayName,
            price: Number(plan.price),
            currency: plan.currency,
            billing_period: plan.billingPeriod
            }
            : {
                name: entitlements.tier,
                display_name: entitlements.tier === "free" ? "Free Plan" : entitlements.tier.toUpperCase(),
                price: 0,
                currency: "EUR",
                billing_period: "monthly",
            }

        const usage = {
            policies_created: await db.policy.count({ where: { ownerUserId: authResult.dbUser.id, status: { not: "deleted" } } }),
            policies_limit: entitlements.limits.policies,
            ai_reviews_used: await db.policyDocument.count({ where: { uploadedByUserId: authResult.dbUser.id } }), // Approximate
            ai_reviews_limit: entitlements.limits.aiAnalysisPerMonth
        }

        return createApiResponse({
            data: {
                subscription: {
                    id: subscription?.id || "sub_free_default",
                    plan: finalPlan,
                    status: entitlements.status,
                    current_period_end: subscription?.currentPeriodEnd || daysFromNow(SUBSCRIPTION_PERIOD_DAYS),
                    auto_renew: subscription?.autoRenew ?? true
                },
                entitlements: {
                    tier: entitlements.tier,
                    limits: entitlements.limits,
                },
                usage,
                credit_balance: (user as any).creditBalance || 0
            }
        })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}
