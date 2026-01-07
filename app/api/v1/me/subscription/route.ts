import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            include: {
                subscriptions: {
                    where: { status: "active" },
                    take: 1,
                    orderBy: { createdAt: "desc" }
                }
            }
        })

        // Mock subscription data if none exists for MVP
        const subscription = user?.subscriptions[0] || {
            id: "sub_free",
            planId: "free",
            status: "active",
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }

        // Mock usage limits
        const usage = {
            policies_created: await db.policy.count({ where: { ownerUserId: session.user.id, status: { not: "deleted" } } }),
            policies_limit: 5,
            ai_reviews_used: 0,
            ai_reviews_limit: 3
        }

        return NextResponse.json({
            data: {
                subscription: {
                    id: subscription.id,
                    plan: {
                        name: "Free",
                        display_name: "Δωρεάν Πακέτο",
                        price: 0,
                        currency: "EUR",
                        billing_period: "monthly"
                    },
                    status: subscription.status,
                    current_period_end: (subscription as any).currentPeriodEnd,
                    auto_renew: true
                },
                usage,
                credit_balance: (user as any).creditBalance || 0
            },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Server error", status: 500 } },
            { status: 500 }
        )
    }
}
