/**
 * How a countdown to expiry is written on a badge.
 *
 * Two surfaces show the same policy's remaining days — the agent's renewal
 * timeline on /insights and the renewals table — and both interpolated the raw
 * count with a suffix. That was survivable while the count could never reach
 * zero, because a policy expiring today was being filtered out of both lists
 * before it got there. Once it stops being filtered out, "0 ημ." is what an
 * agent reads on the last day of cover.
 *
 * Shared rather than written twice: the two surfaces have to agree, and the
 * boundary (0 = today, 1 = tomorrow) is exactly the part that gets copied
 * slightly wrong.
 */
export function daysLeftLabel(
    days: number,
    labels: { today: string; tomorrow: string; suffix: string }
): string {
    if (days <= 0) return labels.today
    if (days === 1) return labels.tomorrow
    return `${days}${labels.suffix}`
}
