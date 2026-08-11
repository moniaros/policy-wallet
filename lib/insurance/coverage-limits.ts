/**
 * Reading money out of a coverage, and judging whether it is enough.
 *
 * This is what ACORD v3's structured limits were added for. The standing finding
 * against the risk engine is that it measures coverage PRESENCE and never
 * ADEQUACY — it asks "is there a home policy?" and never "is the sum insured
 * anywhere near the rebuild cost?" — despite the extraction layer already
 * capturing the amounts. It could not do better while a limit was a string.
 *
 * Two design rules run through everything here:
 *
 * 1. **Unknown is not zero.** A coverage with no stated limit, an unparseable
 *    string, or an unlimited benefit are three different things and none of them
 *    is "€0 of cover". Every function returns a verdict that can say "we cannot
 *    tell", and callers are expected to render that rather than a number.
 * 2. **Compare like with like.** A per-claim limit and a period aggregate answer
 *    different questions. Adequacy is judged against the basis that matches the
 *    exposure, never against whichever number happens to be largest.
 */

import type { AcordDataInput } from '@/lib/schemas/acord-data'

type CoverageInput = NonNullable<AcordDataInput['coverages']>[number]
type LimitInput = NonNullable<CoverageInput['limits']>[number]
type DeductibleInput = NonNullable<CoverageInput['deductibles']>[number]

export type LimitBasis = LimitInput['basis']

/** Bases that answer "how much for one loss?" */
const PER_LOSS_BASES: ReadonlySet<LimitBasis> = new Set<LimitBasis>([
    'per_claim',
    'per_event',
    'per_person',
    'per_item',
    'per_location',
])

/** Bases that answer "how much across the whole term?" */
const AGGREGATE_BASES: ReadonlySet<LimitBasis> = new Set<LimitBasis>([
    'per_period_aggregate',
    'annual',
])

export type ResolvedAmount =
    | { known: true; unlimited: true; currency?: string }
    | { known: true; unlimited: false; amount: number; currency?: string; basis: LimitBasis }
    | { known: false; reason: 'not_stated' | 'only_free_text' }

/**
 * The limit that answers a single loss.
 *
 * Where several per-loss limits apply (a liability section with per-person and
 * per-event towers), the SMALLEST is returned: it is the one a claimant meets
 * first, and reporting the largest would overstate the protection.
 */
export function perLossLimit(coverage: CoverageInput | undefined | null): ResolvedAmount {
    return resolveFrom(coverage, PER_LOSS_BASES)
}

/** The limit that answers the whole period. */
export function aggregateLimit(coverage: CoverageInput | undefined | null): ResolvedAmount {
    return resolveFrom(coverage, AGGREGATE_BASES)
}

function resolveFrom(
    coverage: CoverageInput | undefined | null,
    bases: ReadonlySet<LimitBasis>
): ResolvedAmount {
    if (!coverage) return { known: false, reason: 'not_stated' }

    const candidates = (coverage.limits ?? []).filter((limit) => bases.has(limit.basis))
    if (candidates.length === 0) {
        // A v2 policy has the number only in `limit` as free text. Say so rather
        // than parse it: "1.500.000 € ανά έτος, 750 € απαλλαγή" cannot be turned
        // into a basis-tagged amount without guessing which number is which.
        return { known: false, reason: coverage.limit ? 'only_free_text' : 'not_stated' }
    }

    // An unlimited benefit ends the question — nothing bounded is smaller.
    const unlimited = candidates.find((limit) => limit.unlimited)
    if (unlimited) return { known: true, unlimited: true, currency: unlimited.currency }

    const stated = candidates.filter((limit) => typeof limit.amount === 'number')
    if (stated.length === 0) return { known: false, reason: 'not_stated' }

    const smallest = stated.reduce((min, limit) => (limit.amount! < min.amount! ? limit : min))
    return {
        known: true,
        unlimited: false,
        amount: smallest.amount!,
        currency: smallest.currency,
        basis: smallest.basis,
    }
}

/**
 * The deductible the customer would actually meet.
 *
 * `deductibleResolution` matters: marine hull wordings state that where several
 * apply, the LARGEST single one does — so the worst case is the top of the
 * ladder, not the bottom. Where the policy is silent, the largest is still the
 * honest answer to "how much might I carry", but it is reported with
 * `resolution: 'unknown'` so a caller can hedge the wording.
 */
export interface DeductibleExposure {
    known: boolean
    /** Largest stated deductible, i.e. the worst case the ladder allows. */
    worstCase?: number
    currency?: string
    resolution: 'largest_applies' | 'cumulative' | 'unknown'
    /** True when at least one deductible is a percentage without a stated amount. */
    hasPercentageComponent: boolean
}

export function deductibleExposure(
    coverage: CoverageInput | undefined | null,
    resolution?: AcordDataInput['deductibleResolution']
): DeductibleExposure {
    const entries: DeductibleInput[] = coverage?.deductibles ?? []
    const resolved = resolution ?? 'unknown'
    const hasPercentageComponent = entries.some(
        (d) => typeof d.amount !== 'number' && (typeof d.percent === 'number' || Boolean(d.percentOf))
    )

    // A percentage deductible's floor IS a real amount the customer meets.
    const amounts = entries
        .map((d) => (typeof d.amount === 'number' ? d.amount : d.minimum))
        .filter((value): value is number => typeof value === 'number')

    if (amounts.length === 0) {
        return { known: false, resolution: resolved, hasPercentageComponent }
    }

    const worstCase = resolved === 'cumulative'
        ? amounts.reduce((sum, value) => sum + value, 0)
        : Math.max(...amounts)

    return {
        known: true,
        worstCase,
        currency: entries.find((d) => d.currency)?.currency,
        resolution: resolved,
        hasPercentageComponent,
    }
}

export type AdequacyVerdict =
    | { verdict: 'unknown'; reason: 'no_limit' | 'no_exposure' | 'currency_mismatch' }
    | { verdict: 'unlimited' }
    | { verdict: 'adequate'; ratio: number }
    | { verdict: 'tight'; ratio: number }
    | { verdict: 'short'; ratio: number; shortfall: number }

/**
 * Judge a limit against the exposure it is supposed to answer.
 *
 * The thresholds are deliberately coarse. A limit at or above the exposure is
 * adequate; within a tenth below it is tight; anything lower is short by a
 * stated amount. Finer gradations would imply a precision that neither the
 * extracted limit nor the customer's own estimate of their exposure supports.
 *
 * Currency is compared, not converted. A USD benefit table against a EUR
 * exposure is `unknown` rather than silently wrong by a tenth — the corpus
 * contains exactly that case.
 */
export const TIGHT_RATIO = 0.9

export function assessAdequacy(
    limit: ResolvedAmount,
    exposure: { amount: number | null | undefined; currency?: string }
): AdequacyVerdict {
    if (limit.known && limit.unlimited) return { verdict: 'unlimited' }
    if (!limit.known) return { verdict: 'unknown', reason: 'no_limit' }
    if (typeof exposure.amount !== 'number' || exposure.amount <= 0) {
        return { verdict: 'unknown', reason: 'no_exposure' }
    }

    const limitCurrency = limit.currency ?? 'EUR'
    const exposureCurrency = exposure.currency ?? 'EUR'
    if (limitCurrency !== exposureCurrency) {
        return { verdict: 'unknown', reason: 'currency_mismatch' }
    }

    const ratio = limit.amount / exposure.amount
    if (ratio >= 1) return { verdict: 'adequate', ratio }
    if (ratio >= TIGHT_RATIO) return { verdict: 'tight', ratio }
    return { verdict: 'short', ratio, shortfall: exposure.amount - limit.amount }
}

/**
 * Whether a deductible is material against what the household could absorb.
 *
 * This is the deductible gap the brief asks for, and it is genuinely a gap: the
 * customer is uninsured below the deductible whatever the limit above it says.
 * The comparison is against SAVINGS, not income, because that is what a loss is
 * actually paid from — and the risk engine already models savings.
 */
export function deductibleIsMaterial(
    exposure: DeductibleExposure,
    savings: number | null | undefined
): { material: boolean; known: boolean; shareOfSavings?: number } {
    if (!exposure.known || typeof exposure.worstCase !== 'number') {
        return { material: false, known: false }
    }
    if (typeof savings !== 'number' || savings <= 0) {
        // No savings figure: a deductible is only reportable as material against
        // something. Saying "material" here would be an assumption about the
        // customer's finances that nobody gave us.
        return { material: false, known: false }
    }
    const shareOfSavings = exposure.worstCase / savings
    return { material: shareOfSavings >= 0.25, known: true, shareOfSavings }
}
