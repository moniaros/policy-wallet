import { db } from "../db"
import { startOfAthensDay , NON_LIVE_POLICY_STATUSES } from "@/lib/policy-status"
import { emit, isChannelSuppressed } from "../notifications/dispatch"
import { calculateEngagementScore } from "./engagement-scoring"
import {
    getChurnDay7Email,
    getChurnDay14Email,
    getChurnDay30Email,
    getChurnDay60Email,
} from "../email/templates/churn-prevention"


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
    // Date-bucket for the idempotency keys below. These exist so a cron RETRY
    // on the same day cannot double-send; the 30-day, per-tier check further
    // down is the actual business rule. A permanent key would silence the tier
    // for that user for ever.
    const runDay = now.toISOString().slice(0, 10)

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

        // One event type, `churn_prevention`, with the tier carried on the
        // dedupe key rather than baked into the event name.
        //
        // This used to write `churn_prevention_${tier}` while checking the
        // preference under plain `churn_prevention` — the written key was not
        // the read key, which is the exact defect the preference registry
        // exists to prevent. The settings toggle writes `churn_prevention`, so
        // the tier-suffixed rows it produced were addressable by nothing.
        // Scoped to THIS tier, and to the last 30 days — the drip is meant to
        // step day7 -> day14 -> day30 -> day60 as someone stays away, so a
        // check spanning all tiers would silently collapse it into one email.
        const alreadySent = await db.notificationEvent.findFirst({
            where: {
                userId: user.id,
                createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
                OR: [
                    { dedupeKey: { startsWith: `churn:${tier}:` } },
                    // Rows written before the event-name cutover.
                    { eventType: `churn_prevention_${tier}` },
                ],
            },
            select: { id: true },
        })
        if (alreadySent) {
            summary.skipped++
            continue
        }

        // Pre-filter; `emit` asks the same question again and is authoritative.
        if (await isChannelSuppressed(user.id, "churn_prevention", "email")) {
            summary.skipped++
            continue
        }

        try {
            const lang = user.preferredLanguage === "el" ? "el" as const : "en" as const
            let subject: string
            let html: string
            /**
             * The email subject in BOTH languages, for the stored row. The
             * builders are pure, so rendering the other language costs one
             * call. The row used to store `subject` (one language) as the
             * title and "Churn prevention day7 email sent (N days inactive)"
             * — an internal English log line — as the message.
             */
            let subjectEl: string
            let subjectEn: string

            if (tier === "day7") {
                // Get policy data for context
                const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
                // The window had no LOWER bound, and `status: "active"` is not one:
                // the stored status is never updated to "expired" (see
                // isPremiumBearing), so this counted policies that lapsed years
                // ago and told the reader they expire in the next 30 days — a
                // false statement, in an outbound email, to a user the product is
                // trying to win back. The gte bound fixed the lapsed count; the
                // status filter is the mirror — 'expiring_soon'/'action_needed'/
                // 'incomplete' are all in-force, so requiring exactly 'active'
                // UNDER-counted the very "expiring soon" figure this email quotes.
                // Same real-policy filter the renewal cron and weekly digest use.
                const expiringPolicies = await db.policy.count({
                    where: {
                        ownerUserId: user.id,
                        status: { notIn: [...NON_LIVE_POLICY_STATUSES] },
                        endDate: { gte: startOfAthensDay(now), lte: thirtyDaysOut },
                    },
                })
                // Same universe as expiringPolicies above — this email quotes
                // both figures, and a gap on a cancelled or deleted policy
                // would make the two numbers describe different portfolios.
                const openGaps = await db.gapInstance.count({
                    where: {
                        policy: {
                            ownerUserId: user.id,
                            status: { notIn: [...NON_LIVE_POLICY_STATUSES] },
                        },
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
                subjectEl = getChurnDay7Email({ name: user.name || undefined, language: "el", expiringPolicies, openGaps }).subject
                subjectEn = getChurnDay7Email({ name: user.name || undefined, language: "en", expiringPolicies, openGaps }).subject
                summary.day7Sent++
            } else if (tier === "day14") {
                const email = getChurnDay14Email({ name: user.name || undefined, language: lang })
                subject = email.subject
                html = email.html
                subjectEl = getChurnDay14Email({ name: user.name || undefined, language: "el" }).subject
                subjectEn = getChurnDay14Email({ name: user.name || undefined, language: "en" }).subject
                summary.day14Sent++
            } else if (tier === "day30") {
                const email = getChurnDay30Email({ name: user.name || undefined, language: lang })
                subject = email.subject
                html = email.html
                subjectEl = getChurnDay30Email({ name: user.name || undefined, language: "el" }).subject
                subjectEn = getChurnDay30Email({ name: user.name || undefined, language: "en" }).subject

                // No bonus-credit emission here. It announced a grant that never
                // happened — see getChurnDay30Email for the full account. The
                // registry entry stays as `planned` for the day a real grant
                // exists to emit it.
                summary.day30Sent++
            } else {
                const email = getChurnDay60Email({ name: user.name || undefined, language: lang })
                subject = email.subject
                html = email.html
                subjectEl = getChurnDay60Email({ name: user.name || undefined, language: "el" }).subject
                subjectEn = getChurnDay60Email({ name: user.name || undefined, language: "en" }).subject
                summary.day60Sent++
            }

            await emit({
                event: "churn_prevention",
                userId: user.id,
                title: { el: subjectEl, en: subjectEn },
                message: {
                    el: "Σας στείλαμε ένα email για να συνεχίσετε από εκεί που μείνατε.",
                    en: "We sent you an email to pick up where you left off.",
                },
                dedupeKey: `churn:${tier}:${runDay}`,
                content: { email: { subject, html } },
            })
        } catch {
            summary.errors++
        }
    }

    return summary
}
