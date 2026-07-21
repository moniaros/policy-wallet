"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { createAdminClient } from "@/lib/supabase/admin"
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
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { FREE_LIFETIME_QUESTIONS } from "@/lib/monetization/feature-gates"
import { getSiteOrigin } from "@/lib/seo/site"

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

    // 4. Fetch Referrals & Credit Transactions.
    // These are per-user ledgers that grow without bound; the account page shows
    // recent history, so cap each read. The most recent creditTransaction still
    // carries the running balance.
    const referrals = await db.referral.findMany({
        where: { referrerUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    })

    const creditTransactions = await db.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    })

    const creditBalance = creditTransactions.length > 0
        ? creditTransactions[0].balanceAfter
        : 0

    // 5. Fetch Invoices
    const invoices = await db.invoice.findMany({
        where: { userId },
        orderBy: { billingDate: 'desc' },
        take: 50,
    })

    // An open GDPR deletion request drives the Settings danger-zone state
    // (pending panel instead of the request button).
    const openDeletionRequest = await db.deletionRequest.findFirst({
        where: {
            userId,
            status: { in: ["requested", "in_review", "approved", "processing"] },
        },
        select: { id: true, status: true, requestedAt: true },
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

    // Conversion meters: what the user has actually consumed of the free
    // floor (1 trial analysis, FREE_LIFETIME_QUESTIONS questions) and of a
    // paid plan's monthly analysis allowance. entitlementUsage rows don't
    // cover these, so they're computed here.
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const [entitlements, questionsAsked, analysesThisMonth] = await Promise.all([
        resolveUserEntitlements(userId),
        db.activityLog.count({
            where: { adminUserId: userId, actionType: "POLICY_QUESTION_ASKED" },
        }),
        db.activityLog.count({
            where: {
                adminUserId: userId,
                actionType: "POLICY_ANALYZED",
                timestamp: { gte: startOfMonth },
            },
        }),
    ])

    const conversionUsage = {
        tier: entitlements.tier,
        trialAnalysisAvailable: user.trialAnalysisUsedAt === null,
        freeQuestionsUsed: Math.min(questionsAsked, FREE_LIFETIME_QUESTIONS),
        freeQuestionsLimit: FREE_LIFETIME_QUESTIONS,
        analysesUsedThisMonth: analysesThisMonth,
        analysesLimitPerMonth: entitlements.limits.aiAnalysisPerMonth,
    }

    return {
        user: uiUser,
        currentSubscription: finalSubscription,
        currentPlan: finalPlan,
        conversionUsage,
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
        notificationPreferences: uinotificationPreferences,
        pendingDeletion: !!openDeletionRequest
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
    // Admin-deactivated plans take no new checkouts (createCheckoutSession
    // enforces this too — this is the friendlier server-action error path).
    if (plan.isActive === false) return { error: "Plan is not purchasable" }

    // Don't start a redundant checkout for the plan the user is already on
    // (the pricing UI disables that button; this is the server-side backstop).
    const existing = await db.subscription.findFirst({
        where: { userId: authResult.dbUser.id, planId, status: "active" },
    })
    if (existing) return { error: "You are already on this plan." }

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
            return_url: `${getSiteOrigin()}/account`,
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
            // Machine-readable code — the Settings UI maps it to localized copy.
            return { error: "DELETION_ALREADY_PENDING" }
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

/**
 * Self-service withdrawal of a pending deletion request. Only possible while
 * the request has not been approved for execution — after that the erasure
 * may already be in flight and withdrawal goes through support. The row is
 * kept (finalized as rejected with a withdrawal note) so the request history
 * stays accountable.
 */
export async function cancelDeletionRequest() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const userId = authResult.dbUser.id

    const openRequest = await db.deletionRequest.findFirst({
        where: {
            userId,
            status: { in: ["requested", "in_review"] },
        },
    })

    if (!openRequest) {
        const inFlight = await db.deletionRequest.findFirst({
            where: { userId, status: { in: ["approved", "processing"] } },
            select: { id: true },
        })
        return { error: inFlight ? "DELETION_IN_FLIGHT" : "NO_OPEN_REQUEST" }
    }

    await db.deletionRequest.update({
        where: { id: openRequest.id },
        data: {
            status: "rejected",
            reviewedAt: new Date(),
            operatorNotes: `${openRequest.operatorNotes ? `${openRequest.operatorNotes}\n` : ""}${new Date().toISOString()} - Withdrawn by the data subject (self-service)`,
        },
    })

    await (db.activityLog as any).create({
        data: {
            adminUserId: userId,
            adminEmail: "security",
            actionType: "ACCOUNT_DELETION_WITHDRAWN",
            description: `User ${userId} withdrew deletion request ${openRequest.id}`,
        }
    })

    revalidatePath("/account")
    return { success: true }
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

    const email = String(newEmail || "").trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "INVALID_EMAIL" }
    if (email === (authResult.dbUser.email || "").toLowerCase()) return { success: true }

    // The app resolves the DB user FROM the Supabase auth email, so the two must
    // change together. The old code wrote only the DB column → on the next
    // request the auth email no longer matched any row and the user was locked
    // out. Update Supabase auth (the source of truth) first, then mirror to the
    // DB. A verified-change email flow is a further enhancement; this at least
    // never desyncs.
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(authResult.supabaseUser.id, {
        email,
        email_confirm: true,
    })
    if (error) {
        return { error: /already|exists|registered/i.test(error.message) ? "EMAIL_IN_USE" : "EMAIL_UPDATE_FAILED" }
    }

    await db.user.update({
        where: { id: authResult.dbUser.id },
        data: { email },
    })

    await db.securityEvent.create({
        data: {
            userId: authResult.dbUser.id,
            eventType: 'email_change',
            ipAddress: 'unknown',
            userAgent: 'account-settings',
        }
    })

    revalidatePath("/account")
    return { success: true }
}

export async function updatePassword(newPassword: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    if (String(newPassword || "").length < 8) return { error: "WEAK_PASSWORD" }

    // Real auth is Supabase — set the login password THERE. The old code wrote
    // the plaintext into a User.password column (a credential at rest) and
    // changed nothing about the actual login, so the "change password" feature
    // silently did nothing while leaking the typed password.
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(authResult.supabaseUser.id, {
        password: newPassword,
    })
    if (error) return { error: "PASSWORD_UPDATE_FAILED" }

    await db.securityEvent.create({
        data: {
            userId: authResult.dbUser.id,
            eventType: 'password_change',
            ipAddress: 'unknown',
            userAgent: 'account-settings',
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
