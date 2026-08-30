import { db } from "@/lib/db"
import { getPolicyAccess } from "@/lib/policy-access"
import { policyLabel, displayInsurerName, displayPolicyNumber, policyAssetIdentifier, displayPersonName } from "@/lib/wallet/policy-identity"
import { deriveInsuredNames } from "@/lib/wallet/insured-people"
import { extractPolicySections, formatPolicyDate, resolveCoverageAbsence, type CoverageAbsence } from "@/lib/wallet/policy-detail"
import { isAgentRole } from "@/lib/auth/require-agent"
import { resolveGlossaryHint } from "@/lib/glossary/hints"
import type { GlossaryHintData } from "@/components/insurance/GlossaryHint"
import { resolveStoredSummary } from "@/lib/wallet/summary-language"
import { documentDisplayLabel } from "@/lib/wallet/document-label"
import { extractedField } from "@/lib/wallet/unreadable-value"
import { policyState, type ProtectionState } from "./state"
import { lineOf, LINES } from "./lines"
import { loadFindingsContext } from "./home-model"
import type { RenderableFinding } from "./finding"
import type { ChecklistState } from "@/src/design-system/app/coverage-checklist"

export interface PolicyDetailModel {
    lang: "el" | "en"
    id: string
    isOwner: boolean
    canWrite: boolean
    label: string
    insurer: string | null
    number: string | null
    asset: string | null
    lineLabel: string
    /** The folded line id (lib/app/lines) — stable, for analytics payloads; never rendered. */
    lineId: string
    lineOfBusiness: string
    state: ProtectionState | null
    lifecycle: string
    daysUntilExpiry: number | null
    endDate: string | null
    premium: { amount: number; currency: string } | null
    insured: string | null
    /** The plain-language summary, only when it was written in the viewer's language (lib/wallet/summary-language). */
    summary: { text: string | null; state: "ok" | "absent" | "language_mismatch" }
    checklist: Array<{ id: string; label: string; state: ChecklistState; detail: string | null; citation: { document: string | null; page: number | null; snippet: string | null } }>
    findings: RenderableFinding[]
    questions: Array<{ id: string; kind: "cover" | "excluded" | "clause" | "deductible"; params: Record<string, string> }>
    documents: Array<{ id: string; fileName: string; mimeType: string | null; uploadedAt: string; documentKind: string | null }>
    currentDocumentLabel: string | null
    tier: "free" | "plus" | "pro"
    freeQuestionsRemaining: number | null
    /** Why there is no verdict, when there is none — never an all-clear by omission. */
    absence: CoverageAbsence
    latestRunStatus: string | null
    blockedReason: string | null
    /** `acordData.extraction.reviewState` — an unconfirmed extraction says so to whoever relies on it. */
    reviewState: string | null
    /** A connected adviser with write access confirms the extraction; the owner only reads the note. */
    canReviewExtraction: boolean
    /** «Εξαίρεση» defined inline, resolved on the server so the glossary never reaches the client bundle. */
    exclusionHint: GlossaryHintData | null
}

type CoverageItem = { name?: string; type?: string; status?: string; limit?: string; deductible?: string; description?: string; explanation?: { el?: string; en?: string } }

function checklistState(status: string | undefined): ChecklistState {
    if (status === "included" || status === "optional_taken") return "ok"
    if (status === "excluded" || status === "optional_not_taken") return "not"
    return "review"
}

/**
 * /policies/[id] (§8.4): everything on the screen is either read from the
 * document (and says which one), decided by the engine (and passed the gate),
 * or absent and said so. The access decision is `getPolicyAccess` — the one
 * path (CLAUDE.md); a viewer without read access gets null.
 */
export async function loadPolicyDetailModel(policyId: string, viewer: { id: string; roles?: string | null }, lang: "el" | "en", now: Date = new Date()): Promise<PolicyDetailModel | null> {
    const access = await getPolicyAccess(policyId, viewer)
    if (!access.canRead || !access.policy) return null
    const ownerId = access.policy.ownerUserId
    const [ctx, docs, latestRun] = await Promise.all([
        loadFindingsContext(ownerId, lang, now),
        db.policyDocument.findMany({ where: { policyId }, orderBy: { uploadedAt: "desc" }, select: { id: true, fileName: true, mimeType: true, uploadedAt: true, documentKind: true } }),
        // The latest run, with blockedReason, so the absence of a verdict is knowable (all-clear-honesty).
        db.policyAnalysisRun.findFirst({ where: { policyId }, orderBy: { createdAt: "desc" }, select: { status: true, createdAt: true, blockedReason: true } }),
    ])
    const composed = ctx.composed.find((p) => p.id === policyId)
    const raw = ctx.rawById.get(policyId)
    if (!composed || !raw) return null

    const findings = ctx.findings.filter((f) => f.object.policyId === policyId)
    const rawState = policyState({ lifecycle: composed.lifecycle, daysUntilExpiry: composed.daysUntilExpiry, findings: findings.map((f) => ({ kind: f.kind })), unresolvedFields: composed.unresolvedFields })
    // Never-read ⇒ review; and a checklist whose EVERY line is unreadable cannot
    // sit under a «Καλύπτεται» chip (the reader-pass contradiction).
    const state = composed.neverAnalysed || composed.analysisFailed ? "review" : rawState
    const acord = (raw.acordData ?? null) as Record<string, unknown> | null
    const coverages = Array.isArray(acord?.coverages) ? (acord!.coverages as CoverageItem[]) : []
    const sources = ((acord?.extraction as { sources?: Record<string, { page?: number; snippet?: string }> } | undefined)?.sources) ?? {}
    const documentLabel = composed.document ? documentDisplayLabel({ documentKind: composed.document.documentKind, lineOfBusiness: raw.lineOfBusiness, policyNumber: raw.policyNumber, effectiveFrom: composed.document.effectiveFrom, effectiveTo: composed.document.effectiveTo }, lang) : null

    const checklist = coverages
        .map((c, i) => ({ c, i, name: extractedField(typeof c?.name === "string" ? c.name : null) }))
        .filter(({ name }) => name.readable && name.value)
        .map(({ c, i, name }) => {
            const src = sources[`coverages[${i}]`] ?? sources[`coverages[${i}].status`]
            const detailField = extractedField(typeof c.explanation?.[lang] === "string" ? c.explanation[lang] : typeof c.description === "string" ? c.description : null)
            return {
                id: `cov-${i}`,
                label: name.value!,
                detail: detailField.readable && detailField.value ? detailField.value.slice(0, 220) : null,
                state: checklistState(c.status),
                citation: { document: documentLabel, page: src?.page ?? null, snippet: src?.snippet ?? null },
            }
        })

    const sections = extractPolicySections(acord)
    const questions: PolicyDetailModel["questions"] = []
    const seen = new Set<string>()
    for (const line of checklist.filter((c) => c.state !== "ok").slice(0, 3)) {
        const key = line.label.toLocaleLowerCase("el-GR")
        if (seen.has(key)) continue
        seen.add(key)
        questions.push({ id: `q-${line.id}`, kind: line.state === "not" ? "excluded" : "cover", params: { cover: line.label } })
    }
    for (const [i, clause] of sections.finePrintClauses.slice(0, 3).entries()) questions.push({ id: `q-clause-${i}`, kind: "clause", params: { clause: clause.clause } })
    const withDeductible = coverages.find((c) => c.deductible && String(c.deductible).trim() && c.name)
    if (withDeductible) questions.push({ id: "q-deductible", kind: "deductible", params: { cover: withDeductible.name!.trim() } })

    const row = ctx.policyRows.get(policyId)
    const premiumRaw = row?.premiumAmount as unknown
    const premium = premiumRaw != null && Number.isFinite(Number(premiumRaw)) && Number(premiumRaw) > 0 ? { amount: Number(premiumRaw), currency: row?.premiumCurrency ?? "EUR" } : null
    const line = lineOf(raw.lineOfBusiness)
    const lineLabels = Object.fromEntries(LINES.map((l) => [l.id, l.label[lang]]))
    const summary = resolveStoredSummary({ summary: row?.coverageSummary, acordData: acord, viewLanguage: lang })

    const tier = ctx.entitlements.tier as "free" | "plus" | "pro"
    let freeQuestionsRemaining: number | null = null
    if (access.isOwner && tier === "free") {
        const asked = await db.activityLog.count({ where: { adminUserId: viewer.id, actionType: "POLICY_QUESTION_ASKED" } })
        const { FREE_LIFETIME_QUESTIONS } = await import("@/lib/monetization/feature-gates")
        freeQuestionsRemaining = Math.max(FREE_LIFETIME_QUESTIONS - asked, 0)
    }

    const extraction = (acord?.extraction ?? null) as { reviewState?: string } | null
    const allReview = checklist.length > 0 && checklist.every((c) => c.state === "review")
    return {
        absence: resolveCoverageAbsence(latestRun?.status ?? null),
        latestRunStatus: latestRun?.status ?? null,
        blockedReason: latestRun?.blockedReason ?? null,
        reviewState: typeof extraction?.reviewState === "string" ? extraction.reviewState : null,
        canReviewExtraction: isAgentRole(viewer.roles) && access.canWrite,
        exclusionHint: resolveGlossaryHint("exairesi", lang),
        lang,
        id: policyId,
        isOwner: access.isOwner,
        canWrite: access.canWrite,
        label: policyLabel(raw, ""),
        insurer: displayInsurerName(raw.insurerName) || null,
        number: displayPolicyNumber(raw.policyNumber),
        asset: policyAssetIdentifier({ lineOfBusiness: raw.lineOfBusiness, acordData: raw.acordData }),
        lineLabel: line ? lineLabels[line] : lineLabels.business,
        lineId: line ?? "other",
        lineOfBusiness: raw.lineOfBusiness,
        state: allReview && state === "covered" ? "review" : state,
        lifecycle: composed.lifecycle,
        daysUntilExpiry: composed.daysUntilExpiry,
        endDate: composed.endDate ? formatPolicyDate(composed.endDate, lang === "el" ? "el-GR" : "en-GB") : null,
        premium,
        insured: displayPersonName(deriveInsuredNames(acord)[0], null) || null,
        summary: { text: summary.text, state: summary.state },
        checklist,
        findings,
        questions,
        documents: docs.map((d) => ({ id: d.id, fileName: documentDisplayLabel({ documentKind: d.documentKind, lineOfBusiness: raw.lineOfBusiness, policyNumber: raw.policyNumber }, lang), mimeType: d.mimeType ?? null, uploadedAt: d.uploadedAt.toISOString(), documentKind: d.documentKind ?? null })),
        currentDocumentLabel: documentLabel,
        tier,
        freeQuestionsRemaining,
    }
}
