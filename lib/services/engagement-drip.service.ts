import { db } from "../db"
import { emit, isChannelSuppressed } from "../notifications/dispatch"
import { getWelcomeEmail, getDay3Email, getDay7Email } from "../email/templates/engagement-drip"
import { provisionalProtectionScore } from "./gap-engine/protection-score"

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
            const result = await emit({
                event: "engagement_welcome",
                userId: user.id,
                title: subject,
                message: "Welcome email sent",
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

        // Only send if user has NO policies
        const policyCount = await db.policy.count({
            where: { ownerUserId: user.id },
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
                title: subject,
                message: "Day 3 follow-up sent",
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

        // Gather stats
        const policies = await db.policy.findMany({
            where: { ownerUserId: user.id, status: "active" },
            select: { id: true },
        })
        const policyCount = policies.length

        const openGaps = await db.gapInstance.findMany({
            where: {
                policy: { ownerUserId: user.id },
                status: { in: ["open", "detected", "acknowledged"] },
            },
            select: { severity: true },
        })
        const gapCount = openGaps.length
        // The shared provisional estimate — null with no policies, and always
        // provisional here because this path never consults the gap engine.
        const healthScore = provisionalProtectionScore(policyCount, openGaps.map((g) => g.severity))

        try {
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            const { subject, html } = getDay7Email(lang, user.name || undefined, {
                policyCount,
                healthScore,
                gapCount,
            })
            const result = await emit({
                event: "engagement_day7",
                userId: user.id,
                title: subject,
                message: `Coverage snapshot: ${policyCount} policies, ${healthScore === null ? 'n/a' : `${healthScore}%`} provisional score, ${gapCount} gaps`,
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
