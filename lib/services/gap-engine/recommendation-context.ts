/**
 * The four things a recommendation has to say that the assessment alone cannot.
 *
 * The catalog answers *whether* a risk applies, how much it matters and what can
 * be done about it. Four questions remain, and each needs information the
 * catalog does not hold:
 *
 *  - **Evidence** — what this rests on. Comes from the risk graph, which knows
 *    which things in the customer's life produce the risk and which policies
 *    answer it.
 *  - **Urgency** — how *soon*, which is not how *much*. See §deriveUrgency.
 *  - **Advisor opportunity** — what a licensed intermediary adds here.
 *  - **Customer benefit** — what changes for them if they act.
 *
 * Derived rather than authored per risk. Twenty-one hand-written "benefits"
 * would drift from the risks they describe within a release, and would be
 * written in marketing voice because that is what a blank "benefit" field asks
 * for. Deriving them from structure — the mitigation ladder, the quantified
 * impact, the unresolved factors — keeps them tied to the finding.
 */

import type { Bilingual, RiskAssessment } from "./risk-types"
import type { GraphRisk } from "@/lib/services/risk-graph/types"
import { calendarDaysUntil } from "@/lib/policy-status"
import { RISK_CATALOG } from "./risk-catalog"
import { getLifeEvent } from "@/lib/services/life-events/registry"

/**
 * Which risks a life event newly exposes.
 *
 * Derived from the vocabulary the two models already share: an event writes
 * `ContextDelta`s keyed by `ContextFactorKey`, and a risk declares the factors
 * it `requires`. An event exposes a risk when it moved a factor that risk
 * depends on. Nothing is authored twice, and a new event wired into the
 * registry gains correct urgency behaviour without touching this file.
 */
export function risksExposedBy(definitionId: string): string[] {
    const definition = getLifeEvent(definitionId)
    if (!definition) return []
    const moved = new Set(definition.contextDelta.map((d) => d.factor))
    return RISK_CATALOG.filter((risk) => risk.requires.some((f) => moved.has(f))).map((r) => r.id)
}

/** Evidence as a recommendation carries it — the graph's, minus internal ids. */
export interface RecommendationEvidence {
    kind: string
    statement: Bilingual
}

/**
 * Attach the four context fields to persisted recommendation rows.
 *
 * Computed from the LIVE assessment and graph rather than from the stored row,
 * which is what makes the mission's "recommendations update automatically after
 * profile changes" true of these fields by construction: the row may be a few
 * seconds stale, the context never is.
 *
 * A row with no matching live assessment keeps null context and renders without
 * it — the alternative, dropping the row, would hide a finding.
 */
export function withRecommendationContext<
    T extends { riskId: string | null }
>(
    recommendations: T[],
    assessments: RiskAssessment[],
    inputs: Omit<UrgencyInputs, "graphRisk"> & { graphRisks?: GraphRisk[] },
    now: Date = new Date()
): Array<
    T & {
        timing: UrgencyVerdict | null
        evidence: RecommendationEvidence[] | null
        advisorOpportunity: Bilingual | null
        customerBenefit: Bilingual | null
    }
> {
    const byRiskId = new Map(assessments.map((a) => [a.riskId, a]))
    const graphByRiskId = new Map((inputs.graphRisks ?? []).map((g) => [g.riskId, g]))

    return recommendations.map((rec) => {
        const assessment = rec.riskId ? byRiskId.get(rec.riskId) : undefined
        if (!assessment) {
            return {
                ...rec,
                timing: null,
                evidence: null,
                advisorOpportunity: null,
                customerBenefit: null,
            }
        }
        const graphRisk = graphByRiskId.get(assessment.riskId) ?? null
        return {
            ...rec,
            timing: deriveUrgency(assessment, { ...inputs, graphRisk }, now),
            evidence:
                graphRisk?.evidence.map((e) => ({ kind: e.kind, statement: e.statement })) ?? null,
            advisorOpportunity: deriveAdvisorOpportunity(assessment, graphRisk),
            customerBenefit: deriveCustomerBenefit(assessment),
        }
    })
}

// ── Urgency ──────────────────────────────────────────────────────────

/**
 * How soon this needs attention — a different axis from priority.
 *
 * Priority asks how much the loss would hurt. Urgency asks whether there is a
 * *deadline*. They came apart the moment the engine tried to say both with one
 * number: a 30-year-old parent with no life cover is high priority and has no
 * deadline at all, while a lapsed motor policy is a legal exposure today.
 * Reporting either as "high" told the customer nothing about what to do first.
 *
 * `no_deadline` is the honest default and the common case. A list where
 * everything is urgent is a list with no urgency in it.
 */
export const URGENCY_LEVELS = ["now", "weeks", "months", "no_deadline"] as const
export type Urgency = (typeof URGENCY_LEVELS)[number]

export interface UrgencyVerdict {
    level: Urgency
    /** Why there is a deadline — never shown without one. */
    reason: Bilingual | null
}

const NO_DEADLINE: UrgencyVerdict = { level: "no_deadline", reason: null }

/** Risks where being uncovered is itself unlawful, not merely unwise. */
const COMPULSORY_RISKS = new Set(["motor_liability", "boat_liability"])

/**
 * Ages at which the Greek market's terms change materially for a line.
 *
 * Not a sales deadline — a real one. Life and health underwriting hardens with
 * age and with any condition acquired in the meantime, and both lines commonly
 * close to new entrants entirely in the customer's sixties. Someone at 57 with
 * an open life gap has a narrowing window; someone at 32 does not.
 */
const UNDERWRITING_WINDOW: Record<string, { from: number; to: number }> = {
    life: { from: 55, to: 65 },
    health: { from: 55, to: 65 },
    income_protection: { from: 50, to: 60 },
    personal_accident: { from: 60, to: 70 },
}

export interface UrgencyInputs {
    /** Age, when known. Underwriting windows are unusable without it. */
    age: number | null
    /** The bound graph risk, for the period verdict on any cover held. */
    graphRisk?: GraphRisk | null
    /** Declared life events that created this exposure, most recent first. */
    recentEvents?: Array<{ definitionId: string; occurredAt: Date }>
    /** Which risks a given event newly exposes. */
    eventExposes?: (definitionId: string) => string[]
}

/**
 * Decide urgency from deadlines that actually exist.
 *
 * Ordered by how hard the deadline is: unlawful today, then cover that has
 * stopped, then a life change that opened the exposure recently, then a
 * narrowing underwriting window. Anything else has no deadline and says so.
 */
export function deriveUrgency(
    assessment: RiskAssessment,
    inputs: UrgencyInputs,
    now: Date = new Date()
): UrgencyVerdict {
    if (assessment.applicability !== "applicable") return NO_DEADLINE

    // 1. Compulsory cover, absent. Not a judgement about prudence — driving or
    //    sailing uninsured is an offence, and the exposure starts immediately.
    if (COMPULSORY_RISKS.has(assessment.riskId) && assessment.status === "protection_gap") {
        return {
            level: "now",
            reason: {
                en: "This cover is compulsory in Greece, so being without it is a legal exposure from today, separate from the loss itself.",
                el: "Η κάλυψη αυτή είναι υποχρεωτική στην Ελλάδα, οπότε η απουσία της συνιστά νομική έκθεση από σήμερα, ανεξάρτητα από την ίδια τη ζημιά.",
            },
        }
    }

    // 2. Cover that has stopped. The graph's period dimension is the only place
    //    that knows a matched policy is no longer in force.
    const periodFailed = inputs.graphRisk?.dimensions.some(
        (d) => d.dimension === "period" && d.verdict === "failed"
    )
    if (periodFailed) {
        return {
            level: "now",
            reason: {
                en: "The policy that answered this has expired, so the exposure is open right now.",
                el: "Το ασφαλιστήριο που κάλυπτε αυτόν τον κίνδυνο έχει λήξει, οπότε η έκθεση είναι ανοιχτή αυτή τη στιγμή.",
            },
        }
    }

    // 3. A life change opened this exposure recently. A mortgage taken two
    //    months ago with nothing behind it is a different proposition from the
    //    same gap carried unchanged for a decade.
    const opened = (inputs.recentEvents ?? []).find((event) => {
        const exposes = inputs.eventExposes?.(event.definitionId) ?? []
        if (!exposes.includes(assessment.riskId)) return false
        // An unreadable date is not a recent event. `calendarDaysUntil` throws
        // rather than answering on an invalid Date, and this runs inside the
        // engine snapshot with no per-row catch around it — one bad row would
        // have taken the recommendations AND the score off the page.
        if (!(event.occurredAt instanceof Date) || Number.isNaN(event.occurredAt.getTime())) {
            return false
        }
        const daysAgo = -calendarDaysUntil(event.occurredAt, now)
        return daysAgo >= 0 && daysAgo <= 90
    })
    if (opened) {
        return {
            level: "weeks",
            reason: {
                en: "A change you recorded in the last three months opened this exposure, and nothing covers it yet.",
                el: "Μια μεταβολή που καταγράψατε τους τελευταίους τρεις μήνες άνοιξε αυτή την έκθεση και δεν την καλύπτει ακόμη τίποτα.",
            },
        }
    }

    // 4. A narrowing underwriting window. Only where we know the age — a
    //    deadline asserted without one would be an invented deadline.
    const window = UNDERWRITING_WINDOW[assessment.lineOfBusiness]
    if (window && inputs.age !== null && inputs.age >= window.from && inputs.age < window.to) {
        return {
            level: "months",
            // Named by the band's own boundaries, not by a decade.
            // `Math.floor(from / 10) * 10` plus the word "late" told a
            // 52-year-old that terms harden "through your late 50s", and the
            // Greek used the closing age for both clauses so it read "harden as
            // you approach 65 and stop around 65". Hedged, because how insurers
            // price age is a market tendency, not a published rule.
            reason: {
                en: `You are inside the age band where terms on this line tighten, and many Greek insurers stop accepting new applications around ${window.to}. Applying sooner is usually cheaper and more likely to be accepted.`,
                el: `Βρίσκεστε στην ηλικιακή ζώνη όπου οι όροι σε αυτόν τον κλάδο στενεύουν, και πολλές ελληνικές ασφαλιστικές σταματούν να δέχονται νέες αιτήσεις γύρω στα ${window.to}. Μια αίτηση νωρίτερα συνήθως κοστίζει λιγότερο και γίνεται πιο εύκολα δεκτή.`,
            },
        }
    }

    return NO_DEADLINE
}

// ── Advisor opportunity ──────────────────────────────────────────────

/**
 * What a licensed advisor adds here — stated as *their* work, not as a pitch.
 *
 * Derived from what we could NOT settle, which is exactly where a human is
 * worth paying for: facts we never asked, cover we could not read, market
 * eligibility that needs a real underwriter, and objects we cannot match to
 * policies one by one. Where nothing is unresolved, this returns null rather
 * than manufacturing a reason to involve someone.
 *
 * The framing matters legally as well as editorially: under IDD and Law
 * 4583/2018 the regulated act is the advice, not our analysis. This names the
 * boundary instead of blurring it.
 */
export function deriveAdvisorOpportunity(
    assessment: RiskAssessment,
    graphRisk?: GraphRisk | null
): Bilingual | null {
    if (assessment.applicability !== "applicable") return null

    const unreadable = graphRisk?.dimensions.some((d) => d.verdict === "unevaluable")
    const manyThings = (graphRisk?.anchorNodeIds.length ?? 0) > 1
    const missing = assessment.missingFactors.length > 0

    if (assessment.eligibilityNote) {
        return {
            en: "Whether cover is available to you on normal terms is an underwriting question, not one this analysis can settle. An advisor can test the market before you apply, which avoids a declined application on your record.",
            el: "Το αν η κάλυψη είναι διαθέσιμη με κανονικούς όρους είναι ζήτημα ανάληψης κινδύνου, που η ανάλυση αυτή δεν μπορεί να κρίνει. Ένας σύμβουλος μπορεί να ελέγξει την αγορά πριν υποβάλετε αίτηση, ώστε να μην καταγραφεί απόρριψη στο ιστορικό σας.",
        }
    }
    if (unreadable) {
        return {
            en: "We could not read parts of the cover involved. An advisor can obtain the full wording from the insurer and confirm what is actually included before you change anything.",
            el: "Δεν μπορέσαμε να διαβάσουμε τμήματα της σχετικής κάλυψης. Ένας σύμβουλος μπορεί να ζητήσει τους πλήρεις όρους από την ασφαλιστική και να επιβεβαιώσει τι πραγματικά περιλαμβάνεται πριν αλλάξετε οτιδήποτε.",
        }
    }
    if (manyThings) {
        return {
            en: "You have more than one thing exposed here and we cannot tell which policy covers which. An advisor can map them one by one and close whichever is genuinely uncovered.",
            el: "Εδώ εκτίθενται περισσότερα από ένα αντικείμενα και δεν μπορούμε να πούμε ποιο ασφαλιστήριο καλύπτει ποιο. Ένας σύμβουλος μπορεί να τα αντιστοιχίσει ένα προς ένα και να καλύψει όποιο πράγματι μένει ακάλυπτο.",
        }
    }
    if (missing) {
        return {
            en: "Some of what decides this is still unanswered. An advisor can work through it with you and size the cover to your actual position rather than to a default.",
            el: "Μέρος όσων κρίνουν αυτό το θέμα παραμένει αναπάντητο. Ένας σύμβουλος μπορεί να το δουλέψει μαζί σας και να διαστασιολογήσει την κάλυψη στα πραγματικά σας δεδομένα αντί σε προεπιλογές.",
        }
    }
    return null
}

// ── Customer benefit ─────────────────────────────────────────────────

/**
 * What changes for the customer if they act — phrased as the outcome, not the
 * product.
 *
 * Built from the mitigation the ladder actually leads with, so a risk whose best
 * answer is "keep a fund instead of buying cover" says so. A `benefit` field
 * that always described a purchase would quietly turn the ladder back into a
 * catalogue.
 */
export function deriveCustomerBenefit(assessment: RiskAssessment): Bilingual {
    const lead = assessment.mitigations[0]

    switch (lead?.kind) {
        case "avoid":
            return {
                en: "You stop carrying the exposure at all, at no ongoing cost.",
                el: "Παύετε να φέρετε την έκθεση εξ ολοκλήρου, χωρίς πάγιο κόστος.",
            }
        case "reduce":
            return {
                en: "The loss becomes smaller and less likely, and any cover you do buy afterwards costs less.",
                el: "Η ζημιά γίνεται μικρότερη και λιγότερο πιθανή, και όποια κάλυψη αγοράσετε στη συνέχεια κοστίζει λιγότερο.",
            }
        case "retain":
            return {
                en: "You keep the premium and accept a loss you could absorb — a deliberate decision rather than an oversight.",
                el: "Κρατάτε το ασφάλιστρο και αποδέχεστε μια ζημιά που μπορείτε να απορροφήσετε — συνειδητή απόφαση αντί για παράλειψη.",
            }
        case "transfer":
        default:
            return {
                en: "The cost of the loss stops being yours to find, and your savings stay where you meant them to go.",
                el: "Το κόστος της ζημιάς παύει να είναι δικό σας βάρος και οι αποταμιεύσεις σας μένουν εκεί που τις προορίζατε.",
            }
    }
}
