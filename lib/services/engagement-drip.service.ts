import { db } from "../db"
import { sendEmail } from "../email/email-service"
import { getWelcomeEmail, getDay3Email, getDay7Email } from "../email/templates/engagement-drip"

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

        const respectsPref = await isEmailEnabled(user.id, "engagement_welcome")
        if (!respectsPref) continue

        try {
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            const { subject, html } = getWelcomeEmail(lang, user.name || undefined)
            await sendEmail({ to: user.email, subject, html })

            await db.notificationEvent.create({
                data: {
                    userId: user.id,
                    eventType: "engagement_welcome",
                    channel: "email",
                    title: subject,
                    message: "Welcome email sent",
                    status: "sent",
                    sentAt: now,
                },
            })
            welcomeEmailsSent++
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

        const respectsPref = await isEmailEnabled(user.id, "engagement_day3")
        if (!respectsPref) continue

        try {
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            const { subject, html } = getDay3Email(lang, user.name || undefined)
            await sendEmail({ to: user.email, subject, html })

            await db.notificationEvent.create({
                data: {
                    userId: user.id,
                    eventType: "engagement_day3",
                    channel: "email",
                    title: subject,
                    message: "Day 3 follow-up sent",
                    status: "sent",
                    sentAt: now,
                },
            })
            day3EmailsSent++
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

        const respectsPref = await isEmailEnabled(user.id, "engagement_day7")
        if (!respectsPref) continue

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
        const criticalGaps = openGaps.filter(g => g.severity === "critical").length
        const highGaps = openGaps.filter(g => g.severity === "high").length
        const mediumGaps = openGaps.filter(g => g.severity === "medium").length
        const lowGaps = openGaps.filter(g => g.severity === "low").length
        const healthScore = policyCount === 0
            ? 0
            : Math.max(0, Math.min(100, 100 - (criticalGaps * 25 + highGaps * 15 + mediumGaps * 8 + lowGaps * 3)))

        try {
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            const { subject, html } = getDay7Email(lang, user.name || undefined, {
                policyCount,
                healthScore,
                gapCount,
            })
            await sendEmail({ to: user.email, subject, html })

            await db.notificationEvent.create({
                data: {
                    userId: user.id,
                    eventType: "engagement_day7",
                    channel: "email",
                    title: subject,
                    message: `Coverage snapshot: ${policyCount} policies, ${healthScore}% health, ${gapCount} gaps`,
                    status: "sent",
                    sentAt: now,
                },
            })
            day7EmailsSent++
        } catch {
            errors++
        }
    }

    return { welcomeEmailsSent, day3EmailsSent, day7EmailsSent, errors }
}

/**
 * Check if user has opted into email for a given event type.
 * Defaults to enabled if no preference is set.
 */
async function isEmailEnabled(userId: string, eventType: string): Promise<boolean> {
    const pref = await db.notificationPreference.findUnique({
        where: {
            userId_eventType_channel: {
                userId,
                eventType,
                channel: "email",
            },
        },
        select: { enabled: true },
    })
    return pref?.enabled !== false // default to true
}
