/**
 * Computing Risk DNA, and answering the five questions.
 *
 * Every feature in this platform has to answer the same five things, and a
 * dimension is where they become concrete:
 *
 *  1. **What changed?** — `trend`, from the version history. Null when there is
 *     no history, because a trend line drawn through one point is a decoration.
 *  2. **Why does it matter?** — `whyItMatters`, built from the risks actually
 *     open in the dimension, not from a description of the dimension.
 *  3. **What should happen next?** — `nextAction`, taken from the mitigation
 *     ladder of the highest-priority open risk, so it can legitimately be
 *     "keep a fund instead of buying cover".
 *  4. **How confident?** — `confidence`, composed weakest-link from the risks
 *     underneath, plus the reason it is not higher.
 *  5. **How does this improve protection?** — `ifActioned`, the actual movement
 *     in the protection score if the named risk were answered. Computed by
 *     re-running the real scorer with that risk covered, not estimated.
 *
 * Pure. Assessments and history in, dimensions out.
 */

import type { Bilingual, RiskAssessment, RiskConfidence } from "@/lib/services/gap-engine/risk-types"
import { calculateScoreFromAssessments } from "@/lib/services/gap-engine/protection-score"
import type { LifeContext } from "@/lib/services/gap-engine/life-context"
import {
    DIMENSION_DEFINITIONS,
    isCoarse,
    type DimensionDefinition,
    type RiskDimension,
} from "./dimensions"

const OPEN = new Set(["protection_gap", "opportunity"])
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export type Trend = "improving" | "worsening" | "steady" | "unknown"
export type DimensionUrgency = "now" | "soon" | "watch" | "none"

export interface DimensionResult {
    id: RiskDimension
    label: Bilingual
    question: Bilingual

    /**
     * 0-100, or null when nothing in this dimension applies to the customer.
     *
     * Null is not zero. A childless renter has no Family exposure, and scoring
     * that as 0 would report the safest possible position as the worst one — the
     * defect the whole risk rebuild existed to remove.
     */
    score: number | null
    /** True when one risk backs the whole dimension, so the scale is binary. */
    coarse: boolean

    confidence: RiskConfidence
    /** Why confidence is not higher. Null when it is already high. */
    confidenceLimit: Bilingual | null

    trend: Trend
    /** Movement in this dimension's score since the previous version. */
    trendDelta: number | null

    urgency: DimensionUrgency

    // ── The five answers ─────────────────────────────────────────────
    whatChanged: Bilingual | null
    whyItMatters: Bilingual
    nextAction: Bilingual | null
    /** Movement in the PROTECTION SCORE if `nextAction` were taken. */
    ifActioned: { points: number } | null

    /**
     * The risks counted here, open first.
     *
     * Carried in full rather than as ids so a dimension can BE the drill-down.
     * The product previously rendered a flat list of all 21 risks on a separate
     * panel beside these nine dimensions — two views of one assessment, and a
     * customer cannot hold both. The list belongs inside the dimension it
     * concerns, where it answers a question they just asked.
     */
    risks: DimensionRisk[]
    openCount: number
    applicableCount: number
}

export interface DimensionRisk {
    riskId: string
    name: Bilingual
    status: string
    priority: string
    /** What the loss actually is, in their terms. */
    whyItMatters: Bilingual
    /** Why it applies to THIS customer — the anti-product-pitch field. */
    whyItApplies: Bilingual
    /** Everything that can be done, insurance being one option among four. */
    actions: Array<{ kind: string; label: Bilingual }>
    /** Cover already answering it. */
    coveredBy: string[]
}

export interface DnaHistoryPoint {
    /** Per-dimension score at that version, as this module computes it. */
    scores: Partial<Record<RiskDimension, number | null>>
}

// ── Financial resilience ─────────────────────────────────────────────

/**
 * Capacity, not cover.
 *
 * Four inputs the graph already holds, on an ABSOLUTE scale rather than against
 * peers — twelve months' runway is strong for anyone, and grading on a curve
 * would tell a well-prepared customer they are average.
 */
export function resilienceScore(ctx: LifeContext): { score: number | null; basis: Bilingual } {
    const income = ctx.annualIncome
    const savings = ctx.savingsAmount
    if (!ctx.known.savings || savings === null) {
        return {
            score: null,
            basis: {
                en: "We have not asked what you have set aside, so there is nothing to measure yet.",
                el: "Δεν σας έχουμε ρωτήσει τι έχετε στην άκρη, οπότε δεν υπάρχει κάτι να μετρηθεί ακόμη.",
            },
        }
    }

    // Runway (40%). Monthly outgoings are unknown, so income is the proxy —
    // stated rather than hidden, because it overstates runway for anyone whose
    // costs are below their income and understates it for anyone above.
    const monthly = income && income > 0 ? income / 12 : null
    const runwayMonths = monthly ? savings / monthly : null
    const runwayPoints = runwayMonths === null ? 0 : Math.min(1, runwayMonths / 12) * 40

    // Debt-to-income (25%). Obligations survive an income interruption.
    const debt = (ctx.mortgageAmount ?? 0) + (ctx.loanAmount ?? 0)
    const debtRatio = income && income > 0 ? debt / income : null
    const debtPoints = debtRatio === null ? 12.5 : Math.max(0, 1 - Math.min(1, debtRatio / 5)) * 25

    // Dependants per earner (20%). How many people one interruption reaches.
    const dependants = Math.max(0, ctx.dependentsCount)
    const dependantPoints = Math.max(0, 1 - Math.min(1, dependants / 4)) * 20

    // Cover breadth (15%). Cover is itself resilience.
    const coverPoints = 15 * Math.min(1, (ctx.known.income ? 1 : 0) * 0.5 + 0.5)

    const score = Math.round(runwayPoints + debtPoints + dependantPoints + coverPoints)

    return {
        score: Math.max(0, Math.min(100, score)),
        basis:
            runwayMonths === null
                ? {
                      en: "Based on what you have set aside. Without an income figure we cannot express it as months of runway.",
                      el: "Με βάση όσα έχετε στην άκρη. Χωρίς στοιχείο εισοδήματος δεν μπορούμε να το εκφράσουμε σε μήνες αυτονομίας.",
                  }
                : {
                      en: `Roughly ${Math.floor(runwayMonths)} ${Math.floor(runwayMonths) === 1 ? "month" : "months"} of income set aside, measured against your income rather than your actual outgoings, which we do not hold.`,
                      el: `Περίπου ${Math.floor(runwayMonths)} ${Math.floor(runwayMonths) === 1 ? "μήνας" : "μήνες"} εισοδήματος στην άκρη, μετρημένο σε σχέση με το εισόδημά σας και όχι με τα πραγματικά έξοδά σας, τα οποία δεν γνωρίζουμε.`,
                  },
    }
}

// ── Dimension computation ────────────────────────────────────────────

function scoreDimension(open: number, applicable: number): number | null {
    if (applicable === 0) return null
    return Math.round(((applicable - open) / applicable) * 100)
}

function composeConfidence(risks: RiskAssessment[]): RiskConfidence {
    // Weakest link: a dimension is only as certain as its least certain risk.
    if (risks.some((r) => r.confidence === "low")) return "low"
    if (risks.some((r) => r.confidence === "medium")) return "medium"
    return "high"
}

export interface ComputeInputs {
    assessments: RiskAssessment[]
    ctx: LifeContext
    /** Active lines, for the score re-run behind `ifActioned`. */
    activeLines: string[]
    /** The dimension scores at the previous version, for trend. */
    previous?: DnaHistoryPoint | null
}

export function computeRiskDna(inputs: ComputeInputs): DimensionResult[] {
    const { assessments, ctx, activeLines, previous } = inputs
    const byId = new Map(assessments.map((a) => [a.riskId, a]))

    // The baseline the `ifActioned` projections are measured against. Computed
    // once from the REAL scorer, so a projection cannot drift from the number
    // the customer is actually shown.
    const baseline = calculateScoreFromAssessments(assessments, activeLines).overallScore

    return DIMENSION_DEFINITIONS.map((definition) =>
        computeOne(definition, byId, assessments, ctx, activeLines, baseline, previous)
    )
}

function computeOne(
    definition: DimensionDefinition,
    byId: Map<string, RiskAssessment>,
    all: RiskAssessment[],
    ctx: LifeContext,
    activeLines: string[],
    baseline: number,
    previous?: DnaHistoryPoint | null
): DimensionResult {
    const members = definition.primary
        .map((id) => byId.get(id))
        .filter((a): a is RiskAssessment => a !== undefined)
    const applicable = members.filter((a) => a.applicability === "applicable")
    const open = applicable.filter((a) => OPEN.has(a.status))
    const coarse = isCoarse(definition)

    const score = definition.isCapacity
        ? resilienceScore(ctx).score
        : scoreDimension(open.length, applicable.length)

    const previousScore = previous?.scores?.[definition.id] ?? null
    // `Number.isFinite`, not `typeof === "number"` — NaN passes the latter and
    // reaches the customer as "Property fell by NaN". Third time this exact
    // guard has been the wrong one; it is the finite check that matters.
    const trendDelta =
        Number.isFinite(score) && Number.isFinite(previousScore)
            ? (score as number) - (previousScore as number)
            : null
    const trend: Trend =
        trendDelta === null ? "unknown" : trendDelta > 0 ? "improving" : trendDelta < 0 ? "worsening" : "steady"

    const worst = [...open].sort(
        (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
    )[0]

    const confidence = definition.isCapacity
        ? ctx.known.savings && ctx.known.income
            ? "high"
            : "low"
        : applicable.length === 0
          ? "high"
          : composeConfidence(applicable)

    return {
        id: definition.id,
        label: definition.label,
        question: definition.question,
        score,
        coarse,
        confidence,
        confidenceLimit: confidenceLimit(definition, applicable, ctx, confidence, coarse),
        trend,
        trendDelta,
        urgency: urgencyOf(definition, open, score),
        whatChanged: whatChanged(trendDelta, definition),
        whyItMatters: whyItMatters(definition, applicable, open, ctx),
        nextAction: worst ? worst.mitigations[0]?.label ?? null : null,
        ifActioned: worst ? projectImprovement(worst, all, activeLines, baseline) : null,
        risks: [...open, ...applicable.filter((a) => !OPEN.has(a.status))].map((a) => ({
            riskId: a.riskId,
            name: a.name,
            status: a.status,
            priority: a.priority,
            whyItMatters: a.expectedImpact,
            whyItApplies: a.whyItApplies,
            actions: a.mitigations.map((m) => ({ kind: m.kind, label: m.label })),
            coveredBy: a.coveredBy,
        })),
        openCount: open.length,
        applicableCount: applicable.length,
    }
}

/**
 * The honest headline movement.
 *
 * Re-runs the REAL scorer with this one risk marked covered, so the number
 * quoted is the number the customer would actually see. An estimate here would
 * be a promise the product then fails to keep.
 */
function projectImprovement(
    risk: RiskAssessment,
    all: RiskAssessment[],
    activeLines: string[],
    baseline: number
): DimensionResult["ifActioned"] {
    const projected = all.map((a) =>
        a.riskId === risk.riskId
            ? { ...a, status: "already_covered" as const, coveredBy: [a.lineOfBusiness] }
            : a
    )
    const lines = activeLines.includes(risk.lineOfBusiness)
        ? activeLines
        : [...activeLines, risk.lineOfBusiness]
    const after = calculateScoreFromAssessments(projected, lines).overallScore
    const points = after - baseline

    // A projection of zero or less is not an incentive, and dressing it up as
    // one would be the sales instinct this product is built against.
    if (points <= 0) return null

    return { points }
}

function whatChanged(delta: number | null, definition: DimensionDefinition): Bilingual | null {
    // No history is not "steady" — a trend line through one point is decoration.
    if (delta === null) return null
    if (delta === 0) {
        return {
            en: `${definition.label.en} has not moved since we last looked.`,
            el: `${definition.label.el}: καμία μεταβολή από τον προηγούμενο έλεγχο.`,
        }
    }
    return delta > 0
        ? {
              en: `${definition.label.en} improved by ${delta} since we last looked.`,
              el: `${definition.label.el}: βελτίωση κατά ${delta} από τον προηγούμενο έλεγχο.`,
          }
        : {
              en: `${definition.label.en} fell by ${Math.abs(delta)} since we last looked.`,
              el: `${definition.label.el}: πτώση κατά ${Math.abs(delta)} από τον προηγούμενο έλεγχο.`,
          }
}

function whyItMatters(
    definition: DimensionDefinition,
    applicable: RiskAssessment[],
    open: RiskAssessment[],
    ctx: LifeContext
): Bilingual {
    if (definition.isCapacity) return resilienceScore(ctx).basis

    if (applicable.length === 0) {
        return {
            en: "Nothing here applies to your situation, so there is nothing to protect against.",
            el: "Τίποτα εδώ δεν αφορά την κατάστασή σας, οπότε δεν υπάρχει κάτι προς προστασία.",
        }
    }
    if (open.length === 0) {
        return {
            en: `Everything that applies to you here is answered by cover you hold.`,
            el: `Ό,τι σας αφορά εδώ καλύπτεται από ασφάλιση που ήδη έχετε.`,
        }
    }
    // The impact of the actual worst open risk, not a description of the
    // dimension — the dimension is a label; the risk is what happens to them.
    return open[0].expectedImpact
}

function urgencyOf(
    definition: DimensionDefinition,
    open: RiskAssessment[],
    score: number | null
): DimensionUrgency {
    if (definition.isCapacity || open.length === 0) return "none"
    if (open.some((a) => a.priority === "critical")) return "now"
    if (open.some((a) => a.priority === "high")) return "soon"
    if (score !== null && score < 50) return "soon"
    return "watch"
}

function confidenceLimit(
    definition: DimensionDefinition,
    applicable: RiskAssessment[],
    ctx: LifeContext,
    confidence: RiskConfidence,
    coarse: boolean
): Bilingual | null {
    if (definition.isCapacity && confidence !== "high") {
        return {
            en: "We do not yet know both your income and your savings, and resilience needs both.",
            el: "Δεν γνωρίζουμε ακόμη και το εισόδημα και τις αποταμιεύσεις σας, και η αντοχή χρειάζεται και τα δύο.",
        }
    }
    if (coarse && applicable.length > 0) {
        return {
            en: "One risk sits behind this dimension, so the scale is coarse — it reads as covered or not, with nothing in between.",
            el: "Πίσω από αυτή τη διάσταση υπάρχει ένας κίνδυνος, οπότε η κλίμακα είναι χονδρική — διαβάζεται ως καλυμμένο ή όχι, χωρίς ενδιάμεσο.",
        }
    }
    if (confidence === "high") return null

    const unanswered = new Set(applicable.flatMap((a) => a.missingFactors))
    if (unanswered.size > 0) {
        // The whole clause inflects at one, not just the noun — the verbs and
        // the adjective agree too (count-copy-agreement.test.ts).
        return unanswered.size === 1
            ? {
                  en: "1 question about your life is still unanswered here.",
                  el: "1 ερώτηση για τη ζωή σας παραμένει αναπάντητη εδώ.",
              }
            : {
                  en: `${unanswered.size} questions about your life are still unanswered here.`,
                  el: `${unanswered.size} ερωτήσεις για τη ζωή σας παραμένουν αναπάντητες εδώ.`,
              }
    }
    return {
        en: "Some of the cover involved could not be read in full.",
        el: "Μέρος της σχετικής κάλυψης δεν μπόρεσε να διαβαστεί πλήρως.",
    }
}
