import "server-only"

import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { getCanonicalPlanForTier, getPlanById } from "@/lib/pricing/plan-catalog"
import { syncRevenueCatSubscription } from "@/lib/services/revenuecat.service"
import { startOfAthensMonth } from "@/lib/policy-status"
import { NOTIFICATION_PREFERENCE_GROUPS } from "@/lib/notifications/preference-registry"
import { streamReachesOut } from "@/lib/notifications/preference-channels"
import type { EntitlementLimits, PlanTier } from "@/types/subscription-entitlements"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

/**
 * Per-section loaders.
 *
 * Settings used to run one `getAccountData()` for all three tabs on every
 * visit: the whole subscription graph, 50 referrals and 50 credit transactions
 * for a tab that is not rendered, payment methods and invoices that are never
 * written, and a RevenueCat sync — all to show someone their own name. Each
 * loader here fetches what its own route renders and nothing else.
 */

// ── Profile ──────────────────────────────────────────────────────────

export interface ProfileData {
    name: string | null
    email: string
    phone: string | null
    language: "el" | "en"
    roles: string
    createdAt: string
}

export async function getProfileData(): Promise<ProfileData> {
    const { dbUser } = await getAuthenticatedUser()
    return {
        name: dbUser.name,
        email: dbUser.email ?? "",
        phone: dbUser.phoneNumber,
        language: resolveUserLanguage(dbUser.preferredLanguage),
        roles: dbUser.roles,
        createdAt: dbUser.createdAt.toISOString(),
    }
}

// ── Plan & billing ───────────────────────────────────────────────────

export interface PlanData {
    tier: PlanTier
    isPaid: boolean
    limits: EntitlementLimits
    plan: {
        id: string
        displayName: string
        monthlyEur: number
        annualEur: number
    } | null
    subscription: {
        status: string
        currentPeriodEnd: string
        autoRenew: boolean
        /** "revenue_cat" means the store owns the subscription, not us. */
        provider: string | null
        billingPeriod: "monthly" | "annual"
    } | null
    /** Whether the payment provider has a customer record — no record, no portal. */
    hasBillingAccount: boolean
    usage: {
        /** The binding limit on the organiser tiers. */
        policiesStored: number
        policiesLimit: number | null
        analysesThisMonth: number
        /** null = unlimited. 0 = the tier includes none. */
        analysesLimit: number | null
        /** Whether this tier has an AI allowance worth metering at all. */
        hasAiBudget: boolean
    }
    /** The next tier up, when there is one to sell. */
    upgradeTarget: { id: string; displayName: string; monthlyEur: number } | null
}

const NEXT_TIER: Partial<Record<PlanTier, PlanTier>> = { free: "pro", plus: "pro" }

export async function getPlanData(): Promise<PlanData> {
    const { dbUser } = await getAuthenticatedUser()

    // Mobile subscriptions are owned by the store; this is the one place that
    // needs them reconciled, so the sync lives here rather than on every
    // settings page load.
    await syncRevenueCatSubscription(dbUser.id)

    const [entitlements, subscription, policiesStored, analysesThisMonth] = await Promise.all([
            resolveUserEntitlements(dbUser.id),
            db.subscription.findFirst({
                where: { userId: dbUser.id, status: "active", plan: { planType: { not: "agent" } } },
                include: { plan: true },
                orderBy: { createdAt: "desc" },
            }),
            db.policy.count({ where: { ownerUserId: dbUser.id } }),
            db.activityLog.count({
                where: {
                    adminUserId: dbUser.id,
                    actionType: "POLICY_ANALYZED",
                    // The reader's month, not the server's — see startOfAthensMonth.
                    timestamp: { gte: startOfAthensMonth(new Date()) },
                },
            }),
    ])

    const catalogPlan = subscription?.planId
        ? await getPlanById(subscription.planId)
        : await getCanonicalPlanForTier(entitlements.tier)

    const nextTierKey = NEXT_TIER[entitlements.tier]
    const nextPlan = nextTierKey ? await getCanonicalPlanForTier(nextTierKey) : null

    return {
        tier: entitlements.tier,
        isPaid: entitlements.isPaid,
        limits: entitlements.limits,
        plan: catalogPlan
            ? {
                  id: catalogPlan.id,
                  displayName: catalogPlan.displayName,
                  monthlyEur: catalogPlan.monthlyEur,
                  annualEur: catalogPlan.effectiveAnnualEur,
              }
            : null,
        subscription: subscription
            ? {
                  status: subscription.status,
                  currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
                  autoRenew: subscription.autoRenew,
                  provider: subscription.provider,
                  billingPeriod: subscription.plan?.billingPeriod === "annual" ? "annual" : "monthly",
              }
            : null,
        hasBillingAccount: Boolean(dbUser.stripeCustomerId),
        usage: {
            policiesStored,
            policiesLimit: entitlements.limits.policies,
            analysesThisMonth,
            analysesLimit: entitlements.limits.aiAnalysisPerMonth,
            hasAiBudget:
                entitlements.limits.monthlyTokenBudget === null ||
                entitlements.limits.monthlyTokenBudget > 0,
        },
        upgradeTarget:
            nextPlan && nextPlan.isActive
                ? { id: nextPlan.id, displayName: nextPlan.displayName, monthlyEur: nextPlan.monthlyEur }
                : null,
    }
}

// ── Security ─────────────────────────────────────────────────────────

/**
 * The event types anything in this codebase actually writes. The old settings
 * screen also rendered `logout` and a success/failure flag, and hardcoded a
 * device name and a location for every row — three columns that could only
 * ever print the same constant.
 */
export type SecurityEventType = "login_success" | "email_change" | "password_change"

export interface SecurityData {
    events: Array<{ id: string; type: SecurityEventType | string; ip: string | null; at: string }>
}

export async function getSecurityData(): Promise<SecurityData> {
    const { dbUser } = await getAuthenticatedUser()
    const events = await db.securityEvent.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, eventType: true, ipAddress: true, createdAt: true },
    })

    return {
        events: events.map((e) => ({
            id: e.id,
            type: e.eventType,
            // `unknown` is what the account actions write when they have no
            // request context; showing it as a value would be a lie.
            ip: e.ipAddress && e.ipAddress !== "unknown" ? e.ipAddress : null,
            at: e.createdAt.toISOString(),
        })),
    }
}

// ── Notifications ────────────────────────────────────────────────────

export interface NotificationSettingsData {
    /**
     * Per stream (keyed by the group's primary event type): does it still
     * reach the customer outside the app? Computed here, server-side, by
     * `streamReachesOut` — the client gets a verdict, not raw rows, so the
     * screen never re-derives the channel dimension (and never learns the
     * channel vocabulary; the guard in notification-preference-keys.test.ts
     * holds it to that).
     */
    streams: Record<string, boolean>
    quietHours: { enabled: boolean; start: number; end: number; timezone: string } | null
    /**
     * The §9.5 cadence controls (P1-09b). `outboundPaused` is true only on an
     * explicit stored maxPerDay of 0 — the customer's global off switch. The
     * ceiling lives on the policyholder profile, so `ceilingConfigurable` is
     * false for roles that have none. Null = unreadable; the section hides
     * (same contract as quietHours) rather than rendering controls whose
     * current state it would be guessing.
     */
    cadence: {
        outboundPaused: boolean
        monthlyCeiling: number | null
        ceilingConfigurable: boolean
    } | null
}

async function getCadenceControlsState(dbUser: {
    id: string
    roles: string | null
}): Promise<NotificationSettingsData["cadence"]> {
    try {
        const { parseMonthlyCeiling } = await import("@/lib/notifications/cadence")
        const ceilingConfigurable = (dbUser.roles ?? "")
            .split(",")
            .map((r) => r.trim())
            .includes("policyholder")
        const [settings, profile] = await Promise.all([
            db.userNotificationSettings.findUnique({
                where: { userId: dbUser.id },
                select: { maxPerDay: true },
            }),
            ceilingConfigurable
                ? db.policyholderProfile.findUnique({
                      where: { userId: dbUser.id },
                      select: { preferences: true },
                  })
                : null,
        ])
        const prefs = (profile?.preferences ?? {}) as Record<string, unknown>
        return {
            outboundPaused: settings?.maxPerDay === 0,
            monthlyCeiling: parseMonthlyCeiling(prefs.outboundMonthlyCeiling),
            ceilingConfigurable,
        }
    } catch {
        // Same contract as getQuietHours: a preference read must never take
        // down the page, and controls whose state we would be guessing hide.
        return null
    }
}

export async function getNotificationSettingsData(): Promise<NotificationSettingsData> {
    const { dbUser } = await getAuthenticatedUser()
    const { getQuietHours } = await import("./quiet-hours-actions")

    const [preferences, quietHours, cadence] = await Promise.all([
        db.notificationPreference.findMany({
            where: { userId: dbUser.id },
            select: { eventType: true, channel: true, enabled: true },
        }),
        getQuietHours(),
        getCadenceControlsState(dbUser),
    ])

    const streams: Record<string, boolean> = {}
    for (const group of NOTIFICATION_PREFERENCE_GROUPS) {
        streams[group.eventType] = streamReachesOut(preferences, group)
    }

    return { streams, quietHours: quietHours ?? null, cadence }
}

// ── Privacy & data ───────────────────────────────────────────────────

export interface PrivacyData {
    consents: Array<{ type: string; version: string; acceptedAt: string }>
    aiConsentGiven: boolean
    pendingDeletion: boolean
}

export async function getPrivacyData(): Promise<PrivacyData> {
    const { dbUser } = await getAuthenticatedUser()

    const [rows, openDeletionRequest] = await Promise.all([
        db.consentAudit.findMany({
            where: { userId: dbUser.id },
            orderBy: { acceptedAt: "desc" },
            take: 40,
            select: { consentType: true, policyVersion: true, acceptedAt: true },
        }),
        db.deletionRequest.findFirst({
            where: {
                userId: dbUser.id,
                status: { in: ["requested", "in_review", "approved", "processing"] },
            },
            select: { id: true },
        }),
    ])

    // The audit table is append-only, so a consent given three times has three
    // rows. Only the latest per type is a statement about today.
    const latest = new Map<string, { type: string; version: string; acceptedAt: string }>()
    for (const row of rows) {
        if (latest.has(row.consentType)) continue
        latest.set(row.consentType, {
            type: row.consentType,
            version: row.policyVersion,
            acceptedAt: row.acceptedAt.toISOString(),
        })
    }

    return {
        consents: [...latest.values()],
        aiConsentGiven: Boolean(dbUser.aiProcessingConsentVersion),
        pendingDeletion: Boolean(openDeletionRequest),
    }
}
