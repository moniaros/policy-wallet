/**
 * One answer per risk, across every surface on the page.
 *
 * The assessment engine decides `already_covered` from a single question: does a
 * live policy on a matching line exist? The graph asks four more — peril, limit,
 * territory, period — and can now say the cover is partial or unreadable. Left
 * alone, the two rendered side by side: the risk list said «Ήδη καλυμμένο» while
 * the graph directly below it said «Μερικώς προστατευμένο», about the same risk,
 * at the same moment.
 *
 * The status vocabulary already had the right word for this. `needs_review` is
 * documented as "the customer holds cover whose adequacy we cannot verify" — the
 * engine simply had no way to compute it until the graph existed. So this does
 * not add a concept; it fills one in.
 *
 * Deliberately a separate pass rather than a change inside `assessRisk`: the
 * assessment stays derivable from context and policy lines alone, which is what
 * keeps every existing caller — the gap engine, the score, the persisted
 * recommendations — working exactly as before.
 */

import type { RiskAssessment } from "@/lib/services/gap-engine/risk-types"
import type { GraphRisk } from "./types"

/**
 * Downgrade `already_covered` where the graph found the cover incomplete.
 *
 * Only ever moves in that direction. The graph may not promote a gap to covered
 * — it does not decide applicability or hold the market rules that classify a
 * loss, and a protection surface that talks itself UP is the failure mode the
 * whole rebuild was for.
 */
export function reconcileWithGraph(
    assessments: RiskAssessment[],
    risks: GraphRisk[]
): RiskAssessment[] {
    const stateById = new Map(risks.map((r) => [r.riskId, r.state]))

    return assessments.map((assessment) => {
        if (assessment.status !== "already_covered") return assessment
        const state = stateById.get(assessment.riskId)
        if (state !== "partially_protected" && state !== "unknown") return assessment
        return { ...assessment, status: "needs_review" as const }
    })
}
