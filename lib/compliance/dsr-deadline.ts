/**
 * GDPR Art. 12(3) response deadline: one month from receipt of the request.
 * The published privacy policy promises exactly this, so the operator UI
 * counts against it. Client-safe (pure date math, no server imports).
 */

export const DSR_DEADLINE_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export type DsrDeadlineInfo = {
    dueAt: Date
    /** Whole days until the deadline; negative when overdue. */
    daysLeft: number
    overdue: boolean
    /** Within the last week before the deadline. */
    urgent: boolean
}

export function getDsrDeadlineInfo(requestedAt: Date | string, now: Date = new Date()): DsrDeadlineInfo {
    const requested = typeof requestedAt === "string" ? new Date(requestedAt) : requestedAt
    const dueAt = new Date(requested.getTime() + DSR_DEADLINE_DAYS * DAY_MS)
    const daysLeft = Math.floor((dueAt.getTime() - now.getTime()) / DAY_MS)
    return {
        dueAt,
        daysLeft,
        overdue: daysLeft < 0,
        urgent: daysLeft >= 0 && daysLeft <= 7,
    }
}
