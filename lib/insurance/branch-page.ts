/**
 * Pure data-assembly helpers for the /branches pages and the dashboard
 * coverage map. No DB access — testable with plain fixtures.
 */
import {
    INSURANCE_BRANCHES,
    getBranch,
    getBranchFamily,
    normalizeBranch,
    type InsuranceBranch,
} from './taxonomy'

export interface BranchPolicyFacts {
    id: string
    lineOfBusiness: string | null
    status: string
    endDate: Date | null
}

export type BranchTileState = 'covered' | 'attention' | 'gap' | 'neutral'

// Callers pass the LIFECYCLE status (effectivePolicyStatus), never the stale
// stored string: a lapsed policy is 'expired' here, so the tile shows amber
// attention — "you had this, it ran out" — and never green 'covered'.
const ATTENTION_STATUSES = new Set(['expiring_soon', 'action_needed', 'expired', 'unknown_duration'])

/** Walk parentId links up to the top-level branch (business_interruption → business). */
export function toTopLevelBranch(branch: InsuranceBranch): InsuranceBranch {
    let current = branch
    while (current.parentId) {
        const parent = getBranch(current.parentId)
        if (!parent) break
        current = parent
    }
    return current
}

/** Policies whose normalized line falls inside the branch family. */
export function policiesInBranch<T extends { lineOfBusiness: string | null }>(
    policies: T[],
    branchId: string
): T[] {
    const family = new Set(getBranchFamily(branchId))
    return policies.filter((policy) => family.has(normalizeBranch(policy.lineOfBusiness).id))
}

/** Policies ending within the window (default 90 days), soonest first. */
export function upcomingRenewals<T extends { endDate: Date | null }>(
    policies: T[],
    now: Date,
    windowDays = 90
): T[] {
    const horizon = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000)
    return policies
        .filter((policy) => policy.endDate && policy.endDate > now && policy.endDate <= horizon)
        .sort((a, b) => (a.endDate as Date).getTime() - (b.endDate as Date).getTime())
}

export function deriveBranchState(args: {
    hasActivePolicy: boolean
    needsAttention: boolean
    expected: boolean
}): BranchTileState {
    if (args.needsAttention) return 'attention'
    if (args.hasActivePolicy) return 'covered'
    if (args.expected) return 'gap'
    return 'neutral'
}

export interface BranchOverviewEntry {
    branch: InsuranceBranch
    state: BranchTileState
    policyCount: number
    activeCount: number
}

/**
 * The branch tiles to display: every rich-content branch, plus any top-level
 * branch where the user holds policies or the protection score expects a
 * line. States derive from the cached score's expectedLines (may be empty
 * when no score has ever been computed — tiles then never show 'gap').
 */
export function buildBranchOverview(
    policies: BranchPolicyFacts[],
    expectedLines: string[]
): BranchOverviewEntry[] {
    // Only expectations that ARE a top-level branch paint a tile.
    //
    // Tiles are top-level and carry the parent's label, so folding a child up
    // into its parent mislabels the need: `income_protection` became a tile
    // reading «Ζωή» (Life) — shown to every employed person with thin savings,
    // including those with no dependants and no debt and therefore no life
    // insurance need at all. It fired on 17 of 24 validation scenarios. Same for
    // `renters` → «Κατοικία» (Home), which tells a tenant they need buildings
    // cover on a building they do not own.
    //
    // The recommendation card names the right product either way, so suppressing
    // the tile loses a coarse signal and removes a wrong one. Silence beats a
    // mislabelled verdict on the most-scanned surface in the product.
    const expectedTopLevel = new Set(
        expectedLines
            .map((line) => normalizeBranch(line))
            .filter((branch) => !branch.parentId)
            .map((branch) => branch.id)
    )

    const byTopLevel = new Map<string, BranchPolicyFacts[]>()
    for (const policy of policies) {
        const topLevel = toTopLevelBranch(normalizeBranch(policy.lineOfBusiness)).id
        const bucket = byTopLevel.get(topLevel) ?? []
        bucket.push(policy)
        byTopLevel.set(topLevel, bucket)
    }

    return INSURANCE_BRANCHES.filter((branch) => {
        if (branch.parentId) return false
        if (branch.id === 'other' && !byTopLevel.has('other')) return false
        return (
            branch.contentTier === 'rich' ||
            byTopLevel.has(branch.id) ||
            expectedTopLevel.has(branch.id)
        )
    }).map((branch) => {
        const branchPolicies = byTopLevel.get(branch.id) ?? []
        const activeCount = branchPolicies.filter((policy) => policy.status === 'active').length
        const needsAttention = branchPolicies.some((policy) => ATTENTION_STATUSES.has(policy.status))
        return {
            branch,
            state: deriveBranchState({
                hasActivePolicy: activeCount > 0,
                needsAttention,
                expected: expectedTopLevel.has(branch.id),
            }),
            policyCount: branchPolicies.length,
            activeCount,
        }
    })
}
