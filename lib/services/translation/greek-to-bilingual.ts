/**
 * Greek-to-Bilingual Mapper
 *
 * Converts Greek-only AI service outputs to the bilingual LocalizedText format
 * expected by the interface types. Initially sets the English field to the Greek
 * text as a placeholder — the orchestrator later replaces with proper translations
 * via the batch translator.
 *
 * This approach allows the AI services to return the correct interface types
 * while generating Greek-only output (saving ~25-35% output tokens).
 */

import type {
    AIGapResult,
    AIPolicyClarityResponse,
    LocalizedText,
    ClaritySavingsOpportunity,
    ClarityCoverageGap,
    ClarityChecklistScore,
    ClarityPriorityAction,
    ClarityFinePrintWarning,
    ClarityHiddenPerk,
} from "../ai/ai-service.interface"

/**
 * Accepts what the schema PROMISES is a string but the model sometimes sends
 * anyway: Gemini JSON mode occasionally emits `{el, en}` objects for string
 * fields, and when the strict parse then fails, validateJsonModeObject hands
 * back the raw object — so wrapping it blindly produced DOUBLE-wrapped fields
 * (`{en: {el,en}, el: {el,en}}`). Those objects flowed into the translation
 * collector, were interpolated into the Gemini prompt as "[object Object]"
 * (to which the model answers "N/A"), and killed the cache write with
 * "Expected String, provided Object". Coerce once, here, at the boundary.
 */
export function asGreekText(value: unknown): string {
    if (typeof value === "string") return value
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>
        if (typeof record.el === "string") return record.el
        if (typeof record.en === "string") return record.en
    }
    return ""
}

function toLocalized(greekText: unknown): LocalizedText {
    const text = asGreekText(greekText)
    return { en: text, el: text }
}

/**
 * Wraps Greek-only gap results into bilingual format.
 * English field is set to Greek as placeholder.
 */
export function wrapGapResultsBilingual(
    rawResults: Array<{
        slug: string
        explanation: string
        suggestion: string
    }>
): AIGapResult[] {
    return rawResults.map((r) => ({
        slug: r.slug,
        explanation: toLocalized(r.explanation),
        suggestion: toLocalized(r.suggestion),
    }))
}

/**
 * Wraps Greek-only clarity results into bilingual format.
 * English fields are set to Greek as placeholder.
 */
export function wrapClarityResultsBilingual(raw: {
    plainLanguageSummary: string
    coverageSnapshot: AIPolicyClarityResponse["coverageSnapshot"]
    savingsOpportunities: Array<{
        action: string
        rationale: string
        estimatedAnnualSavingsEur: number | null
        confidence: number
    }>
    coverageGaps: Array<{
        slug: string
        evidence: string
        recommendation: string
    }>
    checklistScores: Array<{
        pillarKey: string
        pillarName: string
        checksPassed: number
        checksTotal: number
        successPct: number
        notes: string
    }>
    priorityActions: Array<{
        priority: "high" | "medium" | "low"
        action: string
        reason: string
    }>
    finePrintWarnings?: Array<{
        clause: string
        riskLevel: "info" | "warning" | "critical"
        impact: string
    }>
    hiddenPerks?: Array<{
        name: string
        description: string
        phone?: string
        usageFrequency?: string
    }>
    acordData?: any
    usage?: any
}): AIPolicyClarityResponse {
    return {
        plainLanguageSummary: toLocalized(raw.plainLanguageSummary),
        coverageSnapshot: raw.coverageSnapshot,
        savingsOpportunities: raw.savingsOpportunities.map((s) => ({
            action: toLocalized(s.action),
            rationale: toLocalized(s.rationale),
            estimatedAnnualSavingsEur: s.estimatedAnnualSavingsEur,
            confidence: s.confidence,
        })),
        coverageGaps: raw.coverageGaps.map((g) => ({
            slug: g.slug,
            evidence: toLocalized(g.evidence),
            recommendation: toLocalized(g.recommendation),
        })),
        checklistScores: raw.checklistScores.map((c) => ({
            pillarKey: c.pillarKey,
            pillarName: toLocalized(c.pillarName),
            checksPassed: c.checksPassed,
            checksTotal: c.checksTotal,
            successPct: c.successPct,
            notes: toLocalized(c.notes),
        })),
        priorityActions: raw.priorityActions.map((p) => ({
            priority: p.priority,
            action: toLocalized(p.action),
            reason: toLocalized(p.reason),
        })),
        finePrintWarnings: (raw.finePrintWarnings || []).map((f) => ({
            clause: toLocalized(f.clause),
            riskLevel: f.riskLevel,
            impact: toLocalized(f.impact),
        })),
        hiddenPerks: (raw.hiddenPerks || []).map((h) => ({
            name: toLocalized(h.name),
            description: toLocalized(h.description),
            phone: h.phone,
            usageFrequency: h.usageFrequency,
        })),
        acordData: raw.acordData,
        usage: raw.usage,
    }
}

/**
 * Collects all Greek texts from a bilingual clarity response that need translation.
 * Returns a flat array of strings and a rebuild function that takes the English
 * translations and returns a new response with proper bilingual fields.
 */
export function collectClarityTextsForTranslation(
    clarity: AIPolicyClarityResponse
): { texts: string[]; rebuild: (englishTexts: string[]) => AIPolicyClarityResponse } {
    const texts: string[] = []
    // Every collected value passes through asGreekText: a double-wrapped field
    // (see above) or a stored legacy shape must yield a STRING here, or the
    // batch prompt carries "[object Object]" and the cache write fails.
    const push = (value: unknown) => texts.push(asGreekText(value))

    // plainLanguageSummary
    push(clarity.plainLanguageSummary.el)

    // savingsOpportunities
    for (const s of clarity.savingsOpportunities) {
        push(s.action.el)
        push(s.rationale.el)
    }

    // coverageGaps
    for (const g of clarity.coverageGaps) {
        push(g.evidence.el)
        push(g.recommendation.el)
    }

    // checklistScores
    for (const c of clarity.checklistScores) {
        push(c.pillarName.el)
        push(c.notes.el)
    }

    // priorityActions
    for (const p of clarity.priorityActions) {
        push(p.action.el)
        push(p.reason.el)
    }

    // finePrintWarnings
    for (const f of clarity.finePrintWarnings || []) {
        push(f.clause.el)
        push(f.impact.el)
    }

    // hiddenPerks
    for (const h of clarity.hiddenPerks || []) {
        push(h.name.el)
        push(h.description.el)
    }

    function rebuild(en: string[]): AIPolicyClarityResponse {
        let i = 0
        return {
            ...clarity,
            plainLanguageSummary: { en: en[i++], el: asGreekText(clarity.plainLanguageSummary.el) },
            savingsOpportunities: clarity.savingsOpportunities.map((s) => ({
                ...s,
                action: { en: en[i++], el: asGreekText(s.action.el) },
                rationale: { en: en[i++], el: asGreekText(s.rationale.el) },
            })),
            coverageGaps: clarity.coverageGaps.map((g) => ({
                ...g,
                evidence: { en: en[i++], el: asGreekText(g.evidence.el) },
                recommendation: { en: en[i++], el: asGreekText(g.recommendation.el) },
            })),
            checklistScores: clarity.checklistScores.map((c) => ({
                ...c,
                pillarName: { en: en[i++], el: asGreekText(c.pillarName.el) },
                notes: { en: en[i++], el: asGreekText(c.notes.el) },
            })),
            priorityActions: clarity.priorityActions.map((p) => ({
                ...p,
                action: { en: en[i++], el: asGreekText(p.action.el) },
                reason: { en: en[i++], el: asGreekText(p.reason.el) },
            })),
            finePrintWarnings: (clarity.finePrintWarnings || []).map((f) => ({
                ...f,
                clause: { en: en[i++], el: asGreekText(f.clause.el) },
                impact: { en: en[i++], el: asGreekText(f.impact.el) },
            })),
            hiddenPerks: (clarity.hiddenPerks || []).map((h) => ({
                ...h,
                name: { en: en[i++], el: asGreekText(h.name.el) },
                description: { en: en[i++], el: asGreekText(h.description.el) },
            })),
        }
    }

    return { texts, rebuild }
}

/**
 * Collects all Greek texts from bilingual gap results that need translation.
 */
export function collectGapTextsForTranslation(
    gaps: AIGapResult[]
): { texts: string[]; rebuild: (englishTexts: string[]) => AIGapResult[] } {
    const texts: string[] = []

    for (const g of gaps) {
        texts.push(asGreekText(g.explanation.el))
        texts.push(asGreekText(g.suggestion.el))
    }

    function rebuild(en: string[]): AIGapResult[] {
        let i = 0
        return gaps.map((g) => ({
            ...g,
            explanation: { en: en[i++], el: asGreekText(g.explanation.el) },
            suggestion: { en: en[i++], el: asGreekText(g.suggestion.el) },
        }))
    }

    return { texts, rebuild }
}
