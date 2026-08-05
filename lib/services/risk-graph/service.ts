/**
 * Assembling the Personal Risk Graph for one customer.
 *
 * Reads what already exists — profile and policies — and derives everything.
 * There is no risk-graph table, nothing to migrate and nothing to keep in sync,
 * which is what makes this additive rather than a rewrite: every existing
 * surface still reads `LifeContext` and is untouched.
 */

import { db } from "@/lib/db"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"
import { coverageEngineStatus } from "@/lib/policy-status"
import { projectRiskGraph, graphSummary } from "./projection"
import { bindRisksToGraph, protectionSummary, type ProtectingPolicy } from "./protection"
import { presentRiskGraph, type GraphRiskView } from "./present"
import { reconcileWithGraph } from "./reconcile"
import type { RiskAssessment } from "@/lib/services/gap-engine/risk-types"
import type { GraphRisk, PersonalRiskGraph } from "./types"

export interface RiskGraphResult {
    graph: PersonalRiskGraph
    risks: GraphRisk[]
    /** Render-ready rows: risks joined to their node labels and names. */
    views: GraphRiskView[]
    /**
     * The assessments the graph was bound to, reconciled against it — so a
     * caller that needs both does not assess twice and risk the two drifting.
     */
    assessments: RiskAssessment[]
    summary: ReturnType<typeof graphSummary>
    protection: ReturnType<typeof protectionSummary>
}

/**
 * Pull the perils and sum insured out of extraction data.
 *
 * Both live in `acordData`, a JSON column with no schema, so this reaches
 * through several spellings and gives up cleanly. **Giving up returns null, not
 * zero** — an unreadable sum insured must reach the limit dimension as
 * "unevaluable", because a zero would read as a declaration that the policy pays
 * nothing.
 */
function readCoverageFacts(acordData: unknown): {
    perils: string[] | null
    territories: string[] | null
    sumInsured: number | null
} {
    const acord = (acordData ?? null) as Record<string, any> | null
    if (!acord) return { perils: null, territories: null, sumInsured: null }

    const rawPerils =
        acord.coverage?.perils ?? acord.coverage?.coveredPerils ?? acord.home?.perils ?? null
    const perils = Array.isArray(rawPerils)
        ? rawPerils.filter((p): p is string => typeof p === "string")
        : null

    // Read leniently even though no extractor writes these yet. A field the
    // service cannot populate is a code path production can never enter — the
    // territory dimension would be reachable only from a test, which is a worse
    // state than not having it.
    const rawTerritories =
        acord.coverage?.territories ??
        acord.coverage?.territorialLimits ??
        acord.policy?.territories ??
        null
    const territories = Array.isArray(rawTerritories)
        ? rawTerritories.filter((t): t is string => typeof t === "string")
        : null

    const rawSum =
        acord.coverage?.sumInsured ??
        acord.property?.insuredValue ??
        acord.home?.insuredValue ??
        null
    const sumInsured = typeof rawSum === "number" && Number.isFinite(rawSum) ? rawSum : null

    return {
        perils: perils && perils.length > 0 ? perils : null,
        territories: territories && territories.length > 0 ? territories : null,
        sumInsured,
    }
}

/** The policy fields the graph needs. Anything with these can be passed in. */
export interface RiskGraphPolicyInput {
    id: string
    lineOfBusiness: string | null
    status: string | null
    insurerName?: string | null
    endDate?: Date | null
    acordData?: unknown
}

/**
 * Build the graph from data already in hand.
 *
 * Exported so a caller that has already loaded the profile and the wallet — the
 * coverage-insights page does, for the wizard and the policy list — does not pay
 * for the same two queries twice on every render.
 */
export function assembleRiskGraph(
    profile: unknown,
    policies: RiskGraphPolicyInput[]
): RiskGraphResult {
    const ctx = toLifeContext(profile as any)
    const graph = projectRiskGraph(ctx)

    const protecting: ProtectingPolicy[] = policies.map((p) => {
        const facts = readCoverageFacts(p.acordData)
        return {
            id: p.id,
            lineOfBusiness: p.lineOfBusiness ?? "",
            // Liveness is DERIVED from the real end date. The stored column is
            // written once at creation and never recomputed, which is how a
            // lapsed policy kept reporting itself as cover.
            status: coverageEngineStatus(p as any),
            insurerName: p.insurerName,
            endDate: p.endDate ?? null,
            ...facts,
        }
    })

    const assessments = assessRisks(
        ctx,
        protecting.map((p) => ({ lineOfBusiness: p.lineOfBusiness, status: p.status }))
    )
    const risks = bindRisksToGraph(assessments, graph, protecting, ctx)

    return {
        graph,
        risks,
        views: presentRiskGraph(risks, graph, assessments),
        assessments: reconcileWithGraph(assessments, risks),
        summary: graphSummary(graph),
        protection: protectionSummary(risks),
    }
}

/** Fetching wrapper, for callers that hold nothing yet. */
export async function getRiskGraph(userId: string): Promise<RiskGraphResult> {
    const [profile, policies] = await Promise.all([
        db.policyholderProfile.findUnique({ where: { userId } }),
        db.policy.findMany({
            where: { ownerUserId: userId },
            select: {
                id: true,
                lineOfBusiness: true,
                status: true,
                insurerName: true,
                endDate: true,
                acordData: true,
            },
        }),
    ])
    return assembleRiskGraph(profile, policies)
}
