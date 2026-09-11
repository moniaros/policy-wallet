/**
 * Needs against cover, with provenance on both sides — PW-PROVENANCE-01 W3-01
 * (plan Wave 3; PERSONAL_RISK_PROFILE.md §I: «no rule reads a limit against a
 * need»).
 *
 * `value_drift` compares two figures the DOCUMENT states. This compares two
 * figures from DIFFERENT layers: the cover from a cited document fact (W1-02
 * decides whether the citation was found in the text), the need from Layer 1
 * profile facts that carry their own evidence level (lib/protection/evidence.ts).
 *
 * The rule that keeps it honest: a comparison is PUBLISHABLE — «shortfall» or
 * «adequate» — only when both sides carry evidence: the need from figures the
 * person gave exactly (`user_reported` or better on every factor) and the cover
 * from a figure the document text confirmed (`policy_verified`). Anything weaker
 * is a QUESTION to ask, never a gap to declare, and the comparison names the
 * weaker side. The computed figure travels with the operands (the `rule_inputs`
 * convention), so a surface can say «cover €50,000, stated on page 2; need
 * €180,000, from the income you gave us in March».
 *
 * The need itself is a rule of thumb, stated as one: annual income × the years
 * of replacement the household's dependency on that income implies, for a
 * household with at least one dependant. It is a parameter the surface must
 * show, not a verdict. It lives here, not in the gap engine: `lib/gap-detection.ts`
 * is owner-frozen (D-V1) and only reads the document.
 */

import { documentEvidenceFor, type DocumentEvidence } from "@/lib/gaps/document-evidence"
import { citationKeyFor } from "@/lib/gaps/document-evidence"
import { branchFamilyId } from "@/lib/insurance/taxonomy"
import { totalDependents, type IncomeDependency, type LifeContext } from "@/lib/services/gap-engine/life-context"

import { factorEvidence } from "./attention-areas"
import { evidenceAtLeast, factEvidence, lowestEvidence, type EvidenceLevel, type FactProvenanceMap } from "./evidence"

/** Years of income a death benefit is asked to replace, by how far the household leans on it. A stated assumption. */
export const INCOME_REPLACEMENT_YEARS: Record<IncomeDependency, number> = { primary: 10, shared: 5, minor: 2 }

export const DEATH_BENEFIT_PATH = "lifeAndInvestment.deathBenefit"

/** The floor a side must reach for the comparison to be published as a finding. */
export const PUBLISHABLE_NEED_FLOOR: EvidenceLevel = "user_reported"
export const PUBLISHABLE_COVER_FLOOR: EvidenceLevel = "policy_verified"

export type NeedsVerdict = "shortfall" | "adequate" | "question" | "not_applicable" | "not_checkable"

export type NeedsMissing = "dependants" | "income" | "income_dependency" | "life_policy" | "death_benefit" | "citation" | "need_evidence"

export interface NeedSide {
    amount: number
    /** The weakest of the three factors' evidence. */
    evidence: EvidenceLevel
    annualIncome: number
    incomeDependency: IncomeDependency
    dependants: number
    years: number
    /** When the income fact was written, if stamped. */
    incomeAt: string | null
}

export interface CoverSide {
    /** Sum of the death benefits on the held life policies that state one. */
    amount: number
    /** The weakest document evidence across those policies, on the six-level scale. */
    evidence: EvidenceLevel
    documentEvidence: DocumentEvidence
    policyIds: string[]
    /** The cited page, when exactly one policy carries the figure and its citation names a page. */
    page: number | null
}

export interface NeedsComparison {
    pair: "life_death_benefit"
    verdict: NeedsVerdict
    need: NeedSide | null
    cover: CoverSide | null
    /** The weaker side's evidence — what the finding may claim. `unknown` when a side is absent. */
    weaker: EvidenceLevel
    /** need − cover when both are present, else null. Positive is a shortfall. */
    shortfall: number | null
    missing: NeedsMissing[]
}

export interface NeedsPolicyInput {
    id: string
    /** Canonical branch id (`life`, `motor`, …), as `areaForPolicyLine` returns it. */
    lob: string
    held: boolean
    acordData: unknown
}

/**
 * The document's evidence for a value, on the profile scale. A citation the
 * text confirmed is `policy_verified`. A value the model read but the text did
 * not confirm is `inferred` — the weakest positive rung, because the figure is
 * there and its support is not; it is deliberately below anything the person
 * stated. Silence is no value at all.
 */
export function documentEvidenceLevel(evidence: DocumentEvidence): EvidenceLevel | null {
    if (evidence === "policy_verified") return "policy_verified"
    if (evidence === "policy_asserted") return "inferred"
    return null
}

function incomeDependencyEvidence(ctx: LifeContext, provenance: FactProvenanceMap): EvidenceLevel {
    if (ctx.incomeDependency === null) return "unknown"
    const stamped = provenance.incomeDependency
    return stamped ? factEvidence(stamped) : "inferred"
}

/** The need side, or the facts it lacks. */
export function lifeNeedFrom(ctx: LifeContext, provenance: FactProvenanceMap): { need: NeedSide } | { missing: NeedsMissing[]; notApplicable?: true } {
    const missing: NeedsMissing[] = []
    if (!ctx.known.dependents && !ctx.known.children) missing.push("dependants")
    if (!ctx.known.income || ctx.annualIncome === null || !Number.isFinite(ctx.annualIncome) || ctx.annualIncome <= 0) missing.push("income")
    if (ctx.incomeDependency === null) missing.push("income_dependency")
    if (missing.length > 0) return { missing }
    const dependants = totalDependents(ctx)
    if (dependants <= 0) return { missing: [], notApplicable: true }
    const incomeDependency = ctx.incomeDependency as IncomeDependency
    const years = INCOME_REPLACEMENT_YEARS[incomeDependency]
    const annualIncome = ctx.annualIncome as number
    return {
        need: {
            amount: annualIncome * years,
            evidence: lowestEvidence([
                factorEvidence("income", ctx, provenance),
                factorEvidence("dependents", ctx, provenance),
                incomeDependencyEvidence(ctx, provenance),
            ]),
            annualIncome,
            incomeDependency,
            dependants,
            years,
            incomeAt: provenance.annualIncome?.at ?? null,
        },
    }
}

function deathBenefitOf(acordData: unknown): number | null {
    const value = (acordData as { lifeAndInvestment?: { deathBenefit?: unknown } } | null | undefined)?.lifeAndInvestment?.deathBenefit
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null
}

function citedPageOf(acordData: unknown): number | null {
    const entry = (acordData as { extraction?: { sources?: Record<string, { page?: unknown; verifiedPage?: unknown }> } } | null | undefined)?.extraction
        ?.sources?.[citationKeyFor(DEATH_BENEFIT_PATH)]
    const page = entry?.verifiedPage ?? entry?.page
    return typeof page === "number" && Number.isFinite(page) && page > 0 ? page : null
}

/** The cover side from the held life policies, or what is missing. */
export function deathBenefitCoverFrom(policies: readonly NeedsPolicyInput[]): { cover: CoverSide } | { missing: NeedsMissing[] } {
    // The family, not the branch: income protection and personal accident are life-family lines; only those stating a death benefit count.
    const life = policies.filter((p) => p.held && branchFamilyId(p.lob) === "life")
    if (life.length === 0) return { missing: ["life_policy"] }
    const stating = life
        .map((p) => ({ p, amount: deathBenefitOf(p.acordData), evidence: documentEvidenceFor(p.acordData, DEATH_BENEFIT_PATH) }))
        .filter((e): e is { p: NeedsPolicyInput; amount: number; evidence: DocumentEvidence } => e.amount !== null && e.evidence !== "policy_silent")
    if (stating.length === 0) return { missing: ["death_benefit"] }
    const documentEvidence: DocumentEvidence = stating.some((e) => e.evidence === "policy_asserted") ? "policy_asserted" : "policy_verified"
    return {
        cover: {
            amount: stating.reduce((sum, e) => sum + e.amount, 0),
            evidence: documentEvidenceLevel(documentEvidence) as EvidenceLevel,
            documentEvidence,
            policyIds: stating.map((e) => e.p.id),
            page: stating.length === 1 ? citedPageOf(stating[0].p.acordData) : null,
        },
    }
}

/** The comparison. Publishable only when both sides carry evidence; otherwise a question that names the weaker side. */
export function compareLifeNeed(needSide: ReturnType<typeof lifeNeedFrom>, coverSide: ReturnType<typeof deathBenefitCoverFrom>): NeedsComparison {
    const need = "need" in needSide ? needSide.need : null
    const cover = "cover" in coverSide ? coverSide.cover : null
    const missing: NeedsMissing[] = [...("missing" in needSide ? needSide.missing : []), ...("missing" in coverSide ? coverSide.missing : [])]
    const base = { pair: "life_death_benefit" as const, need, cover, shortfall: need && cover ? need.amount - cover.amount : null }

    if ("notApplicable" in needSide && needSide.notApplicable) {
        return { ...base, verdict: "not_applicable", weaker: "unknown", missing }
    }
    if (!need) return { ...base, verdict: "question", weaker: "unknown", missing }
    if (!cover) return { ...base, verdict: "not_checkable", weaker: "unknown", missing }

    const weaker = lowestEvidence([need.evidence, cover.evidence])
    const needOk = evidenceAtLeast(need.evidence, PUBLISHABLE_NEED_FLOOR)
    const coverOk = evidenceAtLeast(cover.evidence, PUBLISHABLE_COVER_FLOOR)
    if (!needOk || !coverOk) {
        const why: NeedsMissing[] = []
        if (!coverOk) why.push("citation")
        if (!needOk) why.push("need_evidence")
        return { ...base, verdict: "question", weaker, missing: [...missing, ...why] }
    }
    return { ...base, verdict: need.amount > cover.amount ? "shortfall" : "adequate", weaker, missing }
}

/** Every pair the product compares today: one. */
export function needsAgainstCover(input: { ctx: LifeContext; provenance: FactProvenanceMap; policies: readonly NeedsPolicyInput[] }): NeedsComparison[] {
    return [compareLifeNeed(lifeNeedFrom(input.ctx, input.provenance), deathBenefitCoverFrom(input.policies))]
}

/** A published verdict — the only ones a summary may count or a surface may call a finding. */
export function isPublishedNeedsVerdict(verdict: NeedsVerdict): boolean {
    return verdict === "shortfall" || verdict === "adequate"
}
