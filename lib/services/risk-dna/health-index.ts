/**
 * Customer Health Index, Household Overview, Trends, and the monitoring hooks.
 *
 * These four are different readings of the same computed dimensions, which is
 * why they live together: separate modules would each need their own copy of the
 * dimension pass, and three copies of a computation are three answers waiting to
 * disagree in front of a customer.
 *
 * **The Health Index is not a second protection score.** It measures the
 * relationship, not the cover: how much of this person's life we have actually
 * established, how current that picture is, and whether it is moving. A customer
 * with modest cover we understand completely is *healthier* than one with broad
 * cover we know nothing about — and the second is exactly the customer a
 * traditional CRM would rank highest, because it counts policies.
 */

import type { Bilingual } from "@/lib/services/gap-engine/risk-types"
import type { LifeContext } from "@/lib/services/gap-engine/life-context"
import { contextCompleteness } from "@/lib/services/gap-engine/life-context"
import { calendarDaysUntil } from "@/lib/policy-status"
import type { PersonalRiskGraph } from "@/lib/services/risk-graph/types"
import type { DimensionResult, Trend } from "./compute"
import type { RiskDimension } from "./dimensions"

// ── Customer Health Index ────────────────────────────────────────────

export type HealthBand = "strong" | "fair" | "thin" | "unknown"

export interface CustomerHealthIndex {
    /** 0-100, or null when we know too little for the number to mean anything. */
    index: number | null
    band: HealthBand
    /** Each component, so the number can be argued with rather than trusted. */
    components: Array<{ id: string; label: Bilingual; value: number; weight: number }>
    whatChanged: Bilingual | null
    whyItMatters: Bilingual
    nextAction: Bilingual | null
    confidence: "high" | "medium" | "low"
}

export interface HealthInputs {
    ctx: LifeContext
    dimensions: DimensionResult[]
    /** When the assessment was last recomputed. */
    lastAssessedAt: Date | null
    /** Number of recorded versions — a picture that has never moved is stale. */
    versionCount: number
    now?: Date
}

export function customerHealthIndex(inputs: HealthInputs): CustomerHealthIndex {
    const { ctx, dimensions, lastAssessedAt, versionCount } = inputs
    const now = inputs.now ?? new Date()

    // 1. How much of their life we have established (50%). The dominant term on
    //    purpose: everything else this platform says rests on it.
    const completeness = contextCompleteness(ctx)

    // 2. How current the picture is (25%).
    const freshnessDays =
        lastAssessedAt && !Number.isNaN(lastAssessedAt.getTime())
            ? Math.max(0, -calendarDaysUntil(lastAssessedAt, now))
            : null
    const freshness = freshnessDays === null ? 0 : Math.max(0, 1 - Math.min(1, freshnessDays / 180)) * 100

    // 3. How much of what applies is decided rather than pending (25%).
    const scored = dimensions.filter((d) => d.score !== null)
    const decided = scored.length === 0
        ? 0
        : (scored.filter((d) => d.confidence !== "low").length / scored.length) * 100

    const components = [
        {
            id: "completeness",
            label: { en: "What we know about your life", el: "Όσα γνωρίζουμε για τη ζωή σας" },
            value: Math.round(completeness),
            weight: 50,
        },
        {
            id: "freshness",
            label: { en: "How current the picture is", el: "Πόσο πρόσφατη είναι η εικόνα" },
            value: Math.round(freshness),
            weight: 25,
        },
        {
            id: "decided",
            label: { en: "How much we could decide", el: "Πόσα μπορέσαμε να κρίνουμε" },
            value: Math.round(decided),
            weight: 25,
        },
    ]

    // Below a third established, the index would be measuring our ignorance
    // rather than their position — the same honesty the protection score
    // applies with `indeterminate`.
    if (completeness < 34) {
        return {
            index: null,
            band: "unknown",
            components,
            whatChanged: null,
            whyItMatters: {
                en: "We know too little about your life for this to mean anything yet. Everything else on this page rests on it.",
                el: "Γνωρίζουμε πολύ λίγα για τη ζωή σας ώστε να έχει νόημα ακόμη. Όλα τα υπόλοιπα σε αυτή τη σελίδα στηρίζονται σε αυτό.",
            },
            nextAction: {
                en: "Answer a few more questions about your situation.",
                el: "Απαντήστε σε μερικές ακόμη ερωτήσεις για την κατάστασή σας.",
            },
            confidence: "low",
        }
    }

    const index = Math.round(
        components.reduce((total, c) => total + (c.value * c.weight) / 100, 0)
    )
    const band: HealthBand = index >= 75 ? "strong" : index >= 50 ? "fair" : "thin"

    const weakest = [...components].sort((a, b) => a.value - b.value)[0]

    return {
        index,
        band,
        components,
        whatChanged:
            versionCount <= 1
                ? null
                : {
                      en: `We have re-checked your position ${versionCount} times, so this is a picture that moves rather than a one-off.`,
                      el: `Έχουμε επανελέγξει τη θέση σας ${versionCount} φορές, οπότε πρόκειται για εικόνα που κινείται και όχι για μια εφάπαξ αποτύπωση.`,
                  },
        whyItMatters: {
            en: "This measures how well we understand you, not how much cover you hold. Modest cover we understand completely is worth more to you than broad cover we cannot read.",
            el: "Αυτό μετρά πόσο καλά σας κατανοούμε, όχι πόση κάλυψη έχετε. Μια μέτρια κάλυψη που κατανοούμε πλήρως αξίζει περισσότερο για εσάς από μια ευρεία κάλυψη που δεν μπορούμε να διαβάσουμε.",
        },
        nextAction:
            weakest.value >= 80
                ? null
                : weakest.id === "completeness"
                  ? { en: "Answer the remaining questions about your life.", el: "Απαντήστε στις υπόλοιπες ερωτήσεις για τη ζωή σας." }
                  : weakest.id === "freshness"
                    ? { en: "Tell us about anything that has changed recently.", el: "Πείτε μας για οτιδήποτε άλλαξε πρόσφατα." }
                    : { en: "Add the policy documents we could not read.", el: "Προσθέστε τα ασφαλιστήρια που δεν μπορέσαμε να διαβάσουμε." },
        confidence: completeness >= 80 ? "high" : completeness >= 60 ? "medium" : "low",
    }
}

// ── Household Risk Overview ──────────────────────────────────────────

export interface HouseholdOverview {
    /** People the household's protection has to reach. */
    memberCount: number
    dependantCount: number
    /** Things the household owns or owes, from the graph. */
    assetCount: number
    obligationCount: number
    /** Dimensions where an OPEN risk reaches beyond the policyholder. */
    sharedExposures: Array<{ dimension: RiskDimension; label: Bilingual; openCount: number }>
    whyItMatters: Bilingual
    nextAction: Bilingual | null
}

/**
 * The household, rather than the policyholder.
 *
 * Insurance is bought by one person and consumed by several, and every surface
 * in this product until now addressed the buyer. The dimensions that reach past
 * them — Family, Income, Health — are the ones where a gap is somebody else's
 * problem too.
 */
const HOUSEHOLD_DIMENSIONS: RiskDimension[] = ["family", "income", "health", "property"]

export function householdOverview(
    graph: PersonalRiskGraph,
    dimensions: DimensionResult[]
): HouseholdOverview {
    const dependantCount = graph.byType.dependent.length
    const assetCount = graph.nodes.filter((n) => n.root === "asset").length
    const obligationCount = graph.nodes.filter((n) => n.root === "obligation").length

    const shared = dimensions
        .filter((d) => HOUSEHOLD_DIMENSIONS.includes(d.id) && d.openCount > 0)
        .map((d) => ({ dimension: d.id, label: d.label, openCount: d.openCount }))

    return {
        memberCount: 1 + dependantCount,
        dependantCount,
        assetCount,
        obligationCount,
        sharedExposures: shared,
        // The fact (who depends on this cover) comes from the customer's own
        // profile and stays. The moral (whose problem a gap is) does not ship:
        // §2.13 prohibits emotional leverage on an unvalidated finding, in
        // either direction — see tests/unit/finding-copy-register.test.ts.
        whyItMatters:
            dependantCount === 0
                ? {
                      en: "Nobody else depends on your cover.",
                      el: "Κανείς άλλος δεν εξαρτάται από την κάλυψή σας.",
                  }
                : {
                      en: `${dependantCount} ${dependantCount === 1 ? "person depends" : "people depend"} on this protection.`,
                      el: `${dependantCount} ${dependantCount === 1 ? "άτομο εξαρτάται" : "άτομα εξαρτώνται"} από αυτή την προστασία.`,
                  },
        // At one, the WHOLE clause inflects — verbs and adjectives, not just
        // the noun. A ternary that swaps only the noun leaves «αφορούν …
        // παραμένουν ανοιχτές» plural against a singular subject (and "reach …
        // are" in English) — tests/unit/count-copy-agreement.test.ts.
        nextAction:
            shared.length === 0
                ? null
                : shared.length === 1
                  ? {
                        en: "1 area that reaches the whole household is still open.",
                        el: "1 περιοχή που αφορά όλο το νοικοκυριό παραμένει ανοιχτή.",
                    }
                  : {
                        en: `${shared.length} areas that reach the whole household are still open.`,
                        el: `${shared.length} περιοχές που αφορούν όλο το νοικοκυριό παραμένουν ανοιχτές.`,
                    },
    }
}

// ── Risk Trends ──────────────────────────────────────────────────────

export interface DimensionTrendPoint {
    at: Date
    score: number | null
}

export interface RiskTrend {
    dimension: RiskDimension
    label: Bilingual
    points: DimensionTrendPoint[]
    direction: Trend
    /** Movement across the whole window, not just the last step. */
    netDelta: number | null
    whatChanged: Bilingual | null
}

/**
 * Direction over the window, not the last hop.
 *
 * A dimension that fell nine points and recovered eight is not "improving", and
 * reporting the final step alone would say it was. Net movement across the whole
 * series is the honest read, and a series with fewer than two scored points has
 * no direction at all.
 */
export function riskTrends(
    series: Array<{ at: Date; scores: Partial<Record<RiskDimension, number | null>> }>,
    dimensions: DimensionResult[]
): RiskTrend[] {
    return dimensions.map((dimension) => {
        const points = series.map((s) => ({ at: s.at, score: s.scores[dimension.id] ?? null }))
        // Finite, not merely numeric — see the note in compute.ts.
        const scored = points.filter((p) => Number.isFinite(p.score)) as Array<{ at: Date; score: number }>

        if (scored.length < 2) {
            return {
                dimension: dimension.id,
                label: dimension.label,
                points,
                direction: "unknown" as Trend,
                netDelta: null,
                whatChanged: null,
            }
        }

        const netDelta = scored[scored.length - 1].score - scored[0].score
        const direction: Trend = netDelta > 0 ? "improving" : netDelta < 0 ? "worsening" : "steady"

        return {
            dimension: dimension.id,
            label: dimension.label,
            points,
            direction,
            netDelta,
            whatChanged:
                netDelta === 0
                    ? {
                          en: `${dimension.label.en} is where it was ${scored.length} checks ago.`,
                          el: `${dimension.label.el}: στο ίδιο σημείο όπως πριν ${scored.length} ελέγχους.`,
                      }
                    : netDelta > 0
                      ? {
                            en: `${dimension.label.en} is ${netDelta} better than when we started tracking it.`,
                            el: `${dimension.label.el}: ${netDelta} καλύτερα από όταν ξεκινήσαμε να το παρακολουθούμε.`,
                        }
                      : {
                            en: `${dimension.label.en} is ${Math.abs(netDelta)} worse than when we started tracking it.`,
                            el: `${dimension.label.el}: ${Math.abs(netDelta)} χειρότερα από όταν ξεκινήσαμε να το παρακολουθούμε.`,
                        },
        }
    })
}
