import { calendarDaysUntil, startOfAthensDay } from "@/lib/policy-status"
import { provisionalProtectionScore } from "./gap-engine/protection-score"
import { db } from "../db"
import { sendEmail } from "../email/email-service"
import { getWeeklyDigestEmail } from "../email/templates/weekly-digest"
import { getActiveRecommendations } from "./gap-engine/recommendation-generator"

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
                    // From the start of TODAY in Athens. End dates are stored at
                    // midnight, so `gt: now` dropped a policy expiring today from
                    // the digest that lands in the owner's inbox — the one item
                    // in it they could still act on.
                    endDate: { gte: startOfAthensDay(now), lte: thirtyDaysOut },
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

            // Health score — prefer cached protection score from gap engine
            const cachedScore = await db.protectionScore.findUnique({
                where: { userId: user.id },
                select: { overallScore: true },
            }).catch(() => null)

            // Provisional whenever it did not come from the gap engine — the two
            // are different measures and the email has to say which one it is.
            let healthScore: number | null
            const scoreIsProvisional = !cachedScore
            if (cachedScore) {
                healthScore = cachedScore.overallScore
            } else {
                const openGaps = await db.gapInstance.findMany({
                    where: {
                        policy: { ownerUserId: user.id },
                        status: { in: ["open", "detected", "acknowledged"] },
                    },
                    select: { severity: true },
                })
                const policyCount = await db.policy.count({ where: { ownerUserId: user.id } })
                healthScore = provisionalProtectionScore(
                    policyCount,
                    openGaps.map((g) => g.severity)
                )
            }

            // Top recommendations for behavioral nudge
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            const activeRecs = await getActiveRecommendations(user.id).catch(() => [])
            const topRecommendations = activeRecs.slice(0, 3).map(r => ({
                title: r.title[lang] || r.title.en,
                urgency: r.urgency,
                estimatedCostEur: r.estimatedCostEur,
            }))

            // Profile completeness
            const profile = await db.policyholderProfile.findUnique({
                where: { userId: user.id },
                select: {
                    maritalStatus: true,
                    employmentStatus: true,
                    annualIncome: true,
                    occupation: true,
                    smokingStatus: true,
                    dateOfBirth: true,
                },
            }).catch(() => null)

            const filledProfileFields = profile ? [
                profile.maritalStatus != null,
                profile.employmentStatus != null,
                profile.dateOfBirth != null,
                profile.annualIncome != null,
                profile.occupation != null,
                profile.smokingStatus != null,
                true, true, true, true, true, // boolean fields always set
            ].filter(Boolean).length : 0
            const profileCompleteness = profile ? Math.round((filledProfileFields / 11) * 100) : 0

            const { subject, html } = getWeeklyDigestEmail(lang, user.name || undefined, {
                renewingSoon: renewals.map(r => ({
                    insurerName: r.insurerName,
                    lineOfBusiness: r.lineOfBusiness,
                    // Athens calendar days, like every other expiry count. This
                    // figure goes out in a renewal email — "expires in 0 days"
                    // when the cover has actually lapsed is the wrong message to
                    // send a policyholder.
                    daysUntilExpiry: calendarDaysUntil(r.endDate, now),
                })),
                newGaps,
                unreadMessages,
                healthScore,
                scoreIsProvisional,
                topRecommendations,
                profileCompleteness,
            })

            await sendEmail({ to: user.email, subject, html })

            await db.notificationEvent.create({
                data: {
                    userId: user.id,
                    eventType: "weekly_digest",
                    channel: "email",
                    title: subject,
                    message: `Weekly digest: ${renewals.length} renewals, ${newGaps} new gaps, score ${healthScore === null ? 'n/a' : `${healthScore}%`}`,
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
