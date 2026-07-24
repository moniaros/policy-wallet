import { db } from "../db"
import { startOfAthensDay } from "@/lib/policy-status"
import { sendEmail } from "../email/email-service"
import { calculateEngagementScore } from "./engagement-scoring"
import {
    getChurnDay7Email,
    getChurnDay14Email,
    getChurnDay30Email,
    getChurnDay60Email,
} from "../email/templates/churn-prevention"

const BONUS_TOKENS = 500

type ChurnPreventionSummary = {
    processed: number
    day7Sent: number
    day14Sent: number
    day30Sent: number
    day60Sent: number
    skipped: number
    errors: number
}

/**
 * Daily churn prevention job.
 * Uses engagement scores + inactivity days to send re-engagement campaigns.
 */
export async function runChurnPreventionJob(): Promise<ChurnPreventionSummary> {
    const summary: ChurnPreventionSummary = {
        processed: 0,
        day7Sent: 0,
        day14Sent: 0,
        day30Sent: 0,
        day60Sent: 0,
        skipped: 0,
        errors: 0,
    }

    const now = new Date()

    // Fetch users with lastActiveAt between 7 and 90 days ago
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const inactiveUsers = await db.user.findMany({
        where: {
            lastActiveAt: {
                gte: ninetyDaysAgo,
                lte: sevenDaysAgo,
            },
            roles: { not: "admin" },
        },
        select: {
            id: true,
            name: true,
            email: true,
            preferredLanguage: true,
            lastActiveAt: true,
        },
        take: 2000,
    })

    for (const user of inactiveUsers) {
        summary.processed++

        if (user.email.endsWith("@phone.policywallet.local")) {
            summary.skipped++
            continue
        }

        const lastActive = user.lastActiveAt!
        const daysSinceActive = Math.floor(
            (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Determine which tier the user falls into
        let tier: "day7" | "day14" | "day30" | "day60" | null = null
        if (daysSinceActive >= 58 && daysSinceActive <= 62) tier = "day60"
        else if (daysSinceActive >= 28 && daysSinceActive <= 32) tier = "day30"
        else if (daysSinceActive >= 13 && daysSinceActive <= 16) tier = "day14"
        else if (daysSinceActive >= 6 && daysSinceActive <= 8) tier = "day7"

        if (!tier) {
            summary.skipped++
            continue
        }

        // Check if this tier email was already sent
        const eventType = `churn_prevention_${tier}`
        const alreadySent = await db.notificationEvent.findFirst({
            where: {
                userId: user.id,
                eventType,
                createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
            },
            select: { id: true },
        })
        if (alreadySent) {
            summary.skipped++
            continue
        }

        // Check user notification preferences
        const pref = await db.notificationPreference.findUnique({
            where: {
                userId_eventType_channel: {
                    userId: user.id,
                    eventType: "churn_prevention",
                    channel: "email",
                },
            },
            select: { enabled: true },
        })
        if (pref?.enabled === false) {
            summary.skipped++
            continue
        }

        try {
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            let subject: string
            let html: string

            if (tier === "day7") {
                // Get policy data for context
                const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
                // The window had no LOWER bound, and `status: "active"` is not one:
                // the stored status is never updated to "expired" (see
                // isPremiumBearing), so this counted policies that lapsed years
                // ago and told the reader they expire in the next 30 days — a
                // false statement, in an outbound email, to a user the product is
                // trying to win back.
                const expiringPolicies = await db.policy.count({
                    where: {
                        ownerUserId: user.id,
                        status: "active",
                        endDate: { gte: startOfAthensDay(now), lte: thirtyDaysOut },
                    },
                })
                const openGaps = await db.gapInstance.count({
                    where: {
                        policy: { ownerUserId: user.id },
                        status: { in: ["open", "detected"] },
                    },
                })
                const email = getChurnDay7Email({
                    name: user.name || undefined,
                    language: lang,
                    expiringPolicies,
                    openGaps,
                })
                subject = email.subject
                html = email.html
                summary.day7Sent++
            } else if (tier === "day14") {
                const email = getChurnDay14Email({ name: user.name || undefined, language: lang })
                subject = email.subject
                html = email.html
                summary.day14Sent++
            } else if (tier === "day30") {
                const email = getChurnDay30Email({
                    name: user.name || undefined,
                    language: lang,
                    bonusTokens: BONUS_TOKENS,
                })
                subject = email.subject
                html = email.html

                // Record the bonus token grant (integrate with actual billing/token system)
                await db.notificationEvent.create({
                    data: {
                        userId: user.id,
                        eventType: "bonus_credits_granted",
                        channel: "in_app",
                        title: `${BONUS_TOKENS} bonus AI credits`,
                        message: `Re-engagement bonus: ${BONUS_TOKENS} credits added, expires in 30 days`,
                        relatedObjectType: "credit",
                        relatedObjectId: String(BONUS_TOKENS),
                        status: "sent",
                        sentAt: now,
                    },
                })
                summary.day30Sent++
            } else {
                const email = getChurnDay60Email({ name: user.name || undefined, language: lang })
                subject = email.subject
                html = email.html
                summary.day60Sent++
            }

            await sendEmail({ to: user.email, subject, html })

            await db.notificationEvent.create({
                data: {
                    userId: user.id,
                    eventType,
                    channel: "email",
                    title: subject,
                    message: `Churn prevention ${tier} email sent (${daysSinceActive} days inactive)`,
                    status: "sent",
                    sentAt: now,
                },
            })
        } catch {
            summary.errors++
        }
    }

    return summary
}
