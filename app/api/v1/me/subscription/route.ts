import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"

export async function GET() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    try {
        const user = await db.user.findUnique({
            where: { id: authResult.dbUser.id },
            include: {
                subscriptions: {
                    where: { status: "active" },
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    include: { plan: true }
                }
            }
        })

        if (!user) return createApiError("NOT_FOUND", "User not found", 404)

        // Default Free Plan Fallback
        const subscription = user.subscriptions[0]
        const plan = subscription?.plan

        const finalPlan = plan ? {
            name: plan.name, // e.g., 'pro'
            display_name: plan.displayName,
            price: Number(plan.price),
            currency: plan.currency,
            billing_period: plan.billingPeriod
        } : {
            name: "free",
            display_name: "Dwrean Paketo", // ASCII to avoid encoding issues if env varies
            price: 0,
            currency: "EUR",
            billing_period: "monthly"
        }

        const usage = {
            policies_created: await db.policy.count({ where: { ownerUserId: authResult.dbUser.id, status: { not: "deleted" } } }),
            policies_limit: subscription ? 100 : 5, // Simple logic: Free=5, Paid=100
            ai_reviews_used: await db.policyDocument.count({ where: { uploadedByUserId: authResult.dbUser.id } }), // Approximate
            ai_reviews_limit: subscription ? 50 : 3
        }

        return createApiResponse({
            data: {
                subscription: {
                    id: subscription?.id || "sub_free_default",
                    plan: finalPlan,
                    status: subscription?.status || "active",
                    current_period_end: subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    auto_renew: subscription?.autoRenew ?? true
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
