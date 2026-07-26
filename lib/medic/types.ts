/**
 * MEDIC qualification layer — types for the `Opportunity.medic` JSON snapshot.
 *
 * Blueprint (docs: MEDIC × PolicyWallet integration blueprint, §C/§E): MEDIC is
 * a thin evidence layer over objects that already exist — NOT a standalone
 * module, second pipeline, or new entity tables. The JSON mirrors the
 * acordData/preferences precedent; the sortable scalar lives beside it as
 * `Opportunity.medicScore`.
 *
 * Greek-market reading (§A): Metrics/Pain come from the gap engine + protection
 * score; EB/Champion are the household/SME stakeholders the advisor already
 * knows; Decision Criteria include IDD demands-and-needs + GDPR consent;
 * Decision Process is quote → compare → underwriting → signature timed to the
 * renewal date.
 */

export type MedicStance = 'economic_buyer' | 'champion' | 'influencer' | 'blocker'

export interface MedicStakeholder {
    /** Display name as the advisor knows them (spouse, accountant, office manager…). */
    name: string
    /** Which party they belong to (household, SME, bank…) — free text. */
    party?: string
    stance: MedicStance
    /** True once the advisor has actually identified/confirmed this person. */
    identified?: boolean
    /** Optional evidence pointer (e.g. a collaboration-thread id or note id). */
    evidenceRef?: string
}

export interface MedicCriterion {
    key: string
    label: string
    /** Transparent weight 0|1|2 — no opaque scoring (blueprint §J). */
    weight?: 0 | 1 | 2
    met?: boolean
    /** IDD / GDPR / regulatory criterion — feeds complianceClear. */
    compliance?: boolean
    /** Must be met before the (admin-settable) compliance sub-gate passes. */
    mandatory?: boolean
}

export interface MedicDecisionStep {
    name: string
    /** Which party owns the step (customer, advisor, insurer, underwriting…). */
    ownerParty?: string
    done?: boolean
}

export interface MedicDecisionProcess {
    steps?: MedicDecisionStep[]
    /** e.g. «Λήξη ασφαλιστηρίου αυτοκινήτου 12/09» — the renewal date is the calendar. */
    compellingEvent?: string
    /** ISO date of the compelling event when known (usually the renewal date). */
    compellingEventAt?: string
    signoffs?: string[]
}

export type MedicPainCategory =
    | 'coverage_gap'
    | 'renewal_lapse'
    | 'underinsurance'
    | 'service'
    | 'other'

export interface MedicPain {
    category?: MedicPainCategory
    /** Links to the GapInstance evidence rows (reuse — never duplicate them). */
    gapInstanceIds?: string[]
    summary?: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
    /** True when a Metrics figure quantifies this pain. */
    quantified?: boolean
    /**
     * Mirror of the strongest linked GapInstance.validationState so scoring
     * needs no DB read: probable → confirmed → validated.
     */
    validationState?: 'probable' | 'confirmed' | 'validated'
}

export interface MedicMetrics {
    /** € the customer stands to lose / leave uncovered — from gap value-at-risk. */
    valueAtRisk?: number
    targetOutcome?: string
    /** Confidence of the figures, inherited from extraction confidence. */
    confidence?: 'low' | 'medium' | 'high'
}

export interface MedicData {
    metrics?: MedicMetrics
    stakeholders?: MedicStakeholder[]
    criteria?: MedicCriterion[]
    decisionProcess?: MedicDecisionProcess
    pain?: MedicPain
}

/** Per-dimension transparent rating: 0 = missing, 1 = partial, 2 = solid. */
export interface MedicDimensionRatings {
    metrics: 0 | 1 | 2
    economicBuyer: 0 | 1 | 2
    decisionCriteria: 0 | 1 | 2
    decisionProcess: 0 | 1 | 2
    identifyPain: 0 | 1 | 2
    champion: 0 | 1 | 2
}

export interface MedicScoreResult {
    /** 0–100, transparent: sum(ratings)/12 × 100, rounded. */
    score: number
    ratings: MedicDimensionRatings
    /** Every compliance/mandatory criterion is met (vacuously true when none exist). */
    complianceClear: boolean
    /** Derived qualification (§H): pain ≥ confirmed + a Metrics number + EB identified + score ≥ threshold. */
    qualified: boolean
    /** What is still missing for qualification — drives the missing-data prompts. */
    missing: string[]
}
