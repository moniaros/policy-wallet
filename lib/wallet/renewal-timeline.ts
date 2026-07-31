/**
 * The six-month renewal window, as data rather than as page code.
 *
 * The dashboard built this inline: filter to policies expiring within 180 days,
 * sort, `slice(0, 6)`. The card then printed `items.length` beside its heading
 * as the number of upcoming renewals — so a household with nine renewals due
 * was told it had **six**. Not a truncated list with a hint that more existed:
 * a wrong count, stated as fact, about the reader's own portfolio. The three
 * policies that fell off were the furthest out, which is exactly the group a
 * six-month view exists to surface early.
 *
 * Splitting the model from the card makes the cap explicit — `total` and
 * `hidden` come back alongside `items`, so a surface can show the real number
 * and say what it is not showing. It also makes the window and the cap testable
 * without a browser, which the inline version was not.
 */

export interface RenewalCandidate<T> {
    policy: T
    endDate: Date
}

export interface RenewalTimeline<T> {
    /** Up to `limit`, soonest first. */
    items: RenewalCandidate<T>[]
    /** Everything in the window, including what did not fit. */
    total: number
    /** `total - items.length`. Never presented as zero when it is not. */
    hidden: number
}

export const RENEWAL_WINDOW_DAYS = 180
export const RENEWAL_TIMELINE_LIMIT = 6

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Policies renewing inside the window, soonest first.
 *
 * @param resolveEndDate returns a policy's effective coverage end, or null when
 * it has none — the caller owns lifecycle resolution, since a policy's real end
 * date is not always the column.
 *
 * Boundaries are deliberate: a policy expiring exactly now has expired (it
 * belongs to a lapsed-cover surface, not an upcoming-renewal one), and one
 * expiring exactly at the window edge is included, because excluding it would
 * make the same policy appear and disappear across a page refresh.
 */
export function buildRenewalTimeline<T>(
    policies: T[],
    resolveEndDate: (policy: T) => Date | null,
    now: Date,
    opts: { windowDays?: number; limit?: number } = {}
): RenewalTimeline<T> {
    const windowDays = opts.windowDays ?? RENEWAL_WINDOW_DAYS
    const limit = opts.limit ?? RENEWAL_TIMELINE_LIMIT
    const horizon = new Date(now.getTime() + windowDays * DAY_MS)

    const inWindow = policies
        .map((policy) => ({ policy, endDate: resolveEndDate(policy) }))
        .filter((entry): entry is RenewalCandidate<T> =>
            entry.endDate !== null && entry.endDate > now && entry.endDate <= horizon
        )
        .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())

    const items = inWindow.slice(0, limit)

    return { items, total: inWindow.length, hidden: inWindow.length - items.length }
}
