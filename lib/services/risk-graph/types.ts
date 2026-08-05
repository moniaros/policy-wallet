/**
 * Personal Risk Graph — domain model.
 *
 * Specification: docs/architecture/personal-risk-graph.md
 *
 * The graph models the customer's LIFE: the things they own, the people who
 * depend on them, the obligations they carry. Policies are satellites that point
 * INTO it — they are never nodes, and risk derivation never reads them. That
 * separation is the whole design: what a person owns must not be inferred from
 * what they bought.
 *
 * It is a **derived projection**, not a new source of truth. `LifeContext`
 * remains exactly what it was; the graph is computed from it and from the
 * customer's policies on every read. That is what keeps every existing surface
 * working unchanged, and it means there is nothing to migrate.
 *
 * What the graph adds that a flat context cannot express:
 *
 *  - **Identity.** `propertiesOwned: 2` becomes two property nodes, each
 *    independently coverable. The `minPolicies` count-comparison that stood in
 *    for this can finally say WHICH property is insured.
 *  - **Partial protection.** Cover is compared on four dimensions, so "insured
 *    but not for earthquake" stops collapsing into "insured".
 *  - **Evidence.** Every risk points at the node or policy that justifies it,
 *    instead of asserting it in prose.
 */

import type { Bilingual } from "@/lib/services/gap-engine/risk-types"

// ── Nodes ────────────────────────────────────────────────────────────

/**
 * Node types, grouped by the six abstract roots that behave differently.
 *
 * `Policy`, `Cover` and `Claim` are deliberately absent: an insurance concept as
 * a node type is how a life model quietly becomes a product model.
 */
export const NODE_TYPES = [
    // Party — can bear liability, can be a beneficiary
    "person",
    "household",
    "dependent",
    "business",
    "pet",
    // Asset — has a value that can be lost
    "property",
    "vehicle",
    "vessel",
    "valuable",
    "digital_asset",
    // Obligation — survives the subject's death
    "mortgage",
    "loan",
    // Flow — a rate, not a stock; interruptible rather than destructible
    "income",
    "savings",
    // Condition — modifies other nodes' risks
    "health_condition",
    "occupation",
    "activity",
    // Exposure — no location, no value; frequency is its only dimension
    "travel",
    "cyber_exposure",
] as const
export type NodeType = (typeof NODE_TYPES)[number]

export const NODE_ROOTS = ["party", "asset", "obligation", "flow", "condition", "exposure"] as const
export type NodeRoot = (typeof NODE_ROOTS)[number]

export const NODE_ROOT_OF: Record<NodeType, NodeRoot> = {
    person: "party",
    household: "party",
    dependent: "party",
    business: "party",
    pet: "party",
    property: "asset",
    vehicle: "asset",
    vessel: "asset",
    valuable: "asset",
    digital_asset: "asset",
    mortgage: "obligation",
    loan: "obligation",
    income: "flow",
    savings: "flow",
    health_condition: "condition",
    occupation: "condition",
    activity: "condition",
    travel: "exposure",
    cyber_exposure: "exposure",
}

export interface GraphNode {
    /** Deterministic and stable across recomputation: `property:1`, `person:self`. */
    id: string
    type: NodeType
    root: NodeRoot
    label: Bilingual
    /** Type-specific facts. Only what changes a risk. */
    attributes: Record<string, string | number | boolean | null>
    /**
     * How we know this node exists.
     *
     * `declared` — the customer said so. `derived` — computed from other declared
     * facts. `inferred` — guessed from a document or a policy, which may mark a
     * factor known but may never make an essential risk applicable.
     */
    confidence: "declared" | "derived" | "inferred"
}

// ── Edges ────────────────────────────────────────────────────────────

export const EDGE_TYPES = [
    "member_of",
    "depends_on",
    "owns",
    "uses",
    "custodian_of",
    "houses",
    "secured_on",
    "owes",
    "earns",
    "operates",
    "employs",
    "has_condition",
    "engages_in",
] as const
export type EdgeType = (typeof EDGE_TYPES)[number]

export interface GraphEdge {
    type: EdgeType
    from: string
    to: string
    attributes?: Record<string, string | number | boolean | null>
}

export interface PersonalRiskGraph {
    nodes: GraphNode[]
    edges: GraphEdge[]
    /** Node ids by type, for cheap pattern matching. */
    byType: Record<NodeType, string[]>
}

// ── Protection ───────────────────────────────────────────────────────

/**
 * The four states a risk can be in.
 *
 * `partially_protected` is the one a flat model could not express. Cover is
 * compared dimension by dimension (§ProtectionDimension); satisfying some and
 * failing others is the normal case, and collapsing it into "protected" is how
 * an uninsured earthquake exposure reads as a covered home.
 *
 * `unknown` is a first-class answer, never a synonym for zero. It means we
 * cannot evaluate — most often because the sum insured is buried in
 * unqueryable extraction data.
 */
export const RISK_STATES = [
    "protected",
    "partially_protected",
    "unprotected",
    "unknown",
] as const
export type RiskState = (typeof RISK_STATES)[number]

/**
 * The dimensions cover can be judged on.
 *
 * They are not peers, and only the ones we can actually ask are emitted for a
 * given risk (see §protection.ts). `period` asks whether cover EXISTS today;
 * peril, limit and territory ask whether it is ADEQUATE. A risk is `protected`
 * when it is in force and every adequacy dimension we could evaluate is
 * satisfied — and `unknown` when it is in force and none of them could be.
 */
export const PROTECTION_DIMENSIONS = ["peril", "limit", "territory", "period"] as const
export type ProtectionDimension = (typeof PROTECTION_DIMENSIONS)[number]

export type DimensionVerdict = "satisfied" | "failed" | "unevaluable"

export interface DimensionAssessment {
    dimension: ProtectionDimension
    verdict: DimensionVerdict
    /** Why, in the customer's own terms. */
    detail: Bilingual
}

// ── Evidence ─────────────────────────────────────────────────────────

/**
 * Why we believe something.
 *
 * Structured rather than prose, so a claim can be traced to the node or policy
 * that supports it and re-rendered in any surface. `whyItApplies` explains; this
 * *substantiates*.
 */
export const EVIDENCE_KINDS = [
    "declared_fact",
    "held_policy",
    "derived",
    "absence",
    "market_rule",
] as const
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number]

export interface Evidence {
    kind: EvidenceKind
    /** The graph node this rests on, when there is one. */
    nodeId?: string
    /** The policy this rests on, when there is one. */
    policyRef?: string
    statement: Bilingual
    confidence: "declared" | "derived" | "inferred"
}

/**
 * A risk, bound to the specific things in the graph that produce it.
 *
 * `anchorNodeIds` is the identity `minPolicies` was approximating with a count:
 * two properties produce two independently-coverable instances, and a policy
 * naming one says nothing about the other.
 */
export interface GraphRisk {
    riskId: string
    lineOfBusiness: string
    /** The nodes that produce this risk. Empty only for subject-wide risks. */
    anchorNodeIds: string[]
    state: RiskState
    dimensions: DimensionAssessment[]
    /** Everything supporting the claim — never empty for an applicable risk. */
    evidence: Evidence[]
    /** Policies answering it, wholly or in part. */
    protectedBy: string[]
}
