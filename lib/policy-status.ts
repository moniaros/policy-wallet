import type { Policy } from '@prisma/client'
import { parseDocumentDate } from '@/lib/dates/document-date'

/**
 * The product operates in Greece and lib/i18n/format.ts already settled that
 * "dates are meaningful in Athens time" — but only for DISPLAY. The lifecycle
 * verdict was computed from raw UTC instants, so between 21:00 and midnight UTC
 * (the Athens offset) a policy whose cover ended yesterday in the customer's own
 * calendar still resolved to daysUntilExpiry = 0, i.e. "expiring soon" rather
 * than "expired". Every night, for two to three hours, the product told a
 * policyholder they were still covered when they were not — and
 * isPolicyCoverageActive shares this resolution, so gap detection and the
 * protection score counted the lapsed policy as protection too.
 *
 * Expiry is a calendar fact, not an instant: compare Athens calendar days.
 */
const APP_TIME_ZONE = 'Europe/Athens'

/** Whole days from `now` to `end`, counted on the Athens calendar. */
function calendarDaysUntil(end: Date, now: Date): number {
    const dayNumber = (d: Date) => {
        // en-CA renders as YYYY-MM-DD, so the parts sort and parse directly.
        const [y, m, day] = new Intl.DateTimeFormat('en-CA', {
            timeZone: APP_TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })
            .format(d)
            .split('-')
            .map(Number)
        return Date.UTC(y, m - 1, day) / 86_400_000
    }
    return dayNumber(end) - dayNumber(now)
}

export type PolicyStatus =
    | 'active'
    | 'expiring_soon'
    | 'expired'
    | 'unknown_duration'
    | 'action_needed'
    | 'cancelled'

export interface PolicyWithStatus extends Policy {
    calculatedStatus: PolicyStatus
    daysUntilExpiry: number
}

export interface PolicyLifecycle {
    status: PolicyStatus
    /** Resolved from the extracted document envelope first, DB column second. */
    endDate: Date | null
    /** null when no trustworthy end date exists — never a fabricated countdown. */
    daysUntilExpiry: number | null
}

/**
 * The single source of truth for a policy's lifecycle state, computed from
 * the REAL end date. The extracted envelope value wins over the DB column:
 * the column may hold the upload-day placeholder when the extracted string
 * failed to parse historically, so an envelope value that exists but cannot
 * be parsed means "unknown duration" — it must never fall back to a
 * placeholder and show as ΕΝΕΡΓΟ with a fabricated countdown.
 */
export function resolvePolicyLifecycle(policy: {
    status?: string | null
    policyNumber?: string | null
    insurerName?: string | null
    endDate?: Date | string | null
    acordData?: unknown
}, now: Date = new Date()): PolicyLifecycle {
    const envelope = ((policy.acordData as Record<string, unknown>)?.policy ?? {}) as Record<string, unknown>
    const envelopeRaw = String(envelope.expirationDate ?? '').trim()

    // Renewal re-uploads supersede the originally extracted expiration.
    const history = (policy.acordData as Record<string, unknown>)?.renewalHistory
    const latestRenewalEnd = Array.isArray(history)
        ? history
            .map((entry) => parseDocumentDate((entry as Record<string, unknown>)?.endDate))
            .filter((d): d is Date => Boolean(d))
            .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
        : null

    const endDate =
        latestRenewalEnd ??
        (envelopeRaw ? parseDocumentDate(envelopeRaw) : parseDocumentDate(policy.endDate ?? null))

    const daysUntilExpiry = endDate ? calendarDaysUntil(endDate, now) : null

    const stored = String(policy.status || '').toLowerCase()
    if (stored === 'cancelled') return { status: 'cancelled', endDate, daysUntilExpiry }

    if (daysUntilExpiry === null) return { status: 'unknown_duration', endDate: null, daysUntilExpiry: null }
    if (daysUntilExpiry < 0) return { status: 'expired', endDate, daysUntilExpiry }
    if (daysUntilExpiry <= 30) return { status: 'expiring_soon', endDate, daysUntilExpiry }
    if (!policy.policyNumber || !policy.insurerName) return { status: 'action_needed', endDate, daysUntilExpiry }
    return { status: 'active', endDate, daysUntilExpiry }
}

/**
 * Calculate the status of a policy based on its dates and current status
 */
export function calculatePolicyStatus(policy: Policy): PolicyStatus {
    return resolvePolicyLifecycle(policy).status
}

type CoverageInput = Parameters<typeof resolvePolicyLifecycle>[0]

/**
 * Does this policy provide coverage RIGHT NOW?
 *
 * The one question every coverage inference must ask before treating a policy
 * as protection (gap detection, protection score, branch tiles, premium
 * footprint). An EXPIRED policy is not coverage — reading the stale stored
 * `status` string (which nothing recomputes as time passes) told a user with
 * a health policy that lapsed in May 2025 that they were insured.
 *
 * A policy still being analyzed, or cancelled, is not coverage either. A
 * policy whose end date could not be parsed IS counted (it exists and was
 * bought; the «Άγνωστη διάρκεια» state is surfaced loudly elsewhere and the
 * review screen demands the date) — we refuse to invent an expiry we cannot
 * read, in either direction.
 */
export function isPolicyCoverageActive(policy: CoverageInput, now: Date = new Date()): boolean {
    const stored = String(policy.status || '').toLowerCase()
    if (stored === 'analyzing' || stored === 'cancelled') return false

    // `now` is injectable so the day-boundary behaviour can be asserted; without
    // it "is this person covered right now?" could only be tested at whatever
    // instant the suite happened to run.
    const { status } = resolvePolicyLifecycle(policy, now)
    return status !== 'expired' && status !== 'cancelled'
}

/**
 * The value to persist into Policy.coverageEndDate — the resolved real end
 * date (renewal history → extracted envelope → endDate column). NULL means the
 * expiry is unreadable/absent ("unknown duration"), which counts as coverage.
 * Call this wherever a policy's acordData / endDate is written.
 */
export function resolveCoverageEndDate(policy: CoverageInput): Date | null {
    return resolvePolicyLifecycle(policy).endDate
}

/**
 * Coverage check from the DENORMALIZED column — equivalent to
 * isPolicyCoverageActive but without needing acordData. Use when a row was
 * loaded with `coverageEndDate` (not the heavy acordData JSON).
 */
export function isCoveredByEndDate(
    policy: { status?: string | null; coverageEndDate?: Date | null },
    now: Date = new Date()
): boolean {
    const stored = String(policy.status || '').toLowerCase()
    if (stored === 'analyzing' || stored === 'cancelled') return false
    // Unknown/absent expiry counts as coverage (mirrors isPolicyCoverageActive).
    if (policy.coverageEndDate == null) return true
    return policy.coverageEndDate.getTime() >= now.getTime()
}

/**
 * Prisma `where` fragment selecting policies that provide coverage right now,
 * using the denormalized column — so counts run in the DB. Mirrors
 * isPolicyCoverageActive: exclude analyzing/cancelled/deleted; a null
 * coverageEndDate (unknown duration) counts as coverage.
 */
export function coveredPolicyWhere(now: Date = new Date()) {
    return {
        status: { notIn: ['analyzing', 'cancelled', 'deleted'] },
        OR: [{ coverageEndDate: null }, { coverageEndDate: { gte: now } }],
    }
}

/**
 * Lifecycle-derived status for display/grouping. Preserves the transient
 * 'analyzing' state; everything else comes from the real end date.
 */
export function effectivePolicyStatus(policy: CoverageInput): string {
    const stored = String(policy.status || '').toLowerCase()
    if (stored === 'analyzing') return 'analyzing'
    return resolvePolicyLifecycle(policy).status
}

/**
 * Status as the gap engine's rules expect it: 'active' means "counts as
 * coverage" (an expiring-soon policy still protects you today), anything
 * else is the honest lifecycle state.
 */
export function coverageEngineStatus(policy: CoverageInput): string {
    return isPolicyCoverageActive(policy) ? 'active' : effectivePolicyStatus(policy)
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(endDate: Date): number {
    if (!endDate) return 0
    const today = new Date()
    const end = new Date(endDate)
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: PolicyStatus, language: 'el' | 'en' = 'el'): string {
    const labels = {
        // Neuter throughout: the subject is «το ασφαλιστήριο». This map had
        // 'Ενεργή' and 'Ακυρωμένη' (feminine) sitting beside 'Ληγμένο' (neuter),
        // so one policy's status changed gender between the wallet list and its
        // own detail page. Sentence case, matching t.policyStatus word-for-word —
        // a test pins the two together.
        el: {
            active: 'Ενεργό',
            expiring_soon: 'Λήγει σύντομα',
            expired: 'Ληγμένο',
            unknown_duration: 'Άγνωστη διάρκεια',
            action_needed: 'Απαιτείται ενέργεια',
            cancelled: 'Ακυρωμένο',
        },
        en: {
            active: 'Active',
            expiring_soon: 'Expiring Soon',
            expired: 'Expired',
            unknown_duration: 'Unknown duration',
            action_needed: 'Action Needed',
            cancelled: 'Cancelled',
        },
    }

    return labels[language][status]
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: PolicyStatus): {
    bg: string
    text: string
    border: string
} {
    const colors = {
        active: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            text: 'text-green-700 dark:text-green-400',
            border: 'border-green-200 dark:border-green-800',
        },
        expiring_soon: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            text: 'text-amber-700 dark:text-amber-400',
            border: 'border-amber-200 dark:border-amber-800',
        },
        // Expired is a fact of the calendar, not an alarm: amber, not red,
        // and clearly distinct from the green active badge.
        expired: {
            bg: 'bg-amber-100 dark:bg-amber-900/30',
            text: 'text-amber-800 dark:text-amber-300',
            border: 'border-amber-300 dark:border-amber-700',
        },
        unknown_duration: {
            bg: 'bg-stone-100 dark:bg-stone-800/40',
            text: 'text-stone-700 dark:text-stone-300',
            border: 'border-stone-300 dark:border-stone-600',
        },
        action_needed: {
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            text: 'text-orange-700 dark:text-orange-400',
            border: 'border-orange-200 dark:border-orange-800',
        },
        cancelled: {
            bg: 'bg-stone-50 dark:bg-stone-900/20',
            text: 'text-stone-700 dark:text-stone-400',
            border: 'border-stone-200 dark:border-stone-800',
        },
    }

    return colors[status]
}

/**
 * Calculate portfolio summary statistics
 */
export interface PortfolioSummary {
    totalPolicies: number
    activeCount: number
    expiringSoonCount: number
    expiredCount: number
    actionNeededCount: number
    cancelledCount: number
    totalPremium: number
    upcomingRenewals: Array<{
        policyId: string
        policyNumber: string
        insurerName: string
        lineOfBusiness: string
        daysUntilExpiry: number
    }>
}

export function calculatePortfolioSummary(policies: Policy[]): PortfolioSummary {
    const summary: PortfolioSummary = {
        totalPolicies: policies.length,
        activeCount: 0,
        expiringSoonCount: 0,
        expiredCount: 0,
        actionNeededCount: 0,
        cancelledCount: 0,
        totalPremium: 0,
        upcomingRenewals: [],
    }

    policies.forEach((policy) => {
        const { status, daysUntilExpiry } = resolvePolicyLifecycle(policy)

        // Count by status
        switch (status) {
            case 'active':
                summary.activeCount++
                break
            case 'expiring_soon':
                summary.expiringSoonCount++
                summary.upcomingRenewals.push({
                    policyId: policy.id,
                    policyNumber: policy.policyNumber,
                    insurerName: policy.insurerName,
                    lineOfBusiness: policy.lineOfBusiness,
                    daysUntilExpiry: daysUntilExpiry ?? 0,
                })
                break
            case 'expired':
                summary.expiredCount++
                break
            case 'unknown_duration':
            case 'action_needed':
                summary.actionNeededCount++
                break
            case 'cancelled':
                summary.cancelledCount++
                break
        }

        // Sum premiums (only for active and expiring soon)
        if ((status === 'active' || status === 'expiring_soon') && policy.premiumAmount) {
            summary.totalPremium += Number(policy.premiumAmount)
        }
    })

    // Sort upcoming renewals by days until expiry
    summary.upcomingRenewals.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

    return summary
}
