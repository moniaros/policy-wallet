"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { createAdminClient } from "@/lib/supabase/admin"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { stripe } from "@/lib/stripe"
import { createCheckoutSession } from "@/lib/billing"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { getSiteOrigin } from "@/lib/seo/site"
import { NOTIFICATION_PREFERENCE_GROUPS } from "@/lib/notifications/preference-registry"
import { preferenceRowsForStream } from "@/lib/notifications/preference-channels"

/**
 * Start a paid upgrade. ALWAYS goes through Stripe Checkout — the old
 * "no stripePriceId → grant the plan for free" fallback was a revenue bug
 * (existing free-granted subscriptions are grandfathered until their
 * currentPeriodEnd; see docs/STATUS.md).
 */
// Bilingual account-action error. These strings are shown VERBATIM
// (toast.error(result.error) on the upgrade/account pages), so on the Greek-
// default app they must be localised at source — lint:i18n-changed only sees .tsx.
const acctErr = (language: "el" | "en", el: string, en: string) => (language === "el" ? el : en)

export async function upgradeSubscription(
    planId: string,
    billingPeriod: "monthly" | "annual" = "monthly",
    returnTo?: string
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: acctErr("el", "Μη εξουσιοδοτημένη πρόσβαση", "Unauthorized") }
    const language: "el" | "en" = (authResult.dbUser.preferredLanguage as "el" | "en") || "el"

    const plan = await db.plan.findUnique({ where: { id: planId } })
    if (!plan) return { error: acctErr(language, "Το πρόγραμμα δεν βρέθηκε", "Plan not found") }
    if (Number(plan.price) <= 0) return { error: acctErr(language, "Το πρόγραμμα δεν είναι διαθέσιμο για αγορά", "Plan is not purchasable") }
    // Admin-deactivated plans take no new checkouts (createCheckoutSession
    // enforces this too — this is the friendlier server-action error path).
    if (plan.isActive === false) return { error: acctErr(language, "Το πρόγραμμα δεν είναι διαθέσιμο για αγορά", "Plan is not purchasable") }

    // Don't start a redundant checkout for the plan the user is already on
    // (the pricing UI disables that button; this is the server-side backstop).
    const existing = await db.subscription.findFirst({
        where: { userId: authResult.dbUser.id, planId, status: "active" },
    })
    if (existing) return { error: acctErr(language, "Είστε ήδη σε αυτό το πρόγραμμα.", "You are already on this plan.") }

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
        return { error: acctErr(language, "Αποτυχία έναρξης της πληρωμής", "Failed to initialize payment") }
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
    if (!authResult) return { error: acctErr("el", "Μη εξουσιοδοτημένη πρόσβαση", "Unauthorized") }
    const language: "el" | "en" = (authResult.dbUser.preferredLanguage as "el" | "en") || "el"

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
            return { error: acctErr(language, "Αποτυχία ακύρωσης της συνδρομής μέσω Stripe. Δοκιμάστε ξανά ή χρησιμοποιήστε την πύλη χρεώσεων.", "Failed to cancel the subscription with Stripe. Please try again or use the billing portal.") }
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

        // The subject is both actor and subject here, so targetUserId is the
        // same id — the row still belongs in the right-of-access trail.
        //
        // This used to set `isBreakGlass: true`. It was the only write of that
        // column anywhere, and it was the wrong event for it: a person
        // exercising Art. 17 on their own account is the opposite of an
        // emergency override of someone else's data. The column is gone.
        await (db.activityLog as any).create({
            data: {
                adminUserId: userId,
                adminEmail: "security",
                actionType: "ACCOUNT_DELETION_REQUESTED",
                description: `User account ${userId} requested GDPR deletion. Request id: ${request.id}`,
                targetUserId: userId,
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


/**
 * Switch one notification stream on or off — across EVERY channel that
 * reaches the customer outside the app.
 *
 * The export this replaced (`toggleNotificationPreference`) took
 * `(eventType, channel, enabled)` and the settings screen called it with
 * `channel: "email"` hardcoded: a switch labelled as the stream governed one
 * pipe of it, so "off" silenced email while push — an implemented transport,
 * VAPID-keyed in production — kept firing, and the customer was told nothing.
 * The channel dimension is decided here, derived from the channel registry
 * (`PREFERENCE_CHANNELS`); a client cannot name a channel, and only streams
 * the preference registry declares are writable. `in_app` is deliberately
 * not governed — see lib/notifications/preference-channels.ts.
 *
 * One transaction: the switch governs the whole stream, and a half-applied
 * write is exactly the split state the group exists to prevent.
 */
export async function setNotificationStreamPreference(eventType: string, enabled: boolean) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const group = NOTIFICATION_PREFERENCE_GROUPS.find((g) => g.eventType === eventType)
    // "use server" makes this a public endpoint: refuse anything but the
    // declared streams rather than writing arbitrary rows.
    if (!group) return { error: "Unknown stream" }

    const rows = preferenceRowsForStream(authResult.dbUser.id, group, enabled)
    await db.$transaction(
        rows.map((row) =>
            db.notificationPreference.upsert({
                where: {
                    userId_eventType_channel: {
                        userId: row.userId,
                        eventType: row.eventType,
                        channel: row.channel,
                    },
                },
                update: { enabled: row.enabled },
                create: row,
            })
        )
    )

    revalidatePath("/account/notifications")
    return { success: true }
}
