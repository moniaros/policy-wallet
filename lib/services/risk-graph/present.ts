/**
 * Turning the graph into something a person can read.
 *
 * Kept apart from `service.ts` so it is pure and testable without a database:
 * everything here is a join between three things already computed — the bound
 * risks, the nodes they anchor to, and the assessment that named them.
 *
 * The presenter deliberately owns the *labels* and nothing else. It must never
 * decide a state, drop a risk, or invent evidence; if a view is wrong the fault
 * is upstream, and hunting for it in render code is how UI layers quietly become
 * a second rules engine.
 */

import type { RiskAssessment } from "@/lib/services/gap-engine/risk-types"
import type { Bilingual } from "@/lib/services/gap-engine/risk-types"
import type { GraphRisk, PersonalRiskGraph, RiskState } from "./types"

export interface GraphRiskView {
    riskId: string
    lineOfBusiness: string
    state: RiskState
    /** Wallet policies of any status in this line — see GraphRisk.heldInLine. */
    heldInLine: number
    anchors: Bilingual[]
    name: Bilingual
    evidence: Array<{ kind: string; statement: Bilingual }>
    dimensions: Array<{ dimension: string; verdict: string; detail: Bilingual }>
}

/** Worst first — an unprotected risk is the reason to open the page. */
const STATE_RANK: Record<RiskState, number> = {
    unprotected: 0,
    partially_protected: 1,
    unknown: 2,
    protected: 3,
}

export function presentRiskGraph(
    risks: GraphRisk[],
    graph: PersonalRiskGraph,
    assessments: RiskAssessment[]
): GraphRiskView[] {
    const namesById = new Map(assessments.map((a) => [a.riskId, a.name]))
    const nodesById = new Map(graph.nodes.map((n) => [n.id, n]))

    return risks
        .map((risk) => ({
            riskId: risk.riskId,
            lineOfBusiness: risk.lineOfBusiness,
            state: risk.state,
            // A fact carried through, not a decision made here: the panel needs
            // it to render an unowned line as *not held* rather than as a
            // finding (§2.2), and deriving ownership in render code is exactly
            // the second-rules-engine failure this header forbids.
            heldInLine: risk.heldInLine,
            // A risk whose assessment vanished still renders — with its id
            // rather than a blank row. Silently dropping it would hide an
            // unprotected exposure, which is the one failure mode this whole
            // surface exists to prevent.
            name: namesById.get(risk.riskId) ?? { en: risk.riskId, el: risk.riskId },
            anchors: risk.anchorNodeIds
                .map((id) => nodesById.get(id)?.label)
                .filter((label): label is Bilingual => label != null),
            evidence: risk.evidence.map((e) => ({ kind: e.kind, statement: e.statement })),
            dimensions: risk.dimensions.map((d) => ({
                dimension: d.dimension,
                verdict: d.verdict,
                detail: d.detail,
            })),
        }))
        .sort((a, b) => {
            const byState = STATE_RANK[a.state] - STATE_RANK[b.state]
            return byState !== 0 ? byState : a.riskId.localeCompare(b.riskId)
        })
}
