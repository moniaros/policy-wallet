import {
    canonicalCoverageKey,
    COVERAGE_KEY_LABELS,
    SYNONYM_MAP_VERSION,
    type CoverageKey,
} from '@/lib/insurance/coverage-synonyms'
import {
    cannotDetermine,
    determined,
    type CapabilityResult,
} from '@/lib/insurance/capability-result'

/**
 * C1 — what two policies both appear to cover.
 *
 * A pure set operation over `AcordData.coverages[]`. It touches no engine, reads
 * no statute and writes nothing; the hard part was never the comparison, it was
 * agreeing that two Greek wordings name one benefit — which is why the synonym
 * map is authored and versioned rather than inferred.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not say cancel. It does not
 * compute a saving. It does not rank the two policies. Holding the same benefit
 * twice is often correct — a group scheme plus a personal top-up is the ordinary
 * shape of the ομαδικό case this exists for, and an employer's cover ends with
 * the employment. The finding is «both policies appear to cover this; check with
 * your adviser», and nothing stronger is derivable from two documents.
 *
 * HELD IS NOT LISTED. `coverages[].status` distinguishes `included` and
 * `optional_taken` from `optional_not_taken` and `excluded`. A benefit printed
 * on both schedules but declined on one is NOT an overlap, and reporting it as
 * one would be a false "you are paying twice" — the precise defect this
 * capability could most easily introduce.
 *
 * UNMAPPED IS RENDERED, NEVER DROPPED. A coverage whose wording the map does not
 * know is reported as unmapped. A long unmapped list is the signal the map is
 * not ready; hiding it converts an honest gap in our vocabulary into a silent
 * claim about their cover.
 *
 * THE BLINDNESS, AND WHY RENDERING `unmapped` IS NOT A GUARD ON ITS OWN.
 * `status` and the «επίδομα νοσηλείας» split both stop this MANUFACTURING an
 * overlap that is not there. Neither stops it MISSING one that is — and a missed
 * duplicate is the failure a reader cannot detect for themselves, because
 * nothing appears on screen for them to doubt.
 *
 * The map is seeded from one article's vocabulary and version-pinned, so it will
 * under-match other insurers' wordings by construction. Rendering the unmapped
 * list does not protect anyone: a reader shown «2 καλύψεις δεν αναγνωρίστηκαν»
 * beside an empty overlap list has no way to know whether the two unrecognised
 * ones were the duplicate.
 *
 * So the report carries `lowComparability` and the threshold is enforced here,
 * in the product, not only in a test: when fewer than half of either policy's
 * coverages resolve, an empty `bothPolicies` **may not be read as "no
 * duplicates"**, and the assumption that says so is emitted first. The UI must
 * not render an all-clear in that state — the same rule as everywhere else on
 * this product, that a check which could not cover the case must say so rather
 * than report the good outcome.
 */

/** The subset of AcordData this reads. Structural, so callers need no cast. */
export interface OverlapPolicyInput {
    policyId: string
    coverages?: ReadonlyArray<{
        name?: string | null
        status?: string | null
    }> | null
}

export interface UnmappedCoverage {
    raw: string
    policyId: string
}

/** Below this, a comparison is not trustworthy enough to read an absence from. */
export const MIN_COMPARABLE_RATIO = 0.5

export interface PolicyCoverageMapping {
    policyId: string
    /** Held coverages whose wording the authored map resolved. */
    mapped: number
    /** Held coverages it did not. */
    unmapped: number
    /** 0–1, or null when the policy lists no held coverage at all. */
    ratio: number | null
}

export interface OverlapReport {
    /** Benefits both policies actually hold — the "check this" candidates. */
    bothPolicies: CoverageKey[]
    onlyA: CoverageKey[]
    onlyB: CoverageKey[]
    /** Names the authored map could not resolve. Shown to the reader. */
    unmapped: UnmappedCoverage[]
    /** Per policy, how much of it the map could actually read. */
    mapping: PolicyCoverageMapping[]
    /**
     * True when either policy falls below MIN_COMPARABLE_RATIO.
     * **An empty `bothPolicies` must not render as "no duplicates" when this is
     * set** — the comparison did not cover enough of the policy to support that.
     */
    lowComparability: boolean
    /** Pinned so a finding can be traced to the vocabulary that produced it. */
    synonymMapVersion: string
    labels: Record<string, { el: string; en: string }>
}

/** Statuses that mean the policyholder actually holds the benefit. */
const HELD_STATUSES = new Set(['included', 'optional_taken'])

/** Absent status means held: most schedules list only what is in force. */
function isHeld(status: string | null | undefined): boolean {
    if (status === null || status === undefined || status === '') return true
    return HELD_STATUSES.has(status)
}

function keysOf(policy: OverlapPolicyInput): { held: Set<CoverageKey>; unmapped: UnmappedCoverage[] } {
    const held = new Set<CoverageKey>()
    const unmapped: UnmappedCoverage[] = []
    for (const c of policy.coverages ?? []) {
        const raw = (c?.name ?? '').trim()
        if (!raw) continue
        if (!isHeld(c?.status)) continue
        const key = canonicalCoverageKey(raw)
        if (key) held.add(key)
        else unmapped.push({ raw, policyId: policy.policyId })
    }
    return { held, unmapped }
}

/**
 * Compare two policies' coverage.
 *
 * `cannot_determine` when either side has no coverage list at all — that is
 * "the extractor gave us nothing to compare", which is a different statement
 * from "these policies share nothing", and the two must never render alike.
 */
export function detectOverlap(
    a: OverlapPolicyInput,
    b: OverlapPolicyInput
): CapabilityResult<OverlapReport> {
    const aHasList = Array.isArray(a.coverages) && a.coverages.length > 0
    const bHasList = Array.isArray(b.coverages) && b.coverages.length > 0

    if (!aHasList || !bHasList) {
        return cannotDetermine<OverlapReport>('field_not_extracted', [
            ...(aHasList ? [] : [`${a.policyId}.coverages`]),
            ...(bHasList ? [] : [`${b.policyId}.coverages`]),
        ])
    }

    const A = keysOf(a)
    const B = keysOf(b)

    const mapping: PolicyCoverageMapping[] = [
        [a, A] as const,
        [b, B] as const,
    ].map(([p, r]) => {
        const mapped = r.held.size
        const unmapped = r.unmapped.length
        const total = mapped + unmapped
        return { policyId: p.policyId, mapped, unmapped, ratio: total === 0 ? null : mapped / total }
    })
    const lowComparability = mapping.some((m) => m.ratio !== null && m.ratio < MIN_COMPARABLE_RATIO)

    const both = [...A.held].filter((k) => B.held.has(k)).sort()
    const onlyA = [...A.held].filter((k) => !B.held.has(k)).sort()
    const onlyB = [...B.held].filter((k) => !A.held.has(k)).sort()
    const unmapped = [...A.unmapped, ...B.unmapped]

    return determined<OverlapReport>(
        {
            bothPolicies: both,
            onlyA,
            onlyB,
            unmapped,
            mapping,
            lowComparability,
            synonymMapVersion: SYNONYM_MAP_VERSION,
            labels: Object.fromEntries(
                [...both, ...onlyA, ...onlyB].map((k) => [k, COVERAGE_KEY_LABELS[k]])
            ),
        },
        {
            [`${a.policyId}.coverages`]: { from: 'document', field: 'coverages', policyId: a.policyId },
            [`${b.policyId}.coverages`]: { from: 'document', field: 'coverages', policyId: b.policyId },
        },
        [
            // Rendered to the reader, not kept internal — these are the reasons
            // the comparison could be wrong, and the reader is the only person
            // who can tell whether they are. The comparability warning goes
            // FIRST when it applies, because it governs how everything below it
            // should be read.
            ...(lowComparability
                ? [
                      'Δεν αναγνωρίσαμε αρκετές από τις καλύψεις για να πούμε με βεβαιότητα τι συμπίπτει. Αν δεν εμφανίζεται κάτι εδώ, αυτό ΔΕΝ σημαίνει ότι δεν υπάρχει διπλή κάλυψη.',
                  ]
                : []),
            'Η σύγκριση γίνεται στα ονόματα των καλύψεων όπως τα διάβασε η ανάλυση, όχι στους όρους τους.',
            'Δύο καλύψεις με το ίδιο όνομα μπορεί να έχουν διαφορετικά όρια, απαλλαγές και εξαιρέσεις.',
            ...(unmapped.length > 0
                ? [`${unmapped.length} καλύψεις δεν αναγνωρίστηκαν και δεν συγκρίθηκαν.`]
                : []),
        ]
    )
}
