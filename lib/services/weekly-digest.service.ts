import { calendarDaysUntil, startOfAthensDay, athensWeekday, NON_LIVE_POLICY_STATUSES } from "@/lib/policy-status"
import { db } from "../db"
import { emit, isChannelSuppressed } from "../notifications/dispatch"
import { getWeeklyDigestEmail } from "../email/templates/weekly-digest"
import { getActiveRecommendations } from "./gap-engine/recommendation-generator"
import { readLiveGapRows } from "@/lib/gaps/gap-rows"

/**
 * ISO-week stamp (`2026-W32`) used as the digest's idempotency key, so a cron
 * that fires twice on a Monday — a retry, a manual run — cannot send two.
 * Computed in Athens, like every other calendar decision in this file.
 */
function isoWeekKey(date: Date): string {
    const d = startOfAthensDay(date)
    // Thursday of the current week determines the ISO year.
    const thursday = new Date(d)
    thursday.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
    const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4))
    const week =
        1 +
        Math.round(
            ((thursday.getTime() - firstThursday.getTime()) / 86400000 -
                3 +
                ((firstThursday.getUTCDay() + 6) % 7)) /
                7
        )
    return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

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
    // Monday in ATHENS. `now.getDay()` asks the runtime zone, so a cron firing
    // late on a UTC Sunday would skip the digest on a day that is already Monday
    // for every reader — and one firing late on a UTC Monday would send it on
    // their Tuesday.
    if (athensWeekday(now) !== 1) {
        return { emailsSent: 0, skipped: 0, errors: 0 }
    }

    // Same clock for the already-sent guard: on a UTC boundary a reader could be
    // sent two digests inside one Athens day, or none.
    const todayStart = startOfAthensDay(now)

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

        // Pre-filter only, so we do not gather a digest's worth of data for
        // someone who has switched it off. `emit` asks the same question again
        // and is authoritative — this shares its implementation rather than
        // being a second copy of the rule.
        if (await isChannelSuppressed(user.id, "weekly_digest", "email")) {
            skipped++
            continue
        }

        try {
            // Gather data
            const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            const renewals = await db.policy.findMany({
                where: {
                    ownerUserId: user.id,
                    // A renewal digest must include EVERY real policy expiring
                    // soon, not only those stored as exactly 'active'.
                    // Policy.status is an ingestion state: 'expiring_soon' and
                    // 'action_needed' are in-force (IN_FORCE_KEYS), and
                    // 'incomplete' is a real uploaded policy pending review — so
                    // status==='active' dropped a policy literally marked
                    // "expiring_soon" from the expiring-soon email. The endDate
                    // window already excludes lapsed and far-future policies;
                    // only the non-policy states are filtered out here.
                    status: { notIn: [...NON_LIVE_POLICY_STATUSES] },
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
            // Same universe as the renewals list above: a gap on a deleted or
            // cancelled policy is not a gap in this portfolio, and one digest
            // must not quote two different definitions of "your policies".
            // Findings still under provenance review are never counted in an
            // email (PW-TRANSPARENCY-02 B3): this counts the classified ones.
            const newGapRows = await readLiveGapRows({ scope: "classified",
                where: {
                    policy: {
                        ownerUserId: user.id,
                        status: { notIn: [...NON_LIVE_POLICY_STATUSES] },
                    },
                    status: { in: ["open", "detected"] },
                    detectedAt: { gte: oneWeekAgo },
                },
                select: { id: true },
            })
            const newGaps = newGapRows.length

            const unreadMessages = await db.notificationEvent.count({
                where: {
                    userId: user.id,
                    readAt: null,
                    eventType: { startsWith: "collaboration" },
                    createdAt: { gte: oneWeekAgo },
                },
            })

            // No score is computed for this email. The digest carried the
            // protection score until Aug 2026 — including a provisional
            // fallback that mailed 100% to portfolios nobody had analysed —
            // and the score was removed from the product outright
            // (PW-MOBILE-TRANSFORM-01, halt H-001).

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

            const digestData = {
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
                topRecommendations,
                profileCompleteness,
            }
            const { subject, html } = getWeeklyDigestEmail(lang, user.name || undefined, digestData)

            // Through the bus, with the digest's own HTML as the email content.
            // It used to sendEmail() directly and then log a row claiming
            // `status: "sent"` unconditionally — the row said "sent" even when
            // the provider had rejected it, because the result was discarded.
            const result = await emit({
                event: "weekly_digest",
                userId: user.id,
                // The subject is week-invariant per language, so the other arm
                // is one more pure render. The message used to be "Weekly
                // digest: N renewals, M new gaps" — an internal English log
                // line stored in a customer-visible column.
                title: {
                    el: getWeeklyDigestEmail("el", user.name || undefined, digestData).subject,
                    en: getWeeklyDigestEmail("en", user.name || undefined, digestData).subject,
                },
                message: {
                    el: `Η εβδομαδιαία σύνοψή σας: ${renewals.length} ανανεώσεις, ${newGaps} νέα ευρήματα.`,
                    en: `Your weekly summary: ${renewals.length} renewals, ${newGaps} new findings.`,
                },
                // One digest per user per ISO week, however often the cron runs.
                dedupeKey: `weekly_digest:${isoWeekKey(now)}`,
                content: { email: { subject, html } },
            })
            if (result.delivered.length > 0) emailsSent++
            else if (result.failed.length > 0) errors++
            else skipped++
        } catch {
            errors++
        }
    }

    return { emailsSent, skipped, errors }
}
