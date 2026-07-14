"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logger } from "@/lib/logger"
import { stripe } from "@/lib/stripe"
import { createCheckoutSession } from "@/lib/billing"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { env } from "@/lib/env"
import { syncRevenueCatSubscription } from "@/lib/services/revenuecat.service"
import { daysFromNow, TRIAL_PERIOD_DAYS } from "@/lib/constants/time"

export async function getAccountData() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null

    const userId = authResult.dbUser.id

    // Sync RevenueCat subscription for mobile users
    await syncRevenueCatSubscription(userId)

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
            },
            notificationPreferences: true
        }
    })

    if (!user) return null

    const currentSubscription = user.subscriptions[0] as any
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
        name: user.name,
        email: user.email!,
        phone_number: user.phoneNumber,
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
        provider: currentSubscription.provider as 'stripe' | 'revenue_cat',
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
        current_period_end: daysFromNow(TRIAL_PERIOD_DAYS).toISOString(),
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

    const uinotificationPreferences = user.notificationPreferences.map(p => ({
        preference_id: p.id,
        event_type: p.eventType,
        channel: p.channel,
        enabled: p.enabled
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
        securityEvents: uiSecurity,
        notificationPreferences: uinotificationPreferences
    }
}

export async function updatePreferredLanguage(language: 'el' | 'en') {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.user.update({
        where: { id: authResult.dbUser.id },
        data: { preferredLanguage: language }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function logoutSession(sessionId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.activeSession.delete({
        where: { id: sessionId, userId: authResult.dbUser.id }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function logoutAllSessions() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.activeSession.deleteMany({
        where: { userId: authResult.dbUser.id }
    })

    revalidatePath("/account")
    return { success: true }
}

/**
 * Start a paid upgrade. ALWAYS goes through Stripe Checkout — the old
 * "no stripePriceId → grant the plan for free" fallback was a revenue bug
 * (existing free-granted subscriptions are grandfathered until their
 * currentPeriodEnd; see docs/STATUS.md).
 */
export async function upgradeSubscription(
    planId: string,
    billingPeriod: "monthly" | "annual" = "monthly",
    returnTo?: string
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const plan = await db.plan.findUnique({ where: { id: planId } })
    if (!plan) return { error: "Plan not found" }
    if (Number(plan.price) <= 0) return { error: "Plan is not purchasable" }

    try {
        const checkout = await createCheckoutSession(
            authResult.dbUser.id,
            planId,
            billingPeriod,
            returnTo
        )
        // Server-action checkouts (upgrade page, account, agent pricing)
        // bypass /api/v1/billing/checkout — mirror the funnel event here too.
        await recordConversionEvent(authResult.dbUser.id, "checkout_started", {
            plan: planId,
            billingPeriod,
            source: "upgrade_action",
        })
        return { url: checkout.url }
    } catch (error) {
        logger('error', 'Stripe checkout creation failed', { error })
        return { error: "Failed to initialize payment" }
    }
}

export async function createBillingPortalSession() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    if (!authResult.dbUser.stripeCustomerId) {
        return { error: "No billing information found" }
    }

    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: authResult.dbUser.stripeCustomerId,
            return_url: `${env.NEXTAUTH_URL || 'http://localhost:3000'}/account`,
        })

        return { url: session.url }
    } catch (error) {
        logger('error', 'Stripe portal creation failed', { error })
        return { error: "Failed to open billing portal" }
    }
}

export async function cancelSubscription() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const activeSubs = await db.subscription.findMany({
        where: { userId: authResult.dbUser.id, status: 'active' },
        select: { id: true, stripeSubscriptionId: true },
    })

    // Cancel at Stripe FIRST (cancel_at_period_end keeps access until the
    // paid period lapses, matching the pricing FAQ). The old version only
    // flipped the local autoRenew flag — Stripe kept billing the customer.
    for (const sub of activeSubs) {
        if (!sub.stripeSubscriptionId) continue // grandfathered / RevenueCat rows
        try {
            await stripe.subscriptions.update(sub.stripeSubscriptionId, {
                cancel_at_period_end: true,
            })
        } catch (error) {
            const code = (error as { code?: string })?.code
            if (code === "resource_missing") {
                // Already gone on Stripe's side — safe to stop renewals locally.
                continue
            }
            logger('error', 'Stripe cancel_at_period_end failed', {
                stripeSubscriptionId: sub.stripeSubscriptionId,
                error: error instanceof Error ? error.message : String(error),
            })
            // Do NOT flip local state when Stripe still considers the
            // subscription renewing — a silent local-only "cancel" is the
            // exact dishonesty this replaces.
            return { error: "Failed to cancel the subscription with Stripe. Please try again or use the billing portal." }
        }
    }

    await db.subscription.updateMany({
        where: { userId: authResult.dbUser.id, status: 'active' },
        data: { autoRenew: false }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function deleteAccount() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const userId = authResult.dbUser.id

    try {
        const existingOpenRequest = await db.deletionRequest.findFirst({
            where: {
                userId,
                status: {
                    in: ["requested", "in_review", "approved", "processing"],
                },
            },
        })

        if (existingOpenRequest) {
            return { error: "A deletion request is already in progress." }
        }

        const request = await db.deletionRequest.create({
            data: {
                userId,
                status: "requested",
                legalBasis: "GDPR_ARTICLE_17",
            },
        })

        // High priority audit log
        await (db.activityLog as any).create({
            data: {
                adminUserId: userId,
                adminEmail: "security",
                actionType: "ACCOUNT_DELETION_REQUESTED",
                description: `User account ${userId} requested GDPR deletion. Request id: ${request.id}`,
                isBreakGlass: true
            }
        })

        logger('info', 'Account deletion requested', { userId, requestId: request.id })

        return { success: true, requestId: request.id }
    } catch (error) {
        logger('error', 'Account deletion request failed', { userId, error })
        return { error: "Failed to create deletion request" }
    }
}

export async function updateProfile({ name, phone }: { name?: string; phone?: string }) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.user.update({
        where: { id: authResult.dbUser.id },
        data: {
            ...(name && { name }),
            ...(phone && { phoneNumber: phone })
        }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function updateEmail(newEmail: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // In production, trigger a verification email flow
    await db.user.update({
        where: { id: authResult.dbUser.id },
        data: { email: newEmail }
    })

    // Log security event
    await db.securityEvent.create({
        data: {
            userId: authResult.dbUser.id,
            eventType: 'email_change',
            ipAddress: '192.168.1.1', // Mock
            userAgent: 'System Update'
        }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function updatePassword(newPassword: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // In production, encrypt!
    await db.user.update({
        where: { id: authResult.dbUser.id },
        data: { password: newPassword }
    })

    // Log security event
    await db.securityEvent.create({
        data: {
            userId: authResult.dbUser.id,
            eventType: 'password_change',
            ipAddress: '192.168.1.1', // Mock
            userAgent: 'System Update'
        }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function toggleNotificationPreference(eventType: string, channel: string, enabled: boolean) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.notificationPreference.upsert({
        where: {
            userId_eventType_channel: {
                userId: authResult.dbUser.id,
                eventType,
                channel
            }
        },
        update: { enabled },
        create: {
            userId: authResult.dbUser.id,
            eventType,
            channel,
            enabled
        }
    })

    revalidatePath("/account")
    return { success: true }
}
