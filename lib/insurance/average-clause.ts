import {
    cannotDetermine,
    determined,
    type CapabilityResult,
    type DocumentAnchor,
} from '@/lib/insurance/capability-result'
import { getAnchor } from '@/lib/insurance/anchor-coverage'
import { normaliseCoverageName } from '@/lib/insurance/coverage-synonyms'

/**
 * C2a — does this policy contain an average clause (αναλογικός κανόνας)?
 *
 * A FACT the document states, read and quoted. No arithmetic, no external
 * reference, no estimate. C2b — what the shortfall might be — is a separate
 * module and is gated on a €/τ.μ. source that does not yet exist; nothing here
 * anticipates it, and the copy must not imply a figure is coming.
 *
 * WHY THE SPEC'S `present: boolean` IS NOT IMPLEMENTED, AND MUST NOT BE.
 *
 * The build spec returns `{ present: boolean; clauseText; location }`. That
 * shape allows `{ present: false }` as a DETERMINED result — "we looked, there
 * is no average clause" — and this capability cannot support that sentence.
 *
 * A Greek home policy's average clause routinely lives in the Γενικοί Όροι
 * booklet, which is a separate document the customer often never uploads. It may
 * also be worded in a way this matcher does not recognise. So not finding one
 * means the extraction did not surface one — never that the contract lacks one.
 *
 * Rendering that as `present: false` would tell a reader their sum insured
 * carries no proportional penalty. On this product that is the single most
 * expensive false reassurance available: υπασφάλιση understates what someone is
 * owed at exactly the moment they claim, and a reader told there is no average
 * clause stops asking. It is also the standing invariant — absence of a detected
 * problem is not evidence of no problem, and must never render as reassurance.
 *
 * So presence is a determined result and absence is `cannot_determine`. The
 * value type carries no boolean at all, because a type that cannot express the
 * unsafe answer cannot accidentally return it.
 *
 * THE ANCHOR IS REQUIRED. A clause we cannot quote is a clause the reader cannot
 * check against their own document, and this is a claim about their cover. Text
 * without a citation returns `no_evidence_anchor`, not a stance.
 */

export interface AverageClauseFinding {
    /** The clause as written, in the policy's own language. */
    clauseText: string
    /** Where it sits, with the verbatim quote. Required — see the note above. */
    location: DocumentAnchor
    /** Which authored term matched, so a finding can be traced to the matcher. */
    matchedTerm: string
    /**
     * What the wording says failing it does, when the extraction recorded it.
     * Never inferred: the schema's own default is `unknown` and it stays that.
     */
    breachEffect?: string
}

/**
 * Authored Greek terms for the average clause. Collocations, not single words:
 * «αναλογία» alone appears in premium apportionment, co-insurance shares and
 * instalment wording, and matching it would report an average clause on policies
 * that have none.
 */
const AVERAGE_CLAUSE_TERMS: readonly string[] = [
    'αναλογικος κανονας',
    'αναλογικου κανονα',
    'αναλογικο κανονα',
    'υπασφαλιση',
    'υπασφαλισης',
    'αναλογικη μειωση',
    'αναλογικης μειωσης',
    'ανάλογη μείωση της αποζημίωσης',
    'pro rata',
]

/** The subset of AcordData this reads. Structural, so callers need no cast. */
export interface AverageClauseInput {
    policyId: string
    conditions?: ReadonlyArray<{ text?: string | null; breachEffect?: string | null }> | null
    exclusions?: ReadonlyArray<string> | null
    /** The whole AcordData, needed to resolve citations. */
    acordData?: unknown
}

function matchTerm(text: string): string | null {
    const n = normaliseCoverageName(text)
    for (const term of AVERAGE_CLAUSE_TERMS) {
        if (n.includes(normaliseCoverageName(term))) return term
    }
    return null
}

export function detectAverageClause(
    input: AverageClauseInput
): CapabilityResult<AverageClauseFinding> {
    const conditions = input.conditions ?? []
    const exclusions = input.exclusions ?? []

    if (conditions.length === 0 && exclusions.length === 0) {
        return cannotDetermine<AverageClauseFinding>('field_not_extracted', [
            `${input.policyId}.conditions`,
            `${input.policyId}.exclusions`,
        ])
    }

    /** Candidates found, so a missing anchor can be reported as such. */
    let sawTextWithoutAnchor = false

    for (let i = 0; i < conditions.length; i++) {
        const text = (conditions[i]?.text ?? '').trim()
        if (!text) continue
        const term = matchTerm(text)
        if (!term) continue
        const anchor = getAnchor(input.acordData, 'conditions', i, input.policyId)
        if (!anchor) {
            sawTextWithoutAnchor = true
            continue
        }
        return determined<AverageClauseFinding>(
            {
                clauseText: text,
                location: anchor,
                matchedTerm: term,
                breachEffect: conditions[i]?.breachEffect ?? undefined,
            },
            {
                clause: {
                    from: 'document',
                    field: `conditions[${i}].text`,
                    policyId: input.policyId,
                    anchor,
                },
            },
            [
                'Ο όρος παρατίθεται όπως τον διάβασε η ανάλυση από το έγγραφό σας.',
                'Το τι σημαίνει στην πράξη εξαρτάται από το ποσό που έχετε ασφαλίσει και την αξία του ακινήτου — ελέγξτε το με τον ασφαλιστή ή τον σύμβουλό σας.',
            ]
        )
    }

    for (let i = 0; i < exclusions.length; i++) {
        const text = (exclusions[i] ?? '').trim()
        if (!text) continue
        const term = matchTerm(text)
        if (!term) continue
        const anchor = getAnchor(input.acordData, 'exclusions', i, input.policyId)
        if (!anchor) {
            sawTextWithoutAnchor = true
            continue
        }
        return determined<AverageClauseFinding>(
            { clauseText: text, location: anchor, matchedTerm: term },
            {
                clause: {
                    from: 'document',
                    field: `exclusions[${i}]`,
                    policyId: input.policyId,
                    anchor,
                },
            },
            [
                'Ο όρος παρατίθεται όπως τον διάβασε η ανάλυση από το έγγραφό σας.',
                'Το τι σημαίνει στην πράξη εξαρτάται από το ποσό που έχετε ασφαλίσει και την αξία του ακινήτου — ελέγξτε το με τον ασφαλιστή ή τον σύμβουλό σας.',
            ]
        )
    }

    // Wording matched but nothing could be quoted: say that, rather than either
    // asserting a clause we cannot show or implying there is none.
    if (sawTextWithoutAnchor) {
        return cannotDetermine<AverageClauseFinding>('no_evidence_anchor', [
            `${input.policyId}.extraction.sources`,
        ])
    }

    // Nothing matched. This is NOT `present: false` — see the module note.
    return cannotDetermine<AverageClauseFinding>('field_not_extracted', [
        `${input.policyId}.conditions`,
        `${input.policyId}.exclusions`,
    ])
}
