"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getAccountData() {
    const session = await auth()
    if (!session?.user?.id) return null

    const userId = session.user.id

    // 1. Fetch User & Current Subscription
    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            subscriptions: {
                where: { status: 'active' },
                include: { plan: true },
                orderBy: { createdAt: 'desc' },
                take: 1
            },
            paymentMethods: true,
            activeSessions: {
                orderBy: { lastActiveAt: 'desc' }
            },
            securityEvents: {
                orderBy: { createdAt: 'desc' },
                take: 10
            }
        }
    })

    if (!user) return null

    const currentSubscription = user.subscriptions[0]
    const currentPlan = currentSubscription?.plan

    // 2. Fetch Available Plans (for the user's current role context)
    // We'll determine the context from the current session or most prominent role
    const activeRole = user.roles.includes('agent') ? 'agent' : 'policyholder'
    const availablePlans = await db.plan.findMany({
        where: { planType: activeRole }
    })

    // 3. Fetch Usage Metrics
    const usageMetrics = await db.entitlementUsage.findMany({
        where: { userId }
    })

    // 4. Fetch Referrals & Credit Transactions
    const referrals = await db.referral.findMany({
        where: { referrerUserId: userId },
        orderBy: { createdAt: 'desc' }
    })

    const creditTransactions = await db.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    })

    const creditBalance = creditTransactions.length > 0
        ? creditTransactions[0].balanceAfter
        : 0

    // 5. Fetch Invoices
    const invoices = await db.invoice.findMany({
        where: { userId },
        orderBy: { billingDate: 'desc' }
    })

    // Transform for UI (Bridging snake_case and handling types)
    const uiUser = {
        user_id: user.id,
        email: user.email!,
        preferred_language: user.preferredLanguage as 'el' | 'en',
        role: user.roles,
        created_at: user.createdAt.toISOString()
    }

    const uiSubscription = currentSubscription ? {
        subscription_id: currentSubscription.id,
        user_id: currentSubscription.userId,
        plan_id: currentSubscription.planId,
        status: currentSubscription.status as 'active' | 'cancelled',
        current_period_start: currentSubscription.currentPeriodStart.toISOString(),
        current_period_end: currentSubscription.currentPeriodEnd.toISOString(),
        next_billing_date: currentSubscription.autoRenew ? currentSubscription.currentPeriodEnd.toISOString() : null,
        created_at: currentSubscription.createdAt.toISOString()
    } : null

    const uiPlan = currentPlan ? {
        plan_id: currentPlan.id,
        plan_type: currentPlan.planType as 'policyholder' | 'agent',
        name: currentPlan.displayName,
        price: Number(currentPlan.price),
        currency: currentPlan.currency,
        billing_interval: currentPlan.billingPeriod === 'monthly' ? 'month' : 'year',
        entitlements: currentPlan.entitlements as any
    } : null

    // Fallback if no specific subscription exists (e.g., seeding didn't catch it)
    const fallbackPlan = availablePlans.find(p => Number(p.price) === 0) || availablePlans[0]

    const finalPlan = uiPlan || {
        plan_id: fallbackPlan?.id || 'free',
        plan_type: activeRole as any,
        name: fallbackPlan?.displayName || 'Free Plan',
        price: Number(fallbackPlan?.price || 0),
        currency: fallbackPlan?.currency || 'EUR',
        billing_interval: 'month' as const,
        entitlements: (fallbackPlan?.entitlements || {}) as any
    }

    const finalSubscription = uiSubscription || {
        subscription_id: 'sub_temp',
        user_id: userId,
        plan_id: finalPlan.plan_id,
        status: 'active' as const,
        current_period_start: user.createdAt.toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        next_billing_date: null,
        created_at: user.createdAt.toISOString()
    }

    const uiUsage = usageMetrics.map(m => ({
        usage_id: m.id,
        user_id: m.userId,
        subscription_id: m.subscriptionId,
        usage_type: m.usageType as 'ai_analysis' | 'customer_count',
        amount_used: m.amount,
        amount_limit: (finalPlan.entitlements as any)[m.usageType === 'ai_analysis' ? 'ai_analyses_per_month' : 'customer_limit'] || 'unlimited',
        reset_date: finalSubscription.current_period_end,
        period_start: finalSubscription.current_period_start
    }))

    const uiInvoices = invoices.map(i => ({
        invoice_id: i.id,
        user_id: i.userId,
        subscription_id: i.subscriptionId,
        invoice_number: i.invoiceNumber,
        amount_subtotal: Number(i.amount),
        amount_tax: Number(i.taxAmount),
        amount_total: Number(i.totalAmount),
        currency: i.currency,
        status: i.status as any,
        billing_reason: 'subscription_cycle' as const,
        period_start: i.billingDate.toISOString(),
        period_end: i.billingDate.toISOString(),
        issued_at: i.billingDate.toISOString(),
        paid_at: i.paidAt?.toISOString() || null,
        pdf_url: i.pdfUrl
    }))

    const uiPaymentMethods = user.paymentMethods.map(pm => ({
        payment_method_id: pm.id,
        user_id: pm.userId,
        type: pm.type as any,
        card_brand: pm.brand as any,
        card_last4: pm.lastFour,
        card_exp_month: pm.expiryMonth || 12,
        card_exp_year: pm.expiryYear || 2029,
        is_default: pm.isDefault,
        created_at: pm.createdAt.toISOString()
    }))

    const uiSessions = user.activeSessions.map(s => ({
        session_id: s.id,
        user_id: s.userId,
        device_name: s.deviceName,
        device_type: s.deviceType as any,
        ip_address: s.ipAddress,
        location: s.location || 'Unknown',
        is_current: false, // We'll handle this in the client
        last_active_at: s.lastActiveAt.toISOString(),
        created_at: s.createdAt.toISOString()
    }))

    const uiSecurity = user.securityEvents.map(e => ({
        event_id: e.id,
        user_id: e.userId,
        event_type: e.eventType as any,
        device_name: 'System', // Security events don't currently link to ActiveSession
        ip_address: e.ipAddress || '—',
        location: 'Unknown',
        success: true,
        created_at: e.createdAt.toISOString()
    }))

    return {
        user: uiUser,
        currentSubscription: finalSubscription,
        currentPlan: finalPlan,
        availablePlans: availablePlans.map(p => ({
            plan_id: p.id,
            plan_type: p.planType as any,
            name: p.displayName,
            price: Number(p.price),
            currency: p.currency,
            billing_interval: p.billingPeriod === 'monthly' ? 'month' : 'year',
            entitlements: p.entitlements as any
        })),
        usageMetrics: uiUsage,
        creditBalance,
        referrals: referrals.map(r => ({
            referral_id: r.id,
            referrer_user_id: r.referrerUserId,
            referred_user_id: r.referredUserId,
            referred_email: r.referredEmail,
            referred_subscription_id: r.referredSubscriptionId,
            status: r.status as any,
            credited_at: r.creditedAt?.toISOString() || null,
            created_at: r.createdAt.toISOString()
        })),
        creditTransactions: creditTransactions.map(t => ({
            transaction_id: t.id,
            user_id: t.userId,
            amount: t.amount,
            transaction_type: t.transactionType as any,
            balance_after: t.balanceAfter,
            referral_id: t.referralId,
            description: t.description,
            created_at: t.createdAt.toISOString()
        })),
        invoices: uiInvoices,
        paymentMethods: uiPaymentMethods,
        activeSessions: uiSessions,
        securityEvents: uiSecurity
    }
}

export async function updatePreferredLanguage(language: 'el' | 'en') {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await db.user.update({
        where: { id: session.user.id },
        data: { preferredLanguage: language }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function logoutSession(sessionId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await db.activeSession.delete({
        where: { id: sessionId, userId: session.user.id }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function logoutAllSessions() {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await db.activeSession.deleteMany({
        where: { userId: session.user.id }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function upgradeSubscription(planId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const plan = await db.plan.findUnique({ where: { id: planId } })
    if (!plan) return { error: "Plan not found" }

    // In a real app, integrate with Stripe/Payment provider here
    await db.subscription.updateMany({
        where: { userId: session.user.id, status: 'active' },
        data: { status: 'expired' }
    })

    await db.subscription.create({
        data: {
            userId: session.user.id,
            planId: planId,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoRenew: true
        }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function cancelSubscription() {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await db.subscription.updateMany({
        where: { userId: session.user.id, status: 'active' },
        data: { autoRenew: false }
    })

    revalidatePath("/account")
    return { success: true }
}
