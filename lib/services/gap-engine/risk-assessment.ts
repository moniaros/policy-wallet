/**
 * The assessment step — turning "this risk exists for you" into one of six states.
 *
 * The order of operations is the whole design, and it is deliberately the
 * opposite of what the engine did before. Cover is consulted LAST. A risk that
 * does not apply is never examined for cover, and therefore can never become a
 * recommendation — which is what makes "never recommend insurance for an
 * exposure that does not exist" a property of the code rather than a rule each
 * author has to remember.
 *
 *   1. Are the deciding facts known?   no  → `needs_review`  (and stop)
 *   2. Does the exposure exist?        no  → `not_applicable` (and stop)
 *   3. Is it already answered by cover? yes → `already_covered`
 *      …answered in PART only (a named partial line)? → `needs_review` + note
 *   4. Can insurance actually answer it? no → `needs_review` with the reason
 *   5. Otherwise → `protection_gap` (essential) or `opportunity` (discretionary)
 *
 * Only step 5 produces something the customer is asked to act on.
 */

import { normalizeBranch } from "@/lib/insurance/taxonomy"
import type { LifeContext, ContextFactorKey } from "./life-context"
import { heldElsewhere } from "./life-context"
import { RISK_CATALOG } from "./risk-catalog"
import type {
    Bilingual,
    Mitigation,
    PartialSubstitute,
    RiskAssessment,
    RiskConfidence,
    RiskDefinition,
    RiskPriority,
    RiskStatus,
} from "./risk-types"

/** Minimal policy shape the assessment needs. `status` must already be derived. */
export interface HeldPolicy {
    lineOfBusiness: string
    status: string
}

const PRIORITY_ORDER: Record<RiskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
}

export function comparePriority(a: RiskPriority, b: RiskPriority): number {
    return PRIORITY_ORDER[a] - PRIORITY_ORDER[b]
}

// ── Which lines answer a risk ────────────────────────────────────────
//
// EXACT branch ids, always. The engine used to expand every named line to its
// taxonomy family, and the taxonomy aggregates for DISPLAY, not for cover:
// `income_protection`, `disability` and `personal_accident` file under `life`,
// so a self-employed person's income policy marked «Απώλεια του εισοδήματος
// από το οποίο εξαρτάται το νοικοκυριό σας» — a death risk — as covered, and
// `renters` files under `home`, so a tenant's contents policy answered the
// landlord's building. Where a child line genuinely answers a risk the
// catalogue names it (`motor_liability` names `motorbike` and `truck`), and a
// line that answers only PART of a risk is a `partiallyCoveredBy` entry that
// can reach `needs_review` with its note, never `already_covered`.

/** The exact lines that FULLY answer a risk: its own plus `alsoCoveredBy`, lower-cased, deduped. */
export function fullSubstitutes(risk: RiskDefinition): string[] {
    return [...new Set([risk.lineOfBusiness, ...(risk.alsoCoveredBy ?? [])].map((lob) => lob.toLowerCase()))]
}

/** The lines that answer PART of a risk, with their notes. */
export function partialSubstitutes(risk: RiskDefinition): PartialSubstitute[] {
    return risk.partiallyCoveredBy ?? []
}

/** Every line a risk can name — full and partial — for the guards that check branch ids. */
export function namedLines(risk: RiskDefinition): string[] {
    return [...new Set([...fullSubstitutes(risk), ...partialSubstitutes(risk).map((p) => p.line.toLowerCase())])]
}

function liveLineIds(policies: HeldPolicy[]): string[] {
    return policies.filter((p) => p.status === "active").map((p) => normalizeBranch(p.lineOfBusiness).id)
}

/** Which of the customer's live lines fully answer this risk — distinct exact ids. */
function coveringLines(risk: RiskDefinition, policies: HeldPolicy[]): string[] {
    const accepted = new Set(fullSubstitutes(risk))
    return [...new Set(liveLineIds(policies).filter((id) => accepted.has(id)))]
}

/** Which of the customer's live lines answer PART of this risk, with the notes. */
function partialCoveringLines(risk: RiskDefinition, policies: HeldPolicy[]): PartialSubstitute[] {
    const live = new Set(liveLineIds(policies))
    return partialSubstitutes(risk).filter((p) => live.has(p.line.toLowerCase()))
}

/** How many live policies fully answer this risk — POLICIES, not distinct lines. */
function coveringPolicyCount(risk: RiskDefinition, policies: HeldPolicy[]): number {
    const accepted = new Set(fullSubstitutes(risk))
    return liveLineIds(policies).filter((id) => accepted.has(id)).length
}

/** Lines the customer says they hold outside PolicyWallet that fully answer this risk. */
function externallyCovered(risk: RiskDefinition, ctx: LifeContext): string[] {
    return fullSubstitutes(risk).filter((lob) => heldElsewhere(ctx, lob))
}

/** Partial lines the customer says they hold outside PolicyWallet. */
function externallyPartial(risk: RiskDefinition, ctx: LifeContext): PartialSubstitute[] {
    return partialSubstitutes(risk).filter((p) => heldElsewhere(ctx, p.line))
}

/** One note for the card when several partial lines are held. */
function partialNote(entries: PartialSubstitute[]): Bilingual {
    return {
        en: entries.map((e) => e.note.en).join(" "),
        el: entries.map((e) => e.note.el).join(" "),
    }
}

/**
 * How much of the assessment rests on answered facts.
 *
 * Unanswered SUPPORTING factors never block a finding — they lower confidence,
 * so the card can say "this is what we can tell from what we know" instead of
 * overstating. Self-declared external cover is capped at medium because we are
 * taking the customer's word for a policy we have never seen.
 */
function confidenceFor(
    risk: RiskDefinition,
    ctx: LifeContext,
    opts: { viaExternal: boolean; blockedByEligibility: boolean }
): RiskConfidence {
    if (opts.blockedByEligibility) return "low"
    const supports = risk.supports ?? []
    const knownSupports = supports.filter((f) => ctx.known[f]).length
    const ratio = supports.length === 0 ? 1 : knownSupports / supports.length
    if (opts.viaExternal) return ratio >= 0.5 ? "medium" : "low"
    if (ratio >= 0.999) return "high"
    if (ratio >= 0.5) return "medium"
    return "low"
}

/**
 * The insurance option, flattened for the persisted column and older readers.
 *
 * Derived rather than authored so it can never disagree with the ladder the
 * customer is shown. Where a risk has no insurance answer at all — which the
 * model deliberately allows — this says so instead of inventing one.
 */
function transferSummary(mitigations: Mitigation[]): Bilingual {
    const transfers = mitigations.filter((m) => m.kind === "transfer")
    if (transfers.length === 0) {
        return {
            en: "There is no insurance answer to this one — the options above are the ones that work.",
            el: "Δεν υπάρχει ασφαλιστική απάντηση σε αυτό — οι παραπάνω επιλογές είναι αυτές που λειτουργούν.",
        }
    }
    return {
        en: transfers.map((m) => `${m.label.en}. ${m.detail.en}`).join(" "),
        el: transfers.map((m) => `${m.label.el} ${m.detail.el}`).join(" "),
    }
}

function needsReviewCopy(missing: ContextFactorKey[]): Bilingual {
    const labels = missing.map((f) => FACTOR_LABELS[f])
    return {
        en: `We have not asked about ${labels.map((l) => l.en).join(", ")} yet, so we are not calling this a gap. Answer it and we will assess it properly.`,
        el: `Δεν σας έχουμε ρωτήσει ακόμη για ${labels.map((l) => l.el).join(", ")}, οπότε δεν το χαρακτηρίζουμε κενό. Απαντήστε και θα το αξιολογήσουμε σωστά.`,
    }
}

/** Human names for the context factors, used in "what to answer next" copy. */
export const FACTOR_LABELS: Record<ContextFactorKey, Bilingual> = {
    age: { en: "your age", el: "την ηλικία σας" },
    maritalStatus: { en: "your marital status", el: "την οικογενειακή σας κατάσταση" },
    children: { en: "children", el: "παιδιά" },
    dependents: { en: "who depends on your income", el: "ποιοι εξαρτώνται από το εισόδημά σας" },
    pets: { en: "pets", el: "κατοικίδια" },
    vehicles: { en: "vehicles", el: "οχήματα" },
    residence: { en: "whether you own or rent your home", el: "αν έχετε ιδιόκτητη ή ενοικιαζόμενη κατοικία" },
    tenancy: { en: "your housing arrangement", el: "τη μορφή κατοικίας σας" },
    propertyOwnership: { en: "property you own", el: "ακίνητα που σας ανήκουν" },
    tenants: { en: "whether you let out property", el: "αν εκμισθώνετε ακίνητο" },
    boat: { en: "whether you own a boat", el: "αν έχετε σκάφος" },
    businessOwnership: { en: "business ownership", el: "αν έχετε επιχείρηση" },
    selfEmployed: { en: "your employment status", el: "την εργασιακή σας κατάσταση" },
    employees: { en: "whether you employ anyone", el: "αν απασχολείτε προσωπικό" },
    income: { en: "your income", el: "το εισόδημά σας" },
    savings: { en: "your savings", el: "τις αποταμιεύσεις σας" },
    mortgage: { en: "a mortgage", el: "στεγαστικό δάνειο" },
    loans: { en: "other loans", el: "άλλα δάνεια" },
    travelFrequency: { en: "how often you travel", el: "πόσο συχνά ταξιδεύετε" },
    hobbies: { en: "sports and hobbies", el: "αθλήματα και χόμπι" },
    valuables: { en: "valuable possessions", el: "αντικείμενα υψηλής αξίας" },
    cyberExposure: { en: "your online financial exposure", el: "τη διαδικτυακή οικονομική σας έκθεση" },
    retirementPlanning: { en: "retirement planning", el: "τον συνταξιοδοτικό σας σχεδιασμό" },
    health: { en: "any ongoing health conditions", el: "τυχόν χρόνιες παθήσεις" },
    buildingManagerRole: {
        en: "whether you act as the manager of a block of flats",
        el: "αν είστε διαχειριστής πολυκατοικίας",
    },
}

/**
 * Assess one risk against one life.
 *
 * Pure: no DB, no clock beyond what the caller baked into `ctx`.
 */
export function assessRisk(
    risk: RiskDefinition,
    ctx: LifeContext,
    policies: HeldPolicy[]
): RiskAssessment {
    const missingFactors = risk.requires.filter((f) => !ctx.known[f])

    const base = {
        riskId: risk.id,
        lineOfBusiness: risk.lineOfBusiness,
        kind: risk.kind,
        name: risk.name,
        missingFactors,
    }

    // ── 1. Do we know enough to decide? ──────────────────────────────
    // The engine's most important refusal. Before this existed, an unfilled
    // profile read as "owns nothing, has nobody" and the rules answered anyway.
    if (missingFactors.length > 0) {
        return {
            ...base,
            applicability: "needs_review",
            status: "needs_review",
            priority: "low",
            confidence: "low",
            riskExplanation: risk.riskExplanation(ctx),
            whyItApplies: needsReviewCopy(missingFactors),
            expectedImpact: {
                en: "We cannot size this until we know more about your situation.",
                el: "Δεν μπορούμε να το υπολογίσουμε μέχρι να μάθουμε περισσότερα για την κατάστασή σας.",
            },
            mitigations: risk.mitigations(ctx),
            suggestedSolution: transferSummary(risk.mitigations(ctx)),
            eligibilityNote: null,
            coveredBy: [],
            partialCover: null,
        }
    }

    // ── 2. Does the exposure exist? ──────────────────────────────────
    if (!risk.applies(ctx)) {
        return {
            ...base,
            applicability: "not_applicable",
            status: "not_applicable",
            priority: "low",
            confidence: "high",
            riskExplanation: risk.riskExplanation(ctx),
            whyItApplies: {
                en: "Nothing in your profile puts you in scope for this, so we are not raising it.",
                el: "Τίποτα στο προφίλ σας δεν σας εντάσσει σε αυτόν τον κίνδυνο, οπότε δεν τον εγείρουμε.",
            },
            expectedImpact: {
                en: "No exposure recorded.",
                el: "Δεν καταγράφεται έκθεση.",
            },
            mitigations: [],
            suggestedSolution: {
                en: "No action needed.",
                el: "Δεν απαιτείται ενέργεια.",
            },
            eligibilityNote: null,
            coveredBy: [],
            partialCover: null,
        }
    }

    // `discretionary` means the loss is real but survivable, so its priority is
    // capped below the essential band no matter how the escalators stack.
    //
    // Without the cap, health_access_delay — private treatment SPEED, when
    // ΕΟΠΥΥ already covers the treatment — reached `high` for a self-employed
    // person with family medical history, ranking level with an entirely
    // uninsured business and above an employer's liability for four staff. A
    // convenience product outranking a compulsory-in-practice one is exactly the
    // mis-ordering the priority model exists to prevent.
    const rawPriority = risk.priority(ctx)
    const priority: RiskPriority =
        risk.kind === "discretionary" && PRIORITY_ORDER[rawPriority] < PRIORITY_ORDER.medium
            ? "medium"
            : rawPriority
    const caveat = risk.eligibility?.(ctx) ?? null
    const held = coveringLines(risk, policies)
    const external = externallyCovered(risk, ctx)
    const partialHeld = partialCoveringLines(risk, policies)
    const partialExternal = externallyPartial(risk, ctx)

    // ── 3. Is it already answered? ───────────────────────────────────
    // "Something in this family is insured" is not the same as "this exposure is
    // insured" when the customer has more than one of the thing. See minPolicies.
    const needed = risk.minPolicies?.(ctx) ?? 1
    const heldCount = coveringPolicyCount(risk, policies)
    if (held.length > 0 && external.length === 0 && heldCount < needed) {
        return {
            ...base,
            applicability: "applicable",
            status: "needs_review",
            priority,
            confidence: "low",
            riskExplanation: risk.riskExplanation(ctx),
            whyItApplies: risk.whyItApplies(ctx),
            expectedImpact: risk.expectedImpact(ctx),
            mitigations: risk.mitigations(ctx),
            suggestedSolution: {
                en: `You hold ${heldCount} policy in this area but your situation needs ${needed}. Add the other policies here, or check with your advisor which of them is actually insured.`,
                el: `Έχετε ${heldCount} ασφαλιστήριο σε αυτόν τον τομέα, ενώ η κατάστασή σας απαιτεί ${needed}. Προσθέστε τα υπόλοιπα εδώ, ή ελέγξτε με τον σύμβουλό σας ποιο από αυτά είναι πράγματι ασφαλισμένο.`,
            },
            eligibilityNote: caveat?.note ?? null,
            coveredBy: held,
            partialCover: null,
        }
    }

    if (held.length > 0 || external.length > 0) {
        const viaExternal = held.length === 0 && external.length > 0
        return {
            ...base,
            applicability: "applicable",
            status: "already_covered",
            priority,
            confidence: confidenceFor(risk, ctx, { viaExternal, blockedByEligibility: false }),
            riskExplanation: risk.riskExplanation(ctx),
            whyItApplies: risk.whyItApplies(ctx),
            expectedImpact: risk.expectedImpact(ctx),
            mitigations: risk.mitigations(ctx),
            suggestedSolution: viaExternal
                ? {
                      en: "You told us this is covered outside PolicyWallet. Adding the policy here lets us check its limits and renewal date.",
                      el: "Μας δηλώσατε ότι καλύπτεται εκτός PolicyWallet. Προσθέτοντας το ασφαλιστήριο εδώ μπορούμε να ελέγξουμε όρια και ημερομηνία ανανέωσης.",
                  }
                : {
                      en: "Cover is in place. The remaining question is whether its limits match the exposure above.",
                      el: "Η κάλυψη υπάρχει. Το ερώτημα που μένει είναι αν τα όριά της αντιστοιχούν στην παραπάνω έκθεση.",
                  },
            eligibilityNote: caveat?.note ?? null,
            coveredBy: held.length > 0 ? held : external,
            partialCover: null,
        }
    }

    // ── 3b. Answered in PART only ────────────────────────────────────
    // A personal-accident policy against a death risk, a hull policy against
    // the boat's liability: something relevant is held, and it does not settle
    // the question. Reporting `already_covered` would tell the person to stop
    // looking; reporting a gap would ignore what they hold. So: review, with
    // the note saying what the held line does and does not do.
    if (partialHeld.length > 0 || partialExternal.length > 0) {
        const viaExternal = partialHeld.length === 0
        const entries = viaExternal ? partialExternal : partialHeld
        const note = partialNote(entries)
        return {
            ...base,
            applicability: "applicable",
            status: "needs_review",
            priority,
            confidence: confidenceFor(risk, ctx, { viaExternal, blockedByEligibility: false }),
            riskExplanation: risk.riskExplanation(ctx),
            whyItApplies: risk.whyItApplies(ctx),
            expectedImpact: risk.expectedImpact(ctx),
            mitigations: risk.mitigations(ctx),
            suggestedSolution: {
                en: `What you hold answers part of this. ${note.en} Check whether the rest is covered, or add the policy that does.`,
                el: `Ό,τι έχετε απαντά σε μέρος αυτού. ${note.el} Ελέγξτε αν καλύπτονται και τα υπόλοιπα, ή προσθέστε το ασφαλιστήριο που το κάνει.`,
            },
            eligibilityNote: caveat?.note ?? null,
            coveredBy: entries.map((e) => e.line.toLowerCase()),
            partialCover: note,
        }
    }

    // ── 4. Can insurance actually answer it? ─────────────────────────
    // A blocking caveat means the market will not sell what the risk needs, or
    // will not sell it to this person. Reporting that as a gap to close sets an
    // expectation the customer cannot act on.
    if (caveat?.blocking) {
        return {
            ...base,
            applicability: "applicable",
            status: "needs_review",
            priority,
            confidence: confidenceFor(risk, ctx, { viaExternal: false, blockedByEligibility: true }),
            riskExplanation: risk.riskExplanation(ctx),
            whyItApplies: risk.whyItApplies(ctx),
            expectedImpact: risk.expectedImpact(ctx),
            mitigations: risk.mitigations(ctx),
            suggestedSolution: transferSummary(risk.mitigations(ctx)),
            eligibilityNote: caveat.note,
            coveredBy: [],
            partialCover: null,
        }
    }

    // ── 5. A real, uncovered, insurable exposure ─────────────────────
    return {
        ...base,
        applicability: "applicable",
        status: risk.kind === "essential" ? "protection_gap" : "opportunity",
        priority,
        confidence: confidenceFor(risk, ctx, { viaExternal: false, blockedByEligibility: false }),
        riskExplanation: risk.riskExplanation(ctx),
        whyItApplies: risk.whyItApplies(ctx),
        expectedImpact: risk.expectedImpact(ctx),
        mitigations: risk.mitigations(ctx),
        suggestedSolution: transferSummary(risk.mitigations(ctx)),
        eligibilityNote: caveat?.note ?? null,
        coveredBy: [],
        partialCover: null,
    }
}

/**
 * Assess the whole catalog. Returns EVERY risk, including the ones that do not
 * apply — the dashboard needs to be able to say "we checked this and it is not
 * your risk", which is a different and more trustworthy statement than silence.
 *
 * Sorted: open findings first (by priority), then already-covered, then
 * needs-review, then not-applicable.
 */
export function assessRisks(ctx: LifeContext, policies: HeldPolicy[]): RiskAssessment[] {
    const results = RISK_CATALOG.map((risk) => assessRisk(risk, ctx, policies))

    const statusRank: Record<RiskStatus, number> = {
        protection_gap: 0,
        opportunity: 1,
        applicable: 2,
        already_covered: 3,
        needs_review: 4,
        not_applicable: 5,
    }

    return results.sort((a, b) => {
        const s = statusRank[a.status] - statusRank[b.status]
        if (s !== 0) return s
        const p = comparePriority(a.priority, b.priority)
        if (p !== 0) return p
        return a.riskId.localeCompare(b.riskId)
    })
}

// ── Selectors ────────────────────────────────────────────────────────

/** Findings the customer is asked to act on. */
export function openFindings(assessments: RiskAssessment[]): RiskAssessment[] {
    return assessments.filter(
        (a) => a.status === "protection_gap" || a.status === "opportunity"
    )
}

/**
 * Risks in scope for the protection score — applicable ones only.
 *
 * `not_applicable` and `needs_review` are both excluded, for different reasons:
 * the first is not this customer's risk, and the second is a question we have
 * not asked. Scoring either would mean scoring our own ignorance.
 */
export function scorableRisks(assessments: RiskAssessment[]): RiskAssessment[] {
    return assessments.filter((a) => a.applicability === "applicable")
}

/**
 * Lines this customer genuinely needs — the input to the branch coverage map.
 *
 * For an OPEN finding that is the line that would answer it. For one already
 * covered it is the line that ACTUALLY covers it, which is not always the same:
 * `valuables_loss` is written against `gadget` but is commonly answered by a
 * home policy's specified-items extension. Returning its nominal line would put
 * `gadget` in the expected set with no gadget policy against it, and
 * `deriveBranchState` would paint the tile as a gap for a risk we had just
 * concluded was covered.
 */
export function relevantLines(assessments: RiskAssessment[]): string[] {
    const lines = new Set<string>()
    for (const a of scorableRisks(assessments)) {
        if (a.status === "already_covered" && a.coveredBy.length > 0) {
            for (const lob of a.coveredBy) lines.add(lob.toLowerCase())
        } else {
            lines.add(a.lineOfBusiness.toLowerCase())
        }
    }
    return [...lines]
}

/** Distinct factors that, if answered, would resolve at least one open question. */
export function factorsToResolve(assessments: RiskAssessment[]): ContextFactorKey[] {
    const seen = new Set<ContextFactorKey>()
    for (const a of assessments) {
        if (a.status !== "needs_review") continue
        for (const f of a.missingFactors) seen.add(f)
    }
    return [...seen]
}

/** Counts per status — the dashboard summary band. */
export function statusCounts(assessments: RiskAssessment[]): Record<RiskStatus, number> {
    const counts: Record<RiskStatus, number> = {
        applicable: 0,
        not_applicable: 0,
        already_covered: 0,
        needs_review: 0,
        protection_gap: 0,
        opportunity: 0,
    }
    for (const a of assessments) counts[a.status]++
    return counts
}
