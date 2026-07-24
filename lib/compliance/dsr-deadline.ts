/**
 * GDPR Art. 12(3) response deadline: one CALENDAR month from receipt of the
 * request. The published privacy policy promises exactly this, so the operator
 * UI counts against it. Client-safe (pure date math, no server imports).
 *
 * This used a flat 30 days as a proxy for "one month". A month is not 30 days,
 * and the error runs the dangerous way in February: a request received on
 * 1 February is legally due 1 March, but 30 days lands on 3 March — so the queue
 * showed a request that had already breached the statutory deadline as still
 * having two days left. Being one day EARLY in a 31-day month is harmless; being
 * two days late on a regulator's clock is not.
 *
 * Short-month clamp follows the ordinary legal reading: 31 January + one month
 * is the last day of February, not 2 or 3 March.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Kept for callers that describe the window in prose ("within one month"). */
export const DSR_DEADLINE_MONTHS = 1

export type DsrDeadlineInfo = {
    dueAt: Date
    /** Whole days until the deadline; negative when overdue. */
    daysLeft: number
    overdue: boolean
    /** Within the last week before the deadline. */
    urgent: boolean
}

/** One calendar month later, clamped to the last day of a shorter month. */
export function addOneMonth(from: Date): Date {
    const due = new Date(from.getTime())
    const dayOfMonth = due.getUTCDate()
    due.setUTCMonth(due.getUTCMonth() + 1)
    // Rolled past the end of a shorter month (e.g. 31 Jan → 3 Mar): step back.
    if (due.getUTCDate() < dayOfMonth) due.setUTCDate(0)
    return due
}

export function getDsrDeadlineInfo(requestedAt: Date | string, now: Date = new Date()): DsrDeadlineInfo {
    const requested = typeof requestedAt === "string" ? new Date(requestedAt) : requestedAt
    const dueAt = addOneMonth(requested)
    const daysLeft = Math.floor((dueAt.getTime() - now.getTime()) / DAY_MS)
    return {
        dueAt,
        daysLeft,
        overdue: daysLeft < 0,
        urgent: daysLeft >= 0 && daysLeft <= 7,
    }
}
