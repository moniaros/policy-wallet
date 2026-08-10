/**
 * The periodic review scan.
 *
 * Everything else in the review system reacts to something the customer did.
 * This is the half that reacts to time passing — the only trigger that fires
 * when nothing happens, which is precisely when a picture goes quietly stale.
 *
 * Three cadences, and each earns its place differently:
 *
 * - **annual** — the backstop. Lives change without anyone declaring it, and
 *   once a year is the cadence people accept without resentment.
 * - **quarterly** — only for customers whose assessment coverage is too thin to
 *   score honestly. Prompting a complete profile every quarter would be a
 *   reminder that nothing has changed, which is the fastest way to teach someone
 *   to ignore reviews.
 * - **birthday** — `age` gates two risks in the catalog and refines four more,
 *   so an assessment silently goes stale every year. Only on a DECADE boundary:
 *   turning 34 changes nothing material, turning 40 does.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { startOfAthensDay } from "@/lib/policy-status"
import { openReview } from "./service"
import { expireOverdueReviews } from "./service"

export interface ReviewScanSummary {
    scanned: number
    annual: number
    quarterly: number
    birthday: number
    expired: number
    skipped: number
}

/** Rows one invocation will touch. Reported, never silently capped. */
const MAX_BATCH = 300

/**
 * Whole years between two dates, in Athens.
 *
 * Calendar comparison rather than millisecond division: `ms / 365.25 days` puts
 * a birthday a day early roughly one year in four, and the whole point of the
 * birthday trigger is landing on the right day.
 */
function yearsBetween(from: Date, to: Date): number {
    const a = startOfAthensDay(from)
    const b = startOfAthensDay(to)
    let years = b.getUTCFullYear() - a.getUTCFullYear()
    const beforeAnniversary =
        b.getUTCMonth() < a.getUTCMonth() ||
        (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())
    if (beforeAnniversary) years--
    return years
}

/** Is today the anniversary of this date, in Athens? */
function isAnniversaryToday(date: Date, now: Date): boolean {
    const d = startOfAthensDay(date)
    const n = startOfAthensDay(now)
    // 29 February: treated as 1 March in common years, so the trigger never
    // silently skips three years in four.
    if (d.getUTCMonth() === 1 && d.getUTCDate() === 29) {
        const isLeap = new Date(Date.UTC(n.getUTCFullYear(), 1, 29)).getUTCMonth() === 1
        if (!isLeap) return n.getUTCMonth() === 2 && n.getUTCDate() === 1
    }
    return d.getUTCMonth() === n.getUTCMonth() && d.getUTCDate() === n.getUTCDate()
}

export async function runRiskReviewScan(now = new Date()): Promise<ReviewScanSummary> {
    const summary: ReviewScanSummary = {
        scanned: 0,
        annual: 0,
        quarterly: 0,
        birthday: 0,
        expired: 0,
        skipped: 0,
    }

    // Expire first. An overdue review is a prompt the customer declined, and
    // leaving it open would block a fresh one with a reason that is current.
    summary.expired = await expireOverdueReviews(now)

    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 3600_000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600_000)

    // Only customers who have engaged enough for a review to mean anything. A
    // review for someone with no policies and no profile is a prompt to do the
    // onboarding they already chose not to do — the drip handles that, and
    // better.
    const candidates = await db.user.findMany({
        where: {
            roles: { contains: "policyholder" },
            OR: [{ policiesOwned: { some: {} } }, { policyholderProfile: { isNot: null } }],
        },
        select: {
            id: true,
            createdAt: true,
            policyholderProfile: { select: { dateOfBirth: true } },
            protectionScore: { select: { assessmentCoverage: true, computedAt: true } },
            riskReviews: {
                where: { openedAt: { gte: oneYearAgo } },
                select: { trigger: true, openedAt: true },
                orderBy: { openedAt: "desc" },
            },
        },
        take: MAX_BATCH,
    })

    summary.scanned = candidates.length

    for (const user of candidates) {
        try {
            const lastByTrigger = (trigger: string) =>
                user.riskReviews.find((r) => r.trigger === trigger)?.openedAt ?? null

            // ── Birthday: only on a decade boundary ──────────────────────────
            const dob = user.policyholderProfile?.dateOfBirth
            if (dob && isAnniversaryToday(dob, now)) {
                const age = yearsBetween(dob, now)
                // 30, 40, 50, 60, 70 — the ages where life-cover need, health
                // risk and underwriting terms genuinely step.
                if (age > 0 && age % 10 === 0) {
                    const result = await openReview({ userId: user.id, trigger: "birthday" })
                    if (result.opened) {
                        summary.birthday++
                        continue
                    }
                }
            }

            // ── Annual: a year since the last review of any kind ─────────────
            const lastAnyReview = user.riskReviews[0]?.openedAt ?? null
            const anchor = lastAnyReview ?? user.createdAt
            if (anchor < oneYearAgo) {
                const result = await openReview({ userId: user.id, trigger: "annual" })
                if (result.opened) {
                    summary.annual++
                    continue
                }
            }

            // ── Quarterly: only when the picture is too thin to score ────────
            //
            // Below the coverage floor the score is not a measure of this
            // person's cover but of what we happened to be able to answer, and
            // every surface already says "not enough information". A quarterly
            // nudge is the honest way to fix that; for a complete profile it
            // would be noise.
            const coverage = user.protectionScore?.assessmentCoverage ?? null
            const lastQuarterly = lastByTrigger("quarterly")
            if (
                coverage !== null &&
                coverage < 50 &&
                (!lastQuarterly || lastQuarterly < ninetyDaysAgo)
            ) {
                const result = await openReview({ userId: user.id, trigger: "quarterly" })
                if (result.opened) {
                    summary.quarterly++
                    continue
                }
            }

            summary.skipped++
        } catch (error) {
            logger("warn", "risk review scan failed for one user", {
                userId: user.id,
                error: error instanceof Error ? error.message : String(error),
            })
            summary.skipped++
        }
    }

    // Honest accounting: `scanned` against the cap tells an operator whether one
    // daily run keeps up, rather than silently covering the same first 300.
    logger("info", "risk review scan complete", { ...summary, hitBatchCap: summary.scanned === MAX_BATCH })
    return summary
}
