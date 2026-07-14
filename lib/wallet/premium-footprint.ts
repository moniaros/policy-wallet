import { resolvePolicyLifecycle, type PolicyStatus } from '@/lib/policy-status'

export type PremiumPolicyLike = {
    id?: string
    policyNumber?: string | null
    insurerName?: string | null
    status?: string | null
    endDate?: string | Date | null
    premiumAmount?: unknown
    acordData?: unknown
}

/**
 * Lifecycle states that represent live economic exposure. `action_needed` is
 * in force too — it only means the record is missing an insurer name or policy
 * number, not that the cover has lapsed.
 */
const PREMIUM_BEARING_STATUSES: ReadonlySet<PolicyStatus> = new Set<PolicyStatus>([
    'active',
    'expiring_soon',
    'action_needed',
])

/**
 * Stored workflow states that are not a real policy yet (still extracting) or
 * any more (soft-deleted). `resolvePolicyLifecycle` does not model these, so
 * they have to be screened out before it runs.
 */
const NON_POLICY_STORED_STATUSES = new Set(['analyzing', 'deleted'])

/**
 * The single predicate for "does this policy's premium count towards a total".
 *
 * Never test `policy.status === 'active'` instead: the stored status is an
 * ingestion state that nothing ever recomputes — no code path writes 'expired'
 * or 'cancelled' onto a policy — so it matches every policy the user has ever
 * uploaded, forever. Only the resolved lifecycle knows the real end date.
 */
export function isPremiumBearing(policy: PremiumPolicyLike, now: Date = new Date()): boolean {
    if (!policy) return false
    if (NON_POLICY_STORED_STATUSES.has((policy.status || '').toLowerCase())) return false

    return PREMIUM_BEARING_STATUSES.has(resolvePolicyLifecycle(policy, now).status)
}

export interface PremiumFootprint {
    /** Annual premium of the policies actually in force today. */
    total: number
    /** How many policies contributed to `total`. */
    countedPolicies: number
    /**
     * Policies left out because no trustworthy end date exists. Surfaced so the
     * UI can say so — a total that silently drops them is a lie by omission.
     */
    unknownDurationCount: number
}

export interface PremiumBearingSelection<T extends PremiumPolicyLike> {
    /**
     * The policies in force today, with duplicate uploads of the same policy
     * number collapsed to the row holding the current term. Every figure derived
     * from a premium total — the total itself, the per-branch breakdown, the
     * "active policies" count — must come off this one list, or they disagree.
     */
    policies: T[]
    unknownDurationCount: number
}

export function selectPremiumBearingPolicies<T extends PremiumPolicyLike>(
    policies: T[],
    now: Date = new Date()
): PremiumBearingSelection<T> {
    let unknownDurationCount = 0

    const byPolicyNumber = new Map<string, { policy: T; endTime: number }>()
    const unnumbered: T[] = []

    for (const policy of policies ?? []) {
        if (!policy) continue
        if (NON_POLICY_STORED_STATUSES.has((policy.status || '').toLowerCase())) continue

        const lifecycle = resolvePolicyLifecycle(policy, now)
        if (lifecycle.status === 'unknown_duration') {
            unknownDurationCount++
            continue
        }
        if (!PREMIUM_BEARING_STATUSES.has(lifecycle.status)) continue

        const key = (policy.policyNumber || '').trim().toLowerCase()
        if (!key) {
            unnumbered.push(policy)
            continue
        }

        // Same number twice = one economic exposure. Keep the current term.
        const endTime = lifecycle.endDate?.getTime() ?? 0
        const existing = byPolicyNumber.get(key)
        if (!existing || endTime > existing.endTime) {
            byPolicyNumber.set(key, { policy, endTime })
        }
    }

    return {
        policies: [...[...byPolicyNumber.values()].map((entry) => entry.policy), ...unnumbered],
        unknownDurationCount,
    }
}

function premiumOf(policy: PremiumPolicyLike): number {
    const premium = Number(policy.premiumAmount ?? 0)
    return Number.isFinite(premium) ? premium : 0
}

export function calculatePremiumFootprintDetailed(
    policies: PremiumPolicyLike[],
    now: Date = new Date()
): PremiumFootprint {
    const { policies: inForce, unknownDurationCount } = selectPremiumBearingPolicies(policies, now)

    return {
        total: inForce.reduce((sum, policy) => sum + premiumOf(policy), 0),
        countedPolicies: inForce.length,
        unknownDurationCount,
    }
}

export function calculatePremiumFootprint(policies: PremiumPolicyLike[], now: Date = new Date()): number {
    return calculatePremiumFootprintDetailed(policies, now).total
}
