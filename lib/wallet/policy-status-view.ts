import { resolvePolicyLifecycle, type PolicyStatus } from '@/lib/policy-status'

/**
 * THE single status-presentation pipeline for the wallet.
 *
 * Before this existed the wallet had three of them — PolicyCard's own badge map,
 * MobilePolicyCard's `getStatusConfig` (which read the raw stored status and fell
 * back to green), and document-insights' tone map — so the same policy could show
 * up as three different colours depending on the breakpoint. Worse, the stored
 * status never gets recomputed, so an expired policy reached the mobile card as
 * `action_needed` and rendered as a RED ALARM, contradicting the rule that expiry
 * is a fact of the calendar, not an emergency.
 *
 * Everything visual now derives from `resolvePolicyLifecycle` (the real, extracted
 * end date). The stored `policy.status` is only consulted for ingestion states the
 * lifecycle does not model: `analyzing`.
 */

export type StatusTone = 'positive' | 'warning' | 'critical' | 'neutral' | 'info'

/** Lifecycle states + the ingestion states the lifecycle does not model. */
export type PolicyStatusKey = PolicyStatus | 'analyzing'

type PolicyLike = {
    status?: string | null
    policyNumber?: string | null
    insurerName?: string | null
    endDate?: Date | string | null
    acordData?: unknown
}

/**
 * Tone per state. Deliberate, and load-bearing:
 * - `expired` is WARNING (amber), never critical — it already happened; shouting
 *   about it helps nobody and red is reserved for "you must act now".
 * - `expiring_soon` is CRITICAL — this is the one the user can still do something
 *   about, so it gets the alarm colour.
 * - `unknown_duration` is NEUTRAL — we genuinely do not know; a coloured alarm
 *   would be pretending to knowledge we lack.
 */
const STATUS_TONE: Record<PolicyStatusKey, StatusTone> = {
    active: 'positive',
    expiring_soon: 'critical',
    expired: 'warning',
    action_needed: 'warning',
    unknown_duration: 'neutral',
    cancelled: 'neutral',
    analyzing: 'info',
}

/** t.policyStatus uses camelCase keys. */
const STATUS_I18N_KEY: Record<PolicyStatusKey, string> = {
    active: 'active',
    expiring_soon: 'expiringSoon',
    expired: 'expired',
    unknown_duration: 'unknownDuration',
    action_needed: 'actionNeeded',
    cancelled: 'cancelled',
    analyzing: 'analyzing',
}

export const TONE_PILL: Record<StatusTone, string> = {
    positive: 'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint',
    warning: 'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300',
    critical: 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-red-900/30 dark:text-red-300',
    neutral: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
    info: 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-blue-900/30 dark:text-blue-300',
}

/** Icon chip behind the line-of-business glyph. */
export const TONE_CHIP: Record<StatusTone, string> = {
    positive: 'bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint',
    warning: 'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300',
    critical: 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-red-900/30 dark:text-red-300',
    neutral: 'bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50',
    info: 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-blue-900/30 dark:text-blue-300',
}

/** Stored ingestion states meaning "the extraction did not fully succeed". */
const STORED_NEEDS_REVIEW = new Set(['action_needed', 'incomplete'])

export function resolvePolicyStatusKey(policy: PolicyLike, now: Date = new Date()): PolicyStatusKey {
    const stored = String(policy.status || '').toLowerCase()
    if (stored === 'analyzing') return 'analyzing'

    const lifecycle = resolvePolicyLifecycle(policy, now).status

    // A failed/partial extraction is a real thing to tell the user about, and the
    // lifecycle does not model it — it only reports `action_needed` when the
    // insurer or policy number is literally absent. Surface the stored flag, but
    // only once the calendar has nothing more urgent to say: an expired policy
    // that also needs review is, first and foremost, expired.
    if (lifecycle === 'active' && STORED_NEEDS_REVIEW.has(stored)) return 'action_needed'

    return lifecycle
}

export interface PolicyStatusView {
    key: PolicyStatusKey
    tone: StatusTone
    /** Localised, from t.policyStatus — never a raw slug. */
    label: string
    pillClass: string
    chipClass: string
    endDate: Date | null
    daysUntilExpiry: number | null
}

export function getPolicyStatusView(
    policy: PolicyLike,
    t: any,
    now: Date = new Date()
): PolicyStatusView {
    const key = resolvePolicyStatusKey(policy, now)
    const tone = STATUS_TONE[key]
    const lifecycle = resolvePolicyLifecycle(policy, now)

    return {
        key,
        tone,
        label: t?.policyStatus?.[STATUS_I18N_KEY[key]] ?? '',
        pillClass: TONE_PILL[tone],
        chipClass: TONE_CHIP[tone],
        endDate: key === 'analyzing' ? null : lifecycle.endDate,
        daysUntilExpiry: key === 'analyzing' ? null : lifecycle.daysUntilExpiry,
    }
}

/** Which states should pull the user into the "needs attention" bucket. */
export const ATTENTION_KEYS: readonly PolicyStatusKey[] = [
    'expiring_soon',
    'expired',
    'action_needed',
    'unknown_duration',
]

export function isAttentionKey(key: PolicyStatusKey): boolean {
    return ATTENTION_KEYS.includes(key)
}
