import {
    CITABLE_ARRAYS,
    arrayCitationKey,
    type CitableArray,
} from '@/lib/services/ai/citation-keys'
import type { ExtractionSource } from '@/lib/services/ai/extraction-citations'
import type { DocumentAnchor } from '@/lib/insurance/capability-result'

/**
 * How much of a policy's citable content can actually be evidenced — measured,
 * not asserted.
 *
 * WHY THIS EXISTS AS A MODULE AND NOT A COMMENT. Widening the citation contract
 * (C3-0) only helps FUTURE extractions. Every policy already in the wallet was
 * extracted under the narrow scalar field set and carries no member citation, so
 * a capability that requires evidence will honestly report that it cannot answer.
 * That is correct behaviour. It is also indistinguishable, from the outside, from
 * a capability that is broken.
 *
 * This run has now hit the same failure three times: a halts file asserting halts
 * that were already fixed; 29 citations asserting sources that substantiate
 * nothing; a freshness check reporting green over a corpus it never evaluates.
 * Each is a claim with no way to check it. "Coverage grows as policies are
 * re-analysed" would be the fourth unless the growth is observable — so it is
 * emitted as a number from the day the contract widens, before anything consumes
 * it.
 *
 * THIS IS THE ONLY PLACE THAT READS AN ANCHOR. `getAnchor` is the single
 * accessor; a capability that hand-rolls its own read of
 * `acordData.extraction.sources` can silently disagree with the measurement,
 * which would defeat the point of measuring.
 */

/** The stored citation map, as it sits inside `acordData.extraction.sources`. */
type StoredSources = Record<string, ExtractionSource> | undefined

function storedSources(acord: unknown): StoredSources {
    const extraction = (acord as { extraction?: { sources?: unknown } } | null)?.extraction
    const sources = extraction?.sources
    if (!sources || typeof sources !== 'object' || Array.isArray(sources)) return undefined
    return sources as Record<string, ExtractionSource>
}

function memberCount(acord: unknown, array: CitableArray): number {
    const value = (acord as Record<string, unknown> | null)?.[array]
    return Array.isArray(value) ? value.length : 0
}

/**
 * The anchor for one array member, or null when there is none to show.
 *
 * A stored entry with a page but no snippet returns NULL, deliberately. The
 * verbatim quote is what lets a reader find the sentence in their own document;
 * a bare page number is not evidence they can check, and `DocumentAnchor`
 * requires the snippet for exactly that reason.
 */
export function getAnchor(
    acord: unknown,
    array: CitableArray,
    index: number,
    policyId: string
): DocumentAnchor | null {
    const sources = storedSources(acord)
    if (!sources) return null
    const key = arrayCitationKey(array, index)
    const entry = sources[key]
    const snippet = entry?.snippet?.trim()
    if (!snippet) return null
    return { page: entry?.page, snippet, fieldKey: key, policyId }
}

export interface ArrayAnchorCoverage {
    array: CitableArray
    /** Members in the array. */
    members: number
    /** Members carrying a usable anchor. */
    anchored: number
    /** Indices with no usable anchor — the work re-analysis would do. */
    unanchored: number[]
}

export interface PolicyAnchorCoverage {
    policyId: string
    arrays: ArrayAnchorCoverage[]
    members: number
    anchored: number
    /**
     * True when the extraction stored NO citations at all. Distinguishes "this
     * policy predates the citation contract" from "the model declined to cite
     * these particular members" — different problems, different remedies, and
     * collapsing them would make the metric unactionable.
     */
    predatesCitations: boolean
}

export function measureAnchorCoverage(policyId: string, acord: unknown): PolicyAnchorCoverage {
    const sources = storedSources(acord)
    const arrays: ArrayAnchorCoverage[] = CITABLE_ARRAYS.map((array) => {
        const members = memberCount(acord, array)
        const unanchored: number[] = []
        let anchored = 0
        for (let i = 0; i < members; i++) {
            if (getAnchor(acord, array, i, policyId)) anchored++
            else unanchored.push(i)
        }
        return { array, members, anchored, unanchored }
    })
    return {
        policyId,
        arrays,
        members: arrays.reduce((n, a) => n + a.members, 0),
        anchored: arrays.reduce((n, a) => n + a.anchored, 0),
        predatesCitations: sources === undefined || Object.keys(sources).length === 0,
    }
}

export interface AnchorCoverageRollUp {
    policies: number
    /** Policies whose extraction stored no citations at all. */
    policiesPredatingCitations: number
    members: number
    anchored: number
    /** 0–1. `null` when there are no citable members to measure. */
    rate: number | null
    byArray: Record<CitableArray, { members: number; anchored: number }>
}

/**
 * Aggregate across a set of policies. This is the number that answers "is
 * coverage actually growing" — the claim that would otherwise be unverifiable.
 */
export function rollUpAnchorCoverage(coverages: PolicyAnchorCoverage[]): AnchorCoverageRollUp {
    const byArray = Object.fromEntries(
        CITABLE_ARRAYS.map((a) => [a, { members: 0, anchored: 0 }])
    ) as Record<CitableArray, { members: number; anchored: number }>

    for (const c of coverages) {
        for (const a of c.arrays) {
            byArray[a.array].members += a.members
            byArray[a.array].anchored += a.anchored
        }
    }
    const members = coverages.reduce((n, c) => n + c.members, 0)
    const anchored = coverages.reduce((n, c) => n + c.anchored, 0)
    return {
        policies: coverages.length,
        policiesPredatingCitations: coverages.filter((c) => c.predatesCitations).length,
        members,
        anchored,
        rate: members === 0 ? null : anchored / members,
        byArray,
    }
}
