import { db } from "../db"
import { sendEmail } from "../email/email-service"
import { getWeeklyDigestEmail } from "../email/templates/weekly-digest"

type WeeklyDigestSummary = {
    emailsSent: number
    skipped: number
    errors: number
}

/**
 * Weekly digest job: sends every Monday morning.
 * Gathers renewals, gaps, messages, and health score for each policyholder.
 */
export async function runWeeklyDigestJob(): Promise<WeeklyDigestSummary> {
    const now = new Date()
    let emailsSent = 0
    let skipped = 0
    let errors = 0

    // Only run on Mondays (0=Sun, 1=Mon)
    if (now.getDay() !== 1) {
        return { emailsSent: 0, skipped: 0, errors: 0 }
    }

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const users = await db.user.findMany({
        where: {
            roles: { contains: "policyholder" },
        },
        select: {
            id: true,
            name: true,
            email: true,
            preferredLanguage: true,
        },
        take: 5000,
    })

    for (const user of users) {
        if (user.email.endsWith("@phone.policywallet.local")) {
            skipped++
            continue
        }

        // Dedup check: already sent today
        const alreadySent = await db.notificationEvent.findFirst({
            where: {
                userId: user.id,
                eventType: "weekly_digest",
                createdAt: { gte: todayStart },
            },
            select: { id: true },
        })
        if (alreadySent) {
            skipped++
            continue
        }

        // Check notification preferences
        const pref = await db.notificationPreference.findUnique({
            where: {
                userId_eventType_channel: {
                    userId: user.id,
                    eventType: "weekly_digest",
                    channel: "email",
                },
            },
            select: { enabled: true },
        })
        if (pref?.enabled === false) {
            skipped++
            continue
        }

        try {
            // Gather data
            const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            const renewals = await db.policy.findMany({
                where: {
                    ownerUserId: user.id,
                    status: "active",
                    endDate: { gt: now, lte: thirtyDaysOut },
                },
                select: { insurerName: true, lineOfBusiness: true, endDate: true },
                orderBy: { endDate: "asc" },
                take: 5,
            })

            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            const newGaps = await db.gapInstance.count({
                where: {
                    policy: { ownerUserId: user.id },
                    status: { in: ["open", "detected"] },
                    detectedAt: { gte: oneWeekAgo },
                },
            })

            const unreadMessages = await db.notificationEvent.count({
                where: {
                    userId: user.id,
                    readAt: null,
                    eventType: { startsWith: "collaboration" },
                    createdAt: { gte: oneWeekAgo },
                },
            })

            // Health score
            const openGaps = await db.gapInstance.findMany({
                where: {
                    policy: { ownerUserId: user.id },
                    status: { in: ["open", "detected", "acknowledged"] },
                },
                select: { severity: true },
            })
            const policies = await db.policy.count({ where: { ownerUserId: user.id } })
            const crit = openGaps.filter(g => g.severity === "critical").length
            const high = openGaps.filter(g => g.severity === "high").length
            const med = openGaps.filter(g => g.severity === "medium").length
            const low = openGaps.filter(g => g.severity === "low").length
            const healthScore = policies === 0
                ? 0
                : Math.max(0, Math.min(100, 100 - (crit * 25 + high * 15 + med * 8 + low * 3)))

            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            const { subject, html } = getWeeklyDigestEmail(lang, user.name || undefined, {
                renewingSoon: renewals.map(r => ({
                    insurerName: r.insurerName,
                    lineOfBusiness: r.lineOfBusiness,
                    daysUntilExpiry: Math.ceil((r.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
                })),
                newGaps,
                unreadMessages,
                healthScoreChange: 0, // TODO: compare with last week's stored score
                healthScore,
            })

            await sendEmail({ to: user.email, subject, html })

            await db.notificationEvent.create({
                data: {
                    userId: user.id,
                    eventType: "weekly_digest",
                    channel: "email",
                    title: subject,
                    message: `Weekly digest: ${renewals.length} renewals, ${newGaps} new gaps, score ${healthScore}%`,
                    status: "sent",
                    sentAt: now,
                },
            })
            emailsSent++
        } catch {
            errors++
        }
    }

    return { emailsSent, skipped, errors }
}
