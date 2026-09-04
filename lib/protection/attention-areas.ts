/**
 * The composition — one area of attention from four layers, on read.
 *
 * For each of the ten areas (lib/protection/domains.ts) this joins what the
 * person SAID (Layer 2, `ProtectionPriority` rows), what the engine concluded
 * from the FACTS (Layer 3, `RiskAssessment` rows), what the DOCUMENTS show
 * (Layer 4, `CoverageModel`) and how each fact was written (`FactProvenanceMap`)
 * into an `alignment`, a `confidence`, and the explanation triplet — why this
 * is showing, what we do not know yet, what happens next.
 * See docs/planning/PERSONAL_RISK_PROFILE.md §C, §H, §I.
 *
 * The alignment is deliberately conservative and its vocabulary is CLOSED —
 * five words, guarded by tests/unit/attention-areas.test.ts:
 *
 *   gap              ≥1 rule-decided finding on a policy in force in the area.
 *                    Never from an answer, never from the engine's opinion.
 *   appears_covered  a held (in-force) line answers the risk, and every
 *                    essential risk the engine could decide is answered.
 *                    `summary_only` lines add the limits caveat.
 *   review           the engine found an uncovered exposure (`protection_gap`
 *                    or `opportunity`), or the person named the area as a
 *                    concern and nothing is held. A stated priority raises
 *                    attention; it never becomes a gap (§I).
 *   unknown          a deciding fact is still missing (`needs_review`).
 *   not_yet_checked  exposure known, no policy seen — and «δεν έχουμε δει»
 *                    is never rendered as «δεν έχετε».
 *
 * Confidence is the weakest link: the lowest evidence level among the facts
 * the area's risks condition on and, when a line decided the alignment, the
 * line's own evidence. A summary-only policy over a floor-estimated dependant
 * count is `inferred`, not `policy_verified`.
 *
 * There is NO score here. Nothing is summed, weighted or turned into a
 * percentage; `attentionSummary` returns counts of words, for count keys.
 * Guards: tests/unit/attention-areas.test.ts (source assertion).
 */

import { getBranchFamily } from "@/lib/insurance/taxonomy"
import { getTranslations, type Language } from "@/lib/i18n"
import { AREAS, AREA_IDS, AREA_ORDER, type AttentionAreaId } from "@/lib/protection/domains"
import {
    evidenceAtLeast,
    factEvidence,
    lowestEvidence,
    type EvidenceLevel,
    type FactProvenanceMap,
} from "@/lib/protection/evidence"
import {
    areaHasHeldLine,
    heldLines,
    type AreaCoverage,
    type CoverageLine,
    type CoverageModel,
} from "@/lib/protection/coverage-model"
import { questionsForArea, type FactorQuestion } from "@/lib/protection/factor-questions"
import { FACTOR_COLUMNS, type ContextFactorKey, type LifeContext } from "@/lib/services/gap-engine/life-context"
import { comparePriority } from "@/lib/services/gap-engine/risk-assessment"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import type { RiskAssessment, RiskStatus } from "@/lib/services/gap-engine/risk-types"
import type { EventDomain } from "@/lib/services/life-events/types"
import {
    areaForConcern,
    IMPORTANCE_ORDER,
    type PriorityImportance,
    type PriorityReasonId,
    type ProtectionPriority,
} from "@/lib/services/protection-profile/derive-priorities"

// ── Vocabulary ──────────────────────────────────────────────────────────

/** The closed verdict vocabulary — §C's table, nothing else. */
export const ALIGNMENTS = ["unknown", "not_yet_checked", "appears_covered", "review", "gap"] as const
export type Alignment = (typeof ALIGNMENTS)[number]

export type ExplanationDensity = "expanded" | "collapsed" | "minimal"
export type NextStep = "answer_questions" | "check_first_policy" | "review_finding" | "nothing_now"

export interface AreaRiskExposure {
    id: string
    status: RiskStatus
    name: string
    missingFactors: ContextFactorKey[]
}

export interface AreaExplanation {
    /** Why this area is showing — the catalogue's own words, or the stated priority. */
    why: string
    /** What we do not know yet — unknown facts as nouns, or the policy / limits caveat. */
    unknown: string
    /** What happens next, as a sentence. */
    next: string
    nextStep: NextStep
    density: ExplanationDensity
}

/**
 * One area, composed. Named `…View` because lib/protection/domains.ts already
 * exports `AttentionArea` for the vocabulary row this is built on.
 */
export interface AttentionAreaView {
    area: AttentionAreaId
    domain: EventDomain
    label: string
    /** From the priority rows; an area with no row is `watch`. */
    importance: PriorityImportance
    /** high | medium importance, or a stated concern names it, or a recent change touched it. */
    activated: boolean
    exposure: { risks: AreaRiskExposure[] }
    /** Requires first, then supports, across the area's in-scope risks, deduped. */
    unknownFactors: ContextFactorKey[]
    protection: AreaCoverage
    alignment: Alignment
    confidence: EvidenceLevel
    /** True until a held line exists for the area or answers one of its risks. */
    requiresValidation: boolean
    explanation: AreaExplanation
}

export interface AttentionNeeds {
    /** Onboarding concern ids («τι θα σας επηρέαζε περισσότερο;»). */
    riskConcerns?: readonly string[]
    uncertaintyReasons?: readonly string[]
    guidancePreference?: string | null
    /** Areas a recent change or life event touched — resolved by the caller. */
    recentChangeAreas?: readonly AttentionAreaId[]
}

export interface BuildAttentionAreasInput {
    priorities: readonly ProtectionPriority[]
    assessments: readonly RiskAssessment[]
    coverage: CoverageModel
    provenance: FactProvenanceMap
    ctx: LifeContext
    needs: AttentionNeeds
    language: Language
}

export interface AttentionSummary {
    areaCount: number
    activatedCount: number
    unknownCount: number
    coveredCount: number
    gapCount: number
}

/** The uncertainty answer that puts «Δεν το ξεκαθαρίσαμε» before «Αξίζει να το εξετάσουμε». */
export const UNCERTAINTY_DONT_KNOW_COVERAGE = "dont_know_coverage"

// ── Copy ────────────────────────────────────────────────────────────────

interface AttentionCopy {
    alignment: Record<Alignment, string>
    headings: { why: string; unknown: string; next: string; dormant: string }
    next: Record<NextStep, string> & { answer_question_one: string }
    caveats: { limits_unread: string; no_policy_seen: string; absence_not_evidence: string; limits_read: string; unknown_list: string }
    confidence: Record<EvidenceLevel, string>
    reasons: Record<PriorityReasonId | "dormant", string>
}

function attentionCopy(language: Language): AttentionCopy {
    return getTranslations(language).protection.attention as unknown as AttentionCopy
}

/** Dictionary text for an alignment / a confidence level — for the surfaces. */
export function alignmentLabel(alignment: Alignment, language: Language): string {
    return attentionCopy(language).alignment[alignment]
}
export function confidenceLabel(level: EvidenceLevel, language: Language): string {
    return attentionCopy(language).confidence[level]
}

// ── Helpers ─────────────────────────────────────────────────────────────

const CATALOGUE_BY_ID = new Map(RISK_CATALOG.map((r) => [r.id, r]))

/** assessRisks' own order: open findings, then covered, then questions, then out of scope. */
const STATUS_RANK: Record<RiskStatus, number> = {
    protection_gap: 0,
    opportunity: 1,
    applicable: 2,
    already_covered: 3,
    needs_review: 4,
    not_applicable: 5,
}

function byEngineOrder(a: RiskAssessment, b: RiskAssessment): number {
    return STATUS_RANK[a.status] - STATUS_RANK[b.status] || comparePriority(a.priority, b.priority) || a.riskId.localeCompare(b.riskId)
}

function highestEvidence(levels: readonly EvidenceLevel[]): EvidenceLevel {
    let best: EvidenceLevel = "unknown"
    for (const l of levels) if (evidenceAtLeast(l, best)) best = l
    return best
}

/**
 * What one fact is worth. Unknown to the engine → `unknown`. Known → the
 * strongest provenance among its columns (a factor is known through ANY of
 * them, so the column that answered it is the one that counts). Known but
 * unstamped — a row written before provenance existed — → `inferred`: the
 * value is there, how it got there is not, and that is the weakest positive
 * level rather than a claim the record cannot support.
 */
export function factorEvidence(factor: ContextFactorKey, ctx: LifeContext, provenance: FactProvenanceMap): EvidenceLevel {
    if (!ctx.known[factor]) return "unknown"
    const stamped = FACTOR_COLUMNS[factor].map((column) => provenance[column]).filter((p) => p != null)
    if (stamped.length === 0) return "inferred"
    return highestEvidence(stamped.map((p) => factEvidence(p)))
}

/** The held lines that answer an `already_covered` risk — by id or by family (motorbike ∈ motor). */
function coveringHeldLines(a: RiskAssessment, held: readonly CoverageLine[]): CoverageLine[] {
    if (a.status !== "already_covered" || a.coveredBy.length === 0) return []
    return held.filter((line) =>
        a.coveredBy.some((lob) => {
            const key = lob.toLowerCase()
            return line.lob === key || getBranchFamily(key).includes(line.lob)
        })
    )
}

function densityFor(preference: string | null | undefined): ExplanationDensity {
    if (preference === "explain_everything") return "expanded"
    if (preference === "on_my_own") return "minimal"
    return "collapsed"
}

function fill(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (m, key: string) => values[key] ?? m)
}

// ── The composition ─────────────────────────────────────────────────────

interface Env {
    input: BuildAttentionAreasInput
    copy: AttentionCopy
    held: CoverageLine[]
    concernAreas: Set<AttentionAreaId>
    changedAreas: Set<AttentionAreaId>
    priorityByRow: Map<string, ProtectionPriority>
}

function composeArea(area: AttentionAreaId, env: Env): AttentionAreaView {
    const { input, copy, held } = env
    const { assessments, coverage, provenance, ctx, language } = input
    const table = AREAS[area]

    // ── Layer 2: importance and activation ──────────────────────────
    const priority = env.priorityByRow.get(table.priorityId)
    const importance: PriorityImportance = priority?.importance ?? "watch"
    const stated = env.concernAreas.has(area)
    const activated = importance === "high" || importance === "medium" || stated || env.changedAreas.has(area)

    // ── Layer 3: exposure ───────────────────────────────────────────
    const areaRisks = assessments.filter((a) => table.riskIds.includes(a.riskId)).sort(byEngineOrder)
    const inScope = areaRisks.filter((a) => a.status !== "not_applicable")
    const decidedEssential = inScope.filter((a) => a.applicability === "applicable" && a.kind === "essential")
    const coveredRisks = inScope.filter((a) => coveringHeldLines(a, held).length > 0)
    const engineFinding = inScope.some((a) => a.status === "protection_gap" || a.status === "opportunity")

    const requiresUnknown: ContextFactorKey[] = []
    const supportsUnknown: ContextFactorKey[] = []
    for (const a of inScope) {
        const def = CATALOGUE_BY_ID.get(a.riskId)
        for (const f of def?.requires ?? a.missingFactors) if (!ctx.known[f] && !requiresUnknown.includes(f)) requiresUnknown.push(f)
        for (const f of def?.supports ?? []) if (!ctx.known[f] && !supportsUnknown.includes(f)) supportsUnknown.push(f)
    }
    const unknownFactors = [...requiresUnknown, ...supportsUnknown.filter((f) => !requiresUnknown.includes(f))]

    // ── Layer 4: protection ─────────────────────────────────────────
    const protection = coverage[area]
    const heldGaps = protection.gaps.filter((g) => g.onHeldPolicy)
    const areaHeld = areaHasHeldLine(coverage, area)
    const anyHeld = areaHeld || coveredRisks.length > 0

    // ── Alignment — §C's table, in this order ───────────────────────
    // The engine reports `protection_gap` for EVERY uncovered essential
    // exposure, and "uncovered" there means "no policy in the wallet answers
    // it". In an area where nothing is held that is the not_yet_checked row —
    // «δεν έχουμε δει», never «δεν έχετε» — so an engine finding earns `review`
    // only when the area has evidence (a held line that answers something else
    // in it, or a line elsewhere that answers one of its risks). A stated
    // concern with nothing held is the other `review` row.
    const reviewFromEngine = engineFinding && anyHeld
    let alignment: Alignment
    if (heldGaps.length > 0) {
        alignment = "gap"
    } else if (coveredRisks.length > 0 && decidedEssential.every((a) => coveredRisks.includes(a))) {
        alignment = "appears_covered"
    } else if (reviewFromEngine || (stated && !anyHeld)) {
        alignment = "review"
    } else if (inScope.some((a) => a.status === "needs_review")) {
        alignment = "unknown"
    } else {
        alignment = "not_yet_checked"
    }

    // ── Confidence — the weakest link ───────────────────────────────
    const usedFactors = [...new Set(areaRisks.flatMap((a) => CATALOGUE_BY_ID.get(a.riskId)?.requires ?? a.missingFactors))]
    const usedLines: CoverageLine[] =
        alignment === "appears_covered"
            ? coveredRisks.flatMap((a) => coveringHeldLines(a, held))
            : alignment === "gap"
              ? protection.lines.filter((l) => l.held && heldGaps.some((g) => g.policyId === l.policyId))
              : []
    const confidence = lowestEvidence([
        ...usedFactors.map((f) => factorEvidence(f, ctx, provenance)),
        ...usedLines.map((l) => l.evidence),
    ])
    const requiresValidation = !anyHeld

    // ── The triplet ─────────────────────────────────────────────────
    // One question per written column (residence and tenancy share one), and
    // the deciding facts before the refining ones.
    const requiredQuestions: FactorQuestion[] = questionsForArea(area, requiresUnknown)
    const questions: FactorQuestion[] = questionsForArea(area, unknownFactors)
    const limitsLines = alignment === "appears_covered" ? usedLines : protection.lines.filter((l) => l.held)
    const limitsUnread = anyHeld && !limitsLines.some((l) => l.detail === "analysed")

    const topApplies =
        (alignment === "appears_covered" ? coveredRisks[0] : undefined) ?? inScope.find((a) => a.applicability === "applicable")
    const outOfScope = areaRisks.find((a) => a.status === "not_applicable")
    let why: string
    if (topApplies) why = topApplies.whyItApplies[language]
    else if (priority) why = copy.reasons[priority.reason.id] ?? copy.reasons.dormant
    else if (outOfScope) why = outOfScope.whyItApplies[language]
    else why = copy.reasons.dormant

    let unknown: string
    if (questions.length > 0) {
        unknown = fill(copy.caveats.unknown_list, { list: questions.map((q) => q.shortNoun[language]).join(", ") })
        // «Δεν έχουμε δει» is never «δεν έχετε»: the not-yet-checked row keeps
        // its caveat even when the line is busy listing facts.
        if (alignment === "not_yet_checked") unknown = `${unknown} ${copy.caveats.absence_not_evidence}`
        // «Φαίνεται να καλύπτεται» on a summary-only line must still say the
        // limits were not read — the unknown line is busy, so the why carries it.
        if (alignment === "appears_covered" && limitsUnread) why = `${why} ${copy.caveats.limits_unread}`
    } else if (!anyHeld) {
        unknown = `${copy.caveats.no_policy_seen} ${copy.caveats.absence_not_evidence}`
    } else if (limitsUnread) {
        unknown = copy.caveats.limits_unread
    } else {
        unknown = copy.caveats.limits_read
    }

    // What happens next: a missing DECIDING fact is always the first ask; a
    // finding (rule gap, engine finding on evidence, or a question the market
    // rather than the person must answer) is read; an area nothing has been
    // seen for asks for its first policy; a covered area asks its refining
    // questions or nothing.
    let nextStep: NextStep
    if (requiredQuestions.length > 0) nextStep = "answer_questions"
    else if (alignment === "gap" || alignment === "unknown" || (alignment === "review" && reviewFromEngine)) nextStep = "review_finding"
    else if (alignment === "appears_covered") nextStep = questions.length > 0 ? "answer_questions" : "nothing_now"
    else nextStep = inScope.length > 0 || stated ? "check_first_policy" : "nothing_now"
    const next =
        nextStep === "answer_questions"
            ? questions.length === 1
                ? copy.next.answer_question_one
                : fill(copy.next.answer_questions, { count: String(questions.length) })
            : copy.next[nextStep]

    return {
        area,
        domain: table.domain,
        label: table.label[language],
        importance,
        activated,
        exposure: {
            risks: areaRisks.map((a) => ({ id: a.riskId, status: a.status, name: a.name[language], missingFactors: [...a.missingFactors] })),
        },
        unknownFactors,
        protection,
        alignment,
        confidence,
        requiresValidation,
        explanation: { why, unknown, next, nextStep, density: densityFor(input.needs.guidancePreference) },
    }
}

/**
 * All ten areas, ordered: activated first; then importance (high → medium →
 * watch → needs_review, the map's own order); then — when the person said
 * they do not know what their policies cover — the areas we could not settle
 * before the ones worth a look; then the authored area order. Stable.
 */
export function buildAttentionAreas(input: BuildAttentionAreasInput): AttentionAreaView[] {
    const needs = input.needs ?? {}
    const env: Env = {
        input,
        copy: attentionCopy(input.language),
        held: heldLines(input.coverage),
        concernAreas: new Set(
            (needs.riskConcerns ?? []).map((c) => areaForConcern(c)).filter((a): a is AttentionAreaId => a !== undefined)
        ),
        changedAreas: new Set(needs.recentChangeAreas ?? []),
        priorityByRow: new Map(input.priorities.map((p) => [p.id, p])),
    }
    const unknownFirst = (needs.uncertaintyReasons ?? []).includes(UNCERTAINTY_DONT_KNOW_COVERAGE)
    const areaRank = (id: AttentionAreaId) => AREA_ORDER.indexOf(id)

    return AREA_IDS.map((id) => composeArea(id, env)).sort(
        (a, b) =>
            Number(b.activated) - Number(a.activated) ||
            IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance] ||
            (unknownFirst ? Number(a.alignment !== "unknown") - Number(b.alignment !== "unknown") : 0) ||
            areaRank(a.area) - areaRank(b.area)
    )
}

/** Counts of words, for count keys. Not a figure, not summable into one. */
export function attentionSummary(areas: readonly AttentionAreaView[]): AttentionSummary {
    return {
        areaCount: areas.length,
        activatedCount: areas.filter((a) => a.activated).length,
        unknownCount: areas.filter((a) => a.alignment === "unknown").length,
        coveredCount: areas.filter((a) => a.alignment === "appears_covered").length,
        gapCount: areas.filter((a) => a.alignment === "gap").length,
    }
}
