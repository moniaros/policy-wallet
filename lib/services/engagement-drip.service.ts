import { db } from "../db"
import { NON_LIVE_POLICY_STATUSES } from "../policy-status"
import { emit, isChannelSuppressed } from "../notifications/dispatch"
import { getWelcomeEmail, getDay3Email, getDay7Email } from "../email/templates/engagement-drip"
import { countLiveGapRows } from "@/lib/gaps/gap-rows"

type EngagementDripSummary = {
    welcomeEmailsSent: number
    day3EmailsSent: number
    day7EmailsSent: number
    errors: number
}

/**
 * Engagement drip job: sends onboarding emails at day-0, day-3, and day-7.
 *
 * Logic:
 * - Day 0 (welcome): sent on signup via direct call from the register action.
 *   This cron handles users who somehow missed the welcome email.
 * - Day 3: sent to users who signed up 3 days ago and have NOT uploaded a policy.
 * - Day 7: sent to all users who signed up 7 days ago with a coverage snapshot.
 *
 * Deduplication: uses NotificationEvent to track which emails have been sent.
 * Respects notification preferences.
 */
export async function runEngagementDripJobs(): Promise<EngagementDripSummary> {
    const now = new Date()
    let welcomeEmailsSent = 0
    let day3EmailsSent = 0
    let day7EmailsSent = 0
    let errors = 0

    // ── Day 0: Welcome emails for users created today who haven't received one ──
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const newUsers = await db.user.findMany({
        where: {
            createdAt: { gte: oneDayAgo },
            roles: { contains: "policyholder" },
        },
        select: { id: true, name: true, email: true, preferredLanguage: true },
        take: 500,
    })

    for (const user of newUsers) {
        if (user.email.endsWith("@phone.policywallet.local")) continue

        const alreadySent = await db.notificationEvent.findFirst({
            where: {
                userId: user.id,
                eventType: "engagement_welcome",
            },
            select: { id: true },
        })
        if (alreadySent) continue

        // Pre-filter; `emit` asks the same question again and is authoritative.
        if (await isChannelSuppressed(user.id, "engagement_welcome", "email")) continue

        try {
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            const { subject, html } = getWelcomeEmail(lang, user.name || undefined)
            // Title/message are the bell-facing record and must exist in BOTH
            // languages; the templates are pure, so rendering the other
            // language's subject costs nothing. "Welcome email sent" used to
            // be stored here — an internal English log line in a customer
            // column.
            const result = await emit({
                event: "engagement_welcome",
                userId: user.id,
                title: {
                    el: getWelcomeEmail("el", user.name || undefined).subject,
                    en: getWelcomeEmail("en", user.name || undefined).subject,
                },
                message: {
                    el: "Σας στείλαμε ένα email καλωσορίσματος με τα πρώτα βήματα.",
                    en: "We sent you a welcome email with the first steps.",
                },
                dedupeKey: "engagement_welcome",
                content: { email: { subject, html } },
            })
            if (result.delivered.length > 0) welcomeEmailsSent++
            else if (result.failed.length > 0) errors++
        } catch {
            errors++
        }
    }

    // ── Day 3: Follow-up for users with no policies ──
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)

    const day3Users = await db.user.findMany({
        where: {
            createdAt: { gte: fourDaysAgo, lt: threeDaysAgo },
            roles: { contains: "policyholder" },
        },
        select: { id: true, name: true, email: true, preferredLanguage: true },
        take: 500,
    })

    for (const user of day3Users) {
        if (user.email.endsWith("@phone.policywallet.local")) continue

        const alreadySent = await db.notificationEvent.findFirst({
            where: { userId: user.id, eventType: "engagement_day3" },
            select: { id: true },
        })
        if (alreadySent) continue

        // Only send if user has NO policies — by the same definition of "has"
        // as the day-7 snapshot below and every other outbound surface:
        // soft-deleted / cancelled / still-analyzing rows are not a policy the
        // user holds. Unfiltered, a user whose only upload was deleted counted
        // as "has policies" and never got the nudge.
        const policyCount = await db.policy.count({
            where: {
                ownerUserId: user.id,
                status: { notIn: [...NON_LIVE_POLICY_STATUSES] },
            },
        })
        if (policyCount > 0) continue

        // Pre-filter; `emit` asks the same question again and is authoritative.
        if (await isChannelSuppressed(user.id, "engagement_day3", "email")) continue

        try {
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            const { subject, html } = getDay3Email(lang, user.name || undefined)
            const result = await emit({
                event: "engagement_day3",
                userId: user.id,
                title: {
                    el: getDay3Email("el", user.name || undefined).subject,
                    en: getDay3Email("en", user.name || undefined).subject,
                },
                message: {
                    el: "Σας στείλαμε ένα email με το επόμενο βήμα: το πρώτο σας ασφαλιστήριο.",
                    en: "We sent you an email with the next step: your first policy.",
                },
                dedupeKey: "engagement_day3",
                content: { email: { subject, html } },
            })
            if (result.delivered.length > 0) day3EmailsSent++
            else if (result.failed.length > 0) errors++
        } catch {
            errors++
        }
    }

    // ── Day 7: Coverage snapshot ──
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

    const day7Users = await db.user.findMany({
        where: {
            createdAt: { gte: eightDaysAgo, lt: sevenDaysAgo },
            roles: { contains: "policyholder" },
        },
        select: { id: true, name: true, email: true, preferredLanguage: true },
        take: 500,
    })

    for (const user of day7Users) {
        if (user.email.endsWith("@phone.policywallet.local")) continue

        const alreadySent = await db.notificationEvent.findFirst({
            where: { userId: user.id, eventType: "engagement_day7" },
            select: { id: true },
        })
        if (alreadySent) continue

        // Pre-filter; `emit` asks the same question again and is authoritative.
        if (await isChannelSuppressed(user.id, "engagement_day7", "email")) continue

        // Gather stats — WITH their basis. `gapCount` is a count of recorded
        // GapInstance rows, and a portfolio nobody has ever analysed records
        // none: the same zero as "analysed and clean". The template renders
        // those two zeros differently, so the producer must say how many of
        // these policies the deep pipeline has actually read (`lastAnalyzedAt`
        // is set only by it; a failed run leaves it null, which is honest —
        // that policy has not been analysed).
        //
        // Same real-policy filter as the renewal cron / weekly digest / churn:
        // requiring exactly 'active' silently dropped in-force policies stored
        // as 'expiring_soon' / 'action_needed' / 'incomplete'.
        const policies = await db.policy.findMany({
            where: {
                ownerUserId: user.id,
                status: { notIn: [...NON_LIVE_POLICY_STATUSES] },
            },
            select: { id: true, lastAnalyzedAt: true },
        })
        const policyCount = policies.length
        const analysedPolicyCount = policies.filter((p) => p.lastAnalyzedAt != null).length

        // Scoped to the SAME policies the tile counts, so the figure and its
        // stated basis share a universe — a gap on a deleted or cancelled
        // policy must not render against a live-policy count.
        const gapCount = await countLiveGapRows({ scope: "classified",
            where: {
                policyId: { in: policies.map((p) => p.id) },
                status: { in: ["open", "detected", "acknowledged"] },
            },
        })
        // No score. This email carried the provisional estimate until Aug 2026
        // — 100% for a portfolio nothing had analysed — and the protection
        // score was removed from the product (PW-MOBILE-TRANSFORM-01, H-001).

        try {
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            const { subject, html } = getDay7Email(lang, user.name || undefined, {
                policyCount,
                gapCount,
                analysedPolicyCount,
            })
            const snapshot = { policyCount, gapCount, analysedPolicyCount }
            const result = await emit({
                event: "engagement_day7",
                userId: user.id,
                title: {
                    el: getDay7Email("el", user.name || undefined, snapshot).subject,
                    en: getDay7Email("en", user.name || undefined, snapshot).subject,
                },
                message: {
                    el: `Η εικόνα σας μετά την πρώτη εβδομάδα: ${policyCount} ασφαλιστήρια, ${analysedPolicyCount} αναλυμένα, ${gapCount} ευρήματα.`,
                    en: `Your picture after the first week: ${policyCount} policies, ${analysedPolicyCount} analysed, ${gapCount} findings.`,
                },
                dedupeKey: "engagement_day7",
                content: { email: { subject, html } },
            })
            if (result.delivered.length > 0) day7EmailsSent++
            else if (result.failed.length > 0) errors++
        } catch {
            errors++
        }
    }

    return { welcomeEmailsSent, day3EmailsSent, day7EmailsSent, errors }
}

// `isEmailEnabled` lived here — the third implementation of "has the user
// switched this off", alongside one inlined in the weekly digest and one in the
// dispatcher. It is now `isChannelSuppressed` in lib/notifications/dispatch,
// which is also what `emit` itself consults, so the pre-filter and the
// authoritative check can no longer disagree.
