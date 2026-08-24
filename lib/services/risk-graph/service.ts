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
 * Where each coverage fact lives inside `acordData`, by name.
 *
 * `schemaPaths` are dot-paths that exist in `AcordDataSchema`
 * ([lib/schemas/acord-data.ts]) — the shape the extractor is actually
 * instructed to write. `legacyPaths` are spellings the schema does NOT define,
 * kept because older stored rows and hand-built fixtures carry them.
 *
 * The table is exported because it is load-bearing twice: `readCoverageFacts`
 * iterates it, and `tests/unit/risk-graph-coverage-facts-schema.test.ts` checks
 * it against the schema — every `schemaPaths` entry must exist there, every
 * `legacyPaths` entry must NOT, and every schema field that carries one of
 * these facts must be either read here or exempted in that test with a written
 * reason. The defect this replaces (V2-P1-07) was a hand-kept list that read
 * two property spellings and no motor one, so `vehicle.insuredValue` sat
 * unread in the column while every insured motorist rolled up as «Άγνωστο».
 */
export const COVERAGE_FACT_SOURCES = {
    /**
     * No schema path carries a peril LIST. The schema records perils as
     * per-line flags (`property.fireCoverageIncluded`,
     * `home.catastropheCoverage.*`, `vehicle.ownVehicleDamage`) and as the
     * free-text `coverages[]` names; mapping those onto the peril tokens
     * `assessPeril` expects is a semantic decision, not a spelling, and it has
     * not been made. Until it is, the peril dimension is fed by legacy rows
     * only, and the guard test holds every flag field in a reasoned exemption
     * list so the mapping cannot be forgotten silently.
     */
    perils: {
        schemaPaths: [],
        legacyPaths: ["coverage.perils", "coverage.coveredPerils", "home.perils"],
    },
    /**
     * The schema's carrier is `territorialScope.includes`, but it holds free
     * text in the document's own language («Ελλάδα», "Worldwide excl. USA & Canada")
     * while `assessTerritory` compares against fixed lowercase English tokens —
     * wiring it raw would fail every Greek policy that names Greece in Greek.
     * It stays unread until a name normalizer exists; the guard test pins that
     * decision next to the field so it cannot rot into an accidental omission.
     */
    territories: {
        schemaPaths: [],
        legacyPaths: ["coverage.territories", "coverage.territorialLimits", "policy.territories"],
    },
    /**
     * Ordered: each line's canonical field first (the schema's own note on
     * `policy.sumInsured` names `vehicle.insuredValue` and
     * `property.insuredValue` as the motor and property carriers), then the
     * fallback spellings `deriveSumInsured` (lib/wallet/policy-review.ts)
     * already accepts for the wallet's sum-insured display — the two surfaces
     * must read the same figure — then the generic envelope, then legacy.
     */
    sumInsured: {
        schemaPaths: [
            "vehicle.insuredValue", // motor own-damage sum insured — the V2-P1-07 field
            "property.insuredValue",
            "property.replacementValue",
            "home.insuredValue",
            "home.replacementValue",
            "health.annualLimit",
            "lifeAndInvestment.deathBenefit",
            "pet.annualLimit",
            "pet.annualLimitTotal",
            "policy.sumInsured",
        ],
        legacyPaths: ["coverage.sumInsured"],
    },
} as const

/** The shape of the table above, loosened so a probe can pass a mutated copy. */
export type CoverageFactSources = {
    [K in keyof typeof COVERAGE_FACT_SOURCES]: {
        schemaPaths: readonly string[]
        legacyPaths: readonly string[]
    }
}

/** Follow a dot-path into unknown JSON; undefined on any miss. */
function readPath(root: Record<string, any>, path: string): unknown {
    let current: any = root
    for (const segment of path.split(".")) {
        if (current === null || typeof current !== "object") return undefined
        current = current[segment]
    }
    return current
}

/**
 * Pull the perils, territories and sum insured out of extraction data.
 *
 * All three live in `acordData`, a JSON column, so this reads every spelling in
 * `COVERAGE_FACT_SOURCES` and gives up cleanly. **Giving up returns null, not
 * zero** — an unreadable sum insured must reach the limit dimension as
 * "unevaluable", because a zero would read as a declaration that the policy pays
 * nothing.
 *
 * Exported, with the sources injectable, so the guard test can prove the table
 * is load-bearing: remove a path from a copy and the same payload stops
 * reading. `sources` must never be passed in production code.
 */
export function readCoverageFacts(
    acordData: unknown,
    sources: CoverageFactSources = COVERAGE_FACT_SOURCES
): {
    perils: string[] | null
    territories: string[] | null
    sumInsured: number | null
} {
    const acord = (acordData ?? null) as Record<string, any> | null
    if (!acord || typeof acord !== "object") {
        return { perils: null, territories: null, sumInsured: null }
    }

    // First path holding an array decides; junk in an earlier spelling does not
    // block a readable later one. An empty (or all-junk) array is still "we
    // could not read perils", never "no perils".
    const firstStringArray = (paths: readonly string[]): string[] | null => {
        for (const path of paths) {
            const value = readPath(acord, path)
            if (!Array.isArray(value)) continue
            const strings = value.filter((x): x is string => typeof x === "string")
            return strings.length > 0 ? strings : null
        }
        return null
    }

    const firstFiniteNumber = (paths: readonly string[]): number | null => {
        for (const path of paths) {
            const value = readPath(acord, path)
            if (typeof value === "number" && Number.isFinite(value)) return value
        }
        return null
    }

    return {
        perils: firstStringArray([...sources.perils.schemaPaths, ...sources.perils.legacyPaths]),
        territories: firstStringArray([
            ...sources.territories.schemaPaths,
            ...sources.territories.legacyPaths,
        ]),
        sumInsured: firstFiniteNumber([
            ...sources.sumInsured.schemaPaths,
            ...sources.sumInsured.legacyPaths,
        ]),
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
