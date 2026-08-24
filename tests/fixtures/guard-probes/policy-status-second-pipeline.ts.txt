import { calendarDaysUntil } from '@/lib/policy-status'

export type PolicyCardStatus = 'active' | 'expiring_soon' | 'incomplete' | 'action_needed'

/**
 * The status a policy card shows on the /agent and /account summaries.
 *
 * This existed as two byte-identical copies, one per route, both computing days
 * left by dividing milliseconds. End dates are stored at midnight UTC — 03:00
 * Athens — so between 21:00 UTC and midnight a policy still in force on the
 * holder's own calendar came out at -1 and rendered "action needed". The wallet
 * and the policy page said it was active at the same moment, because they go
 * through the lifecycle resolver.
 *
 * One copy, one clock. `calendarDaysUntil` is the same helper every other expiry
 * count in the product uses.
 */
export function mapPolicyCardStatus(dbStatus: string, endDate: Date, now: Date = new Date()): PolicyCardStatus {
    if (dbStatus === 'cancelled') return 'action_needed'

    const daysUntilExpiry = calendarDaysUntil(endDate, now)
    if (daysUntilExpiry < 0) return 'action_needed'
    if (daysUntilExpiry < 30) return 'expiring_soon'

    return 'active'
}
