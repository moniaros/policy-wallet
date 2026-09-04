/**
 * View models for the attention surfaces — the areas list on
 * /protection?lens=risk and the area detail at /protection/areas/[area].
 *
 * Pure and serialisable: the page assembles these on the server from the
 * read seam (lib/protection/load-attention-areas.ts) and the engine's own
 * assessment, and the components render words. Nothing here reads a
 * database, re-derives a lifecycle or invents a verdict — the five alignment
 * words come from `alignmentLabel`, the status word from `getPolicyStatusView`,
 * severity from `describeSeverity`, a policy's name from `policyLabel`.
 * See docs/planning/PERSONAL_RISK_PROFILE.md §C, §D, §F, §I.
 */

import { describeSeverity } from "@/lib/gaps/severity-display"
import type { getTranslations, Language } from "@/lib/i18n"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { preventionActions, type PreventionAction } from "@/lib/insurance/policy-conditions"
import {
    alignmentLabel,
    confidenceLabel,
    factorEvidence,
    type Alignment,
    type AttentionAreaView,
    type ExplanationDensity,
    type NextStep,
    UNCERTAINTY_DONT_KNOW_COVERAGE,
} from "@/lib/protection/attention-areas"
import type { CoverageLine } from "@/lib/protection/coverage-model"
import { AREA_ORDER, AREAS, type AttentionAreaId } from "@/lib/protection/domains"
import type { EvidenceLevel, FactProvenanceMap, ProtectionDetail } from "@/lib/protection/evidence"
import {
    INCOME_DEPENDENCY_FACTOR,
    questionForFactor,
    questionsForArea,
    type AssessmentFactorKey,
    type FactorQuestion,
    type QuestionInput,
} from "@/lib/protection/factor-questions"
import type { ContextFactorKey, LifeContext } from "@/lib/services/gap-engine/life-context"
import type { Mitigation, MitigationKind, RiskAssessment, RiskStatus } from "@/lib/services/gap-engine/risk-types"
import type { PriorityImportance } from "@/lib/services/protection-profile/derive-priorities"
import { getPolicyStatusView, type StatusTone } from "@/lib/wallet/policy-status-view"
import { policyLabel } from "@/lib/wallet/policy-identity"

type Translations = ReturnType<typeof getTranslations>
type AttentionCopy = Translations["protection"]["attention"]
type AssessmentUiCopy = Translations["protection"]["assessment"]["ui"]

export const areaHref = (area: AttentionAreaId): string => `/protection/areas/${area}`

export function isAttentionAreaId(value: string): value is AttentionAreaId {
    return (AREA_ORDER as readonly string[]).includes(value)
}

// ── The list ──────────────────────────────────────────────────────────

export interface AreaListItemView {
    area: AttentionAreaId
    label: string
    importance: PriorityImportance
    importanceWord: string
    alignment: Alignment
    alignmentWord: string
    confidence: EvidenceLevel
    confidenceWord: string
    activated: boolean
    unknownFactorCount: number
    /** «Φαίνεται να καλύπτεται» on a summary-only line — the composition put the caveat in `why`; the row repeats it. */
    limitsCaveat: boolean
    href: string
}

export function areaListItems(areas: readonly AttentionAreaView[], language: Language, copy: AttentionCopy): AreaListItemView[] {
    return areas.map((view) => ({
        area: view.area,
        label: view.label,
        importance: view.importance,
        importanceWord: copy.importance[view.importance],
        alignment: view.alignment,
        alignmentWord: alignmentLabel(view.alignment, language),
        confidence: view.confidence,
        confidenceWord: confidenceLabel(view.confidence, language),
        activated: view.activated,
        unknownFactorCount: view.unknownFactors.length,
        limitsCaveat: view.alignment === "appears_covered" && view.explanation.why.includes(copy.caveats.limits_unread),
        href: areaHref(view.area),
    }))
}

// ── «Τι χρειάζεται ακόμη να καταλάβουμε» ──────────────────────────────

export interface UnknownFactorItemView {
    factor: ContextFactorKey
    noun: string
    area: AttentionAreaId
    areaLabel: string
    href: string
}

/**
 * The engine's `factorsToResolve` as nouns, each naming the area it unlocks:
 * the first area (authored order) whose composition still lists the factor.
 * A factor no area asks — a special-category factor outside its own area,
 * for instance — is dropped rather than linked nowhere.
 */
export function unknownFactorItems(
    factors: readonly ContextFactorKey[],
    areas: readonly AttentionAreaView[],
    language: Language
): UnknownFactorItemView[] {
    const byArea = new Map(areas.map((a) => [a.area, a]))
    const out: UnknownFactorItemView[] = []
    for (const factor of factors) {
        const question = questionForFactor(factor)
        if (!question) continue
        const area = AREA_ORDER.find((id) => {
            const view = byArea.get(id)
            return view !== undefined && question.area.includes(id) && view.unknownFactors.includes(factor)
        })
        if (!area) continue
        out.push({
            factor,
            noun: question.shortNoun[language],
            area,
            areaLabel: byArea.get(area)!.label,
            href: areaHref(area),
        })
    }
    return out
}

// ── Questions ─────────────────────────────────────────────────────────

export interface AreaQuestionView {
    factor: AssessmentFactorKey
    input: QuestionInput
    options?: Array<{ value: string; label: string }>
    prompt: string
    why: string
    shortNoun: string
    specialCategory: boolean
    /** A value from what the person already told us, or null. Never a default. */
    prefill: string | number | boolean | string[] | null
}

/** What the person has actually said about a factor — a stored default is not a value. */
export function prefillFor(factor: AssessmentFactorKey, ctx: LifeContext, now: Date): AreaQuestionView["prefill"] {
    const positive = (n: number | null | undefined) => (typeof n === "number" && n > 0 ? n : null)
    const flag = (b: boolean) => (b ? true : null)
    const text = (s: string | null | undefined) => (s && s.length > 0 ? s : null)
    const list = (l: readonly string[] | null | undefined) => (l && l.length > 0 ? [...l] : null)
    switch (factor) {
        case "age":
            return ctx.age === null ? null : now.getUTCFullYear() - ctx.age
        case "maritalStatus":
            return text(ctx.maritalStatus)
        case "children":
            return positive(ctx.childrenCount)
        case "dependents":
            return positive(ctx.dependentsCount)
        case "pets":
            return flag(ctx.hasPets)
        case "vehicles":
            return positive(ctx.vehiclesCount)
        case "residence":
        case "tenancy":
            return text(ctx.residenceType)
        case "propertyOwnership":
            return positive(ctx.propertiesOwned)
        case "tenants":
            return flag(ctx.rentsOutProperty)
        case "boat":
            return flag(ctx.ownsBoat)
        case "businessOwnership":
            return flag(ctx.ownsBusiness)
        case "selfEmployed":
            return text(ctx.employmentStatus)
        case "employees":
            return positive(ctx.businessEmployees)
        case "income":
            return positive(ctx.annualIncome)
        case "savings":
            return positive(ctx.savingsAmount)
        case "mortgage":
            return positive(ctx.mortgageAmount)
        case "loans":
            return positive(ctx.loanAmount)
        case "travelFrequency":
            return flag(ctx.travelsFrequently)
        case "hobbies":
            return list(ctx.activities)
        case "valuables":
            return positive(ctx.valuablesValue)
        case "cyberExposure":
            return text(ctx.cyberExposure)
        case "retirementPlanning":
            return flag(ctx.retirementPlanning)
        case "health":
            return list(ctx.chronicConditions)
        case "buildingManagerRole":
            return flag(ctx.isBuildingManager)
        case INCOME_DEPENDENCY_FACTOR:
            return text(ctx.incomeDependency)
    }
}

function toQuestionView(q: FactorQuestion, language: Language, ctx: LifeContext, now: Date): AreaQuestionView {
    return {
        factor: q.factor,
        input: q.input,
        ...(q.options ? { options: q.options.map((o) => ({ value: o.value, label: o.label[language] })) } : {}),
        prompt: q.prompt[language],
        why: q.why[language],
        shortNoun: q.shortNoun[language],
        specialCategory: q.specialCategory,
        prefill: prefillFor(q.factor, ctx, now),
    }
}

/**
 * The questions an area still has for the person: its composition's unknown
 * factors (requires first), through `questionsForArea`'s three filters, and
 * then — because "unknown to the engine" and "written by nobody" are the
 * same thing only until a column gets a value from a surface that predates
 * provenance — only the factors whose evidence is still `unknown`. Income
 * dependency (not a catalogue factor, §E) is appended for the household and
 * income areas while it is still null.
 */
export function areaQuestions(
    view: AttentionAreaView,
    ctx: LifeContext,
    provenance: FactProvenanceMap,
    language: Language,
    now: Date = new Date()
): AreaQuestionView[] {
    const asked = questionsForArea(view.area, view.unknownFactors).filter(
        (q) => q.factor === INCOME_DEPENDENCY_FACTOR || factorEvidence(q.factor, ctx, provenance) === "unknown"
    )
    const dependency = questionForFactor(INCOME_DEPENDENCY_FACTOR)
    if (
        dependency &&
        dependency.area.includes(view.area) &&
        ctx.incomeDependency === null &&
        !asked.some((q) => q.factor === INCOME_DEPENDENCY_FACTOR)
    ) {
        asked.push(dependency)
    }
    return asked.map((q) => toQuestionView(q, language, ctx, now))
}

// ── Risks ─────────────────────────────────────────────────────────────

export interface AreaRiskView {
    id: string
    name: string
    status: RiskStatus
    statusWord: string
    explanation: string
    why: string
    impact: string
    eligibilityNote: string | null
    /** The exposure exists for this person — mitigations are worth listing. */
    applicable: boolean
}

export function areaRisks(assessments: readonly RiskAssessment[], area: AttentionAreaId, language: Language, copy: AttentionCopy): AreaRiskView[] {
    const ids = AREAS[area].riskIds
    return assessments
        .filter((a) => ids.includes(a.riskId))
        .map((a) => ({
            id: a.riskId,
            name: a.name[language],
            status: a.status,
            statusWord: copy.detail.riskStatus[a.status],
            explanation: a.riskExplanation[language],
            why: a.whyItApplies[language],
            impact: a.expectedImpact[language],
            eligibilityNote: a.eligibilityNote ? a.eligibilityNote[language] : null,
            applicable: a.applicability === "applicable",
        }))
}

// ── Mitigations — «Τι μπορείτε να κάνετε» ─────────────────────────────

export interface MitigationView {
    kind: MitigationKind
    label: string
    detail: string
    riskId: string
    riskName: string
    line: string | null
}

export interface MitigationGroups {
    /** `reduce` and `avoid` — the prevention foundation. */
    prevention: MitigationView[]
    retain: MitigationView[]
    /** Worded by the surface as things to discuss or check, never a purchase. */
    transfer: MitigationView[]
}

const PREVENTION_KINDS: ReadonlySet<MitigationKind> = new Set<MitigationKind>(["reduce", "avoid"])

/** The APPLICABLE risks' catalogue mitigations, by kind, one row per distinct label. */
export function groupMitigations(assessments: readonly RiskAssessment[], area: AttentionAreaId, language: Language): MitigationGroups {
    const ids = AREAS[area].riskIds
    const groups: MitigationGroups = { prevention: [], retain: [], transfer: [] }
    const seen = new Set<string>()
    for (const a of assessments) {
        if (!ids.includes(a.riskId) || a.applicability !== "applicable") continue
        for (const m of a.mitigations as Mitigation[]) {
            const key = `${m.kind}:${m.label[language]}`
            if (seen.has(key)) continue
            seen.add(key)
            const row: MitigationView = {
                kind: m.kind,
                label: m.label[language],
                detail: m.detail[language],
                riskId: a.riskId,
                riskName: a.name[language],
                line: m.line ?? null,
            }
            if (PREVENTION_KINDS.has(m.kind)) groups.prevention.push(row)
            else if (m.kind === "retain") groups.retain.push(row)
            else groups.transfer.push(row)
        }
    }
    return groups
}

// ── Policies — «Τι λένε τα ασφαλιστήριά σας» ──────────────────────────

/** The identity and envelope a line's policy row carries — read by the page, owner-scoped. */
export interface AreaPolicyRow {
    id: string
    insurerName: string | null
    policyNumber: string | null
    lineOfBusiness: string
    status: string | null
    endDate: Date | string | null
    acordData: unknown
}

export interface AreaPolicyLineView {
    policyId: string
    /** `policyLabel` / `displayInsurerName` — never a raw column. */
    label: string
    lineLabel: string
    /** From `getPolicyStatusView` only. */
    statusWord: string
    statusTone: StatusTone
    held: boolean
    detail: ProtectionDetail
    limitsWord: string
    href: string
}

export interface AreaFindingView {
    id: string
    title: string
    severity: string
    severityLabel: string
    caveat: string | null
    policyId: string
    policyLabel: string
    onHeldPolicy: boolean
    href: string
}

export interface PreventionFromPolicyView extends Pick<PreventionAction, "id" | "kind" | "severity" | "verifiable"> {
    policyId: string
    policyLabel: string
    text: string
    recurring: boolean
    href: string
}

/** Resolve a dotted dictionary key on the server translations. */
export function copyAt(t: Translations, key: string): string {
    let node: unknown = t
    for (const part of key.split(".")) node = (node as Record<string, unknown> | undefined)?.[part]
    return typeof node === "string" ? node : key
}

export function areaPolicyLines(
    lines: readonly CoverageLine[],
    rows: ReadonlyMap<string, AreaPolicyRow>,
    t: Translations,
    language: Language,
    now: Date = new Date()
): AreaPolicyLineView[] {
    const copy = t.protection.attention.detail
    return lines.flatMap((line) => {
        const row = rows.get(line.policyId)
        if (!row) return []
        const lineLabel = normalizeBranch(row.lineOfBusiness).label[language]
        const status = getPolicyStatusView(row, t, now)
        return [
            {
                policyId: line.policyId,
                label: policyLabel(row, lineLabel),
                lineLabel,
                statusWord: status.label,
                statusTone: status.tone,
                held: line.held,
                detail: line.detail,
                limitsWord: line.detail === "analysed" ? copy.limitsRead : copy.limitsUnread,
                href: `/wallet/${line.policyId}`,
            },
        ]
    })
}

export function areaFindings(
    gaps: AttentionAreaView["protection"]["gaps"],
    rows: ReadonlyMap<string, AreaPolicyRow>,
    t: Translations,
    language: Language
): AreaFindingView[] {
    return gaps.map((gap) => {
        const row = rows.get(gap.policyId)
        const described = describeSeverity(gap.severity)
        return {
            id: gap.id,
            title: gap.title[language],
            severity: described.severity,
            severityLabel: copyAt(t, described.labelKey),
            caveat: described.caveatKey ? copyAt(t, described.caveatKey) : null,
            policyId: gap.policyId,
            policyLabel: row ? policyLabel(row, normalizeBranch(row.lineOfBusiness).label[language]) : "",
            onHeldPolicy: gap.onHeldPolicy,
            href: `/wallet/${gap.policyId}`,
        }
    })
}

/** The held, analysed policies' own conditions read back as prevention — the insurer's terms, not our advice. */
export function preventionFromPolicies(
    lines: readonly CoverageLine[],
    rows: ReadonlyMap<string, AreaPolicyRow>,
    language: Language
): PreventionFromPolicyView[] {
    const out: PreventionFromPolicyView[] = []
    for (const line of lines) {
        if (!line.held || line.detail !== "analysed") continue
        const row = rows.get(line.policyId)
        if (!row) continue
        const conditions = (row.acordData as { conditions?: unknown } | null | undefined)?.conditions
        if (!Array.isArray(conditions)) continue
        const label = policyLabel(row, normalizeBranch(row.lineOfBusiness).label[language])
        for (const action of preventionActions(conditions as Parameters<typeof preventionActions>[0])) {
            out.push({
                id: `${line.policyId}:${action.id}`,
                kind: action.kind,
                severity: action.severity,
                verifiable: action.verifiable,
                policyId: line.policyId,
                policyLabel: label,
                text: action.summary?.[language] || action.text,
                recurring: Boolean(action.recurrence),
                href: `/wallet/${line.policyId}`,
            })
        }
    }
    return out
}

// ── The detail ────────────────────────────────────────────────────────

export interface AreaDetailModel {
    area: AttentionAreaId
    label: string
    importance: PriorityImportance
    importanceWord: string
    alignment: Alignment
    alignmentWord: string
    confidence: EvidenceLevel
    confidenceWord: string
    activated: boolean
    explanation: { why: string; unknown: string; next: string; nextStep: NextStep; density: ExplanationDensity }
    /** §F: the risk explanation opens before the first question. */
    explainFirst: boolean
    risks: AreaRiskView[]
    questions: AreaQuestionView[]
    /** Factors the area still lacks in total — the `remaining_unknown` of the completed event. */
    unknownFactorCount: number
    lines: AreaPolicyLineView[]
    findings: AreaFindingView[]
    anyHeld: boolean
    /** A held line exists but no held line's limits were read. */
    limitsUnread: boolean
    deepAnalysisLocked: boolean
    mitigations: MitigationGroups
    preventionFromPolicies: PreventionFromPolicyView[]
}

export interface BuildAreaDetailInput {
    view: AttentionAreaView
    assessments: readonly RiskAssessment[]
    ctx: LifeContext
    provenance: FactProvenanceMap
    policyRows: ReadonlyMap<string, AreaPolicyRow>
    uncertaintyReasons: readonly string[]
    deepAnalysisLocked: boolean
    t: Translations
    language: Language
    now?: Date
}

export function buildAreaDetail(input: BuildAreaDetailInput): AreaDetailModel {
    const { view, assessments, ctx, provenance, policyRows, t, language } = input
    const now = input.now ?? new Date()
    const copy = t.protection.attention
    const lines = areaPolicyLines(view.protection.lines, policyRows, t, language, now)
    const held = view.protection.lines.filter((l) => l.held)
    return {
        area: view.area,
        label: view.label,
        importance: view.importance,
        importanceWord: copy.importance[view.importance],
        alignment: view.alignment,
        alignmentWord: alignmentLabel(view.alignment, language),
        confidence: view.confidence,
        confidenceWord: confidenceLabel(view.confidence, language),
        activated: view.activated,
        explanation: { ...view.explanation },
        explainFirst: input.uncertaintyReasons.includes(UNCERTAINTY_DONT_KNOW_COVERAGE),
        risks: areaRisks(assessments, view.area, language, copy),
        questions: areaQuestions(view, ctx, provenance, language, now),
        unknownFactorCount: view.unknownFactors.length,
        lines,
        findings: areaFindings(view.protection.gaps, policyRows, t, language),
        anyHeld: held.length > 0,
        limitsUnread: held.length > 0 && !held.some((l) => l.detail === "analysed"),
        deepAnalysisLocked: input.deepAnalysisLocked,
        mitigations: groupMitigations(assessments, view.area, language),
        preventionFromPolicies: preventionFromPolicies(view.protection.lines, policyRows, language),
    }
}

/** The copy the client-side question flow needs, plucked so a client component carries no dictionary. */
export function questionFlowCopy(t: Translations): AssessmentUiCopy & { title: string; lead: string; none: string; done: string; remaining: string } {
    const detail = t.protection.attention.detail
    return {
        ...t.protection.assessment.ui,
        title: detail.questionsTitle,
        lead: detail.questionsLead,
        none: detail.questionsNone,
        done: detail.questionsDone,
        remaining: detail.questionsRemaining,
    }
}
