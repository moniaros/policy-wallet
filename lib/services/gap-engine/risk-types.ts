/**
 * Life Context Risk Assessment — shared vocabulary.
 *
 * A `RiskDefinition` describes a loss that a person can suffer, not a product a
 * person can buy. It answers three questions in order, and refuses to answer the
 * later ones until the earlier ones pass:
 *
 *   1. Does this risk exist for this customer?  → `applies(ctx)`, gated by `requires`
 *   2. Could they realistically suffer the loss? → `applies` + `priority(ctx)`
 *   3. Is insurance an appropriate mitigation?   → `kind` + `eligibility(ctx)`
 *
 * The gate on (1) is the structural guarantee. A risk declares the context
 * factors it needs; while any of them is unknown the assessment is
 * `needs_review` and can never become a protection gap. That is what makes
 * "never recommend for an exposure that does not exist" enforceable by
 * construction instead of by discipline in each rule.
 */

import type { LifeContext, ContextFactorKey } from "./life-context"

/** Bilingual copy. Greek is the product default; both are always populated. */
export interface Bilingual {
    en: string
    el: string
}

/** Reused from the old severity vocabulary so persisted `urgency` values are unchanged. */
export type RiskPriority = "critical" | "high" | "medium" | "low"

/**
 * How much of the assessment rests on facts rather than defaults.
 *
 * `high`   — every deciding factor answered, and cover state is unambiguous.
 * `medium` — decided on answered facts, but something material is still unknown
 *            (typically the amount behind a yes/no, or cover held elsewhere).
 * `low`    — applicability itself is undetermined; shown so the reader knows the
 *            card is a question, not a finding.
 */
export type RiskConfidence = "high" | "medium" | "low"

/**
 * Whether the customer's situation puts this risk in scope.
 *
 * `needs_review` is a first-class answer, not a failure: it means we have not
 * asked, and it keeps the risk out of both the recommendation list and the
 * protection-score denominator.
 */
export type RiskApplicability = "applicable" | "not_applicable" | "needs_review"

/**
 * The six states a risk can be reported in.
 *
 * - `not_applicable`  — the exposure does not exist. Excluded from the score
 *                       entirely and never recommended. (No pet → no pet risk.)
 * - `needs_review`    — a deciding factor is unanswered, or the customer holds
 *                       cover whose adequacy we cannot verify.
 * - `already_covered` — the exposure exists and live cover answers it.
 * - `protection_gap`  — the exposure exists, nothing covers it, and the loss is
 *                       one a household does not absorb.
 * - `opportunity`     — the exposure exists and is uncovered, but the loss is
 *                       survivable; worth knowing, not an alarm.
 * - `applicable`      — the exposure exists and classification could not be
 *                       resolved further. A safety net, not a normal outcome.
 */
export type RiskStatus =
    | "not_applicable"
    | "needs_review"
    | "already_covered"
    | "protection_gap"
    | "opportunity"
    | "applicable"

export const RISK_STATUS_VALUES: RiskStatus[] = [
    "applicable",
    "not_applicable",
    "already_covered",
    "needs_review",
    "protection_gap",
    "opportunity",
]

/** Statuses that represent an open, actionable finding. */
export const OPEN_RISK_STATUSES: RiskStatus[] = ["protection_gap", "opportunity"]

/**
 * `essential` losses are the ones a household cannot absorb — they become
 * `protection_gap` when uncovered. `discretionary` losses are real but
 * survivable; uncovered they become `opportunity`. The distinction is what stops
 * the product shouting at someone about pet cover in the same voice it uses for
 * an uninsured car.
 */
export type RiskKind = "essential" | "discretionary"

/**
 * A reason insurance may not be an appropriate or available answer, even though
 * the risk is real. Surfaced verbatim on the card: raising an expectation the
 * Greek market will not honour is worse than saying nothing.
 */
export interface EligibilityCaveat {
    /** Stops the risk being reported as a gap; it degrades to `needs_review`. */
    blocking: boolean
    note: Bilingual
}

/**
 * How a risk can actually be dealt with.
 *
 * Four kinds, in the order a risk consultant considers them — and insurance is
 * the last of them, not the frame. Before this existed every risk in the catalog
 * answered "what covers it?" with an insurance product, because there was no
 * field in which any other answer could be written. A model that can only
 * express `transfer` is not advising; it is quoting.
 *
 * - `avoid`    remove the exposure entirely (deposit the plates on a car you no
 *              longer drive). Rarely the advice, occasionally the honest one.
 * - `reduce`   lower frequency or severity (an alarm, a safe, a service plan).
 * - `retain`   carry it yourself on purpose. For a small loss against real
 *              savings this is the CORRECT answer, and a product that cannot say
 *              so has nothing to offer the well-prepared.
 * - `transfer` move it to someone else. Insurance is one transfer; an employer's
 *              group scheme and a landlord's contractual obligation are others,
 *              and we do not sell either.
 */
export type MitigationKind = "avoid" | "reduce" | "retain" | "transfer"

export interface Mitigation {
    kind: MitigationKind
    /** Short imperative — what to do. */
    label: Bilingual
    /** Why it works, and what it costs or leaves behind. */
    detail: Bilingual
    /** Set only when this transfer is an insurance line we can point at. */
    line?: string
}

/** A line that answers part of a risk, with the note the surfaces show. */
export interface PartialSubstitute {
    /** Exact branch id. */
    line: string
    /** What this line covers and leaves open — «καλύπτει μόνο θάνατο από ατύχημα». */
    note: Bilingual
}

export interface RiskDefinition {
    id: string
    /** The line that answers this risk. Also the score-category attribution key. */
    lineOfBusiness: string
    kind: RiskKind

    /**
     * Context factors that decide applicability. While ANY is unknown the risk
     * reports `needs_review`. This is the engine's central guarantee — see the
     * module header.
     */
    requires: ContextFactorKey[]

    /**
     * Factors that refine priority or wording but do not decide applicability.
     * Unknown supporting factors lower confidence; they never block a finding.
     */
    supports?: ContextFactorKey[]

    /** Short human name for the finding. */
    name: Bilingual

    /** Does the exposure exist? Called only once every `requires` factor is known. */
    applies: (ctx: LifeContext) => boolean

    /** What can go wrong, stated as a loss — never as a product. */
    riskExplanation: (ctx: LifeContext) => Bilingual

    /** The customer's own facts that put them in scope. */
    whyItApplies: (ctx: LifeContext) => Bilingual

    /** What the loss would cost them, in their numbers where we have them. */
    expectedImpact: (ctx: LifeContext) => Bilingual

    /**
     * Everything that can be done about it — avoid, reduce, retain, transfer.
     * At least one entry must be non-`transfer`: see `MitigationKind`.
     */
    mitigations: (ctx: LifeContext) => Mitigation[]

    /** Materiality-scaled priority (audit R-18). */
    priority: (ctx: LifeContext) => RiskPriority

    /** Market or eligibility reality that qualifies the recommendation. */
    eligibility?: (ctx: LifeContext) => EligibilityCaveat | null

    /**
     * Extra lines that FULLY answer this risk, beyond `lineOfBusiness`. Every
     * entry is an exact branch id — there is no family expansion anywhere in
     * the engine, so a child line answers a risk only where a risk names it
     * (`motor_liability` names `motorbike` and `truck`; `home_building_damage`
     * names nothing, so a renters policy no longer answers a building risk,
     * and an income-protection policy no longer answers a death risk because
     * the taxonomy files it under `life`).
     */
    alsoCoveredBy?: string[]

    /**
     * Lines that answer PART of this risk — a personal-accident policy pays on
     * death by accident only, a hull policy may or may not carry the boat's
     * liability. A partial line never makes the risk `already_covered`: with
     * nothing full held it reports `needs_review` with the entry's note as
     * `partialCover`, so the surfaces say «αξίζει να το εξετάσουμε» with the
     * reason, never «φαίνεται να καλύπτεται».
     */
    partiallyCoveredBy?: PartialSubstitute[]

    /**
     * How many matching policies it takes to actually answer this risk. Default 1.
     *
     * Exists because one policy does not cover two houses. A customer with a
     * holiday home and a single home policy was reported `already_covered` —
     * false reassurance, which is worse than a false positive, because it tells
     * someone to stop looking. Where the count falls short the risk reports
     * `needs_review`: we can see that something is insured and cannot see which,
     * and guessing either way would be a fabrication.
     */
    minPolicies?: (ctx: LifeContext) => number
}

/** One assessed risk for one customer — the engine's output unit. */
export interface RiskAssessment {
    riskId: string
    lineOfBusiness: string
    kind: RiskKind
    applicability: RiskApplicability
    status: RiskStatus
    priority: RiskPriority
    confidence: RiskConfidence

    name: Bilingual
    riskExplanation: Bilingual
    whyItApplies: Bilingual
    expectedImpact: Bilingual
    /**
     * Everything that can be done — avoid, reduce, retain, transfer. Insurance
     * appears here as one labelled option among others, never as the frame.
     */
    mitigations: Mitigation[]
    /**
     * The insurance option alone, kept because the persisted recommendation
     * column and several older readers speak it. Derived from `mitigations` —
     * never authored separately, so the two cannot drift.
     */
    suggestedSolution: Bilingual

    /** Non-blocking market reality (e.g. pre-existing-condition exclusions). */
    eligibilityNote: Bilingual | null

    /** Factors that were unanswered — what to ask next to resolve this card. */
    missingFactors: ContextFactorKey[]

    /**
     * Lines that answered the risk: the full substitutes when `already_covered`,
     * the partial ones when `needs_review` carries a `partialCover` note.
     */
    coveredBy: string[]

    /**
     * Set when the only answer held is a partial one (`partiallyCoveredBy`):
     * the note saying what the held line does and does not cover. Null
     * otherwise. The status is then `needs_review` with `applicability`
     * `applicable` — an exposure that exists, answered in part.
     */
    partialCover: Bilingual | null
}
