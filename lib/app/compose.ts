/**
 * Composing findings from what the engine already decided (§9).
 *
 * Inputs are rows the engine wrote — `GapInstance` (rule provenance) and the
 * policy's lifecycle — plus the authored sentence per rule. Outputs are typed
 * `Finding`s that the specificity gate then admits or logs. Nothing here asks
 * a model anything; nothing here invents a location:
 *
 *   document  — the policy's current document (the newest not superseded)
 *   locator   — a page + snippet ONLY when the extraction recorded one for the
 *               rule's field (`acordData.extraction.sources[field]`), else the
 *               section the rule read, with `found: false`
 *   kind      — `review` for silence operators (missing/all_missing),
 *               `gap` for explicit evidence (is_false/all_false/value_drift…)
 *   why-you   — only when the profile fact the rule rests on was ENTERED by
 *               the user (`PolicyholderProfile.answeredFields`)
 */
import { resolvePolicyLifecycle, type PolicyStatus } from "@/lib/policy-status"
import { policyLabel, policyAssetIdentifier } from "@/lib/wallet/policy-identity"
import { documentDisplayLabel } from "@/lib/wallet/document-label"
import { branchFamilyId, branchLabel } from "@/lib/insurance/taxonomy"
import { GAP_SENTENCES, SILENCE_OPERATORS } from "./gap-copy"
import { findingHash, renderableFindings, type Finding, type FindingSource, type RenderableFinding } from "./finding"
import { assignTier, MONTH_EXPIRY_DAYS } from "./tier"
import type { FindingKind } from "./state"

export interface ComposeDocument {
    id: string
    documentKind: string | null
    effectiveFrom: Date | null
    effectiveTo: Date | null
    uploadedAt: Date
    supersededById: string | null
}

export interface ComposePolicy {
    id: string
    lineOfBusiness: string
    insurerName: string | null
    policyNumber: string | null
    status: string | null
    endDate: Date | null
    acordData: unknown
    lastAnalyzedAt: Date | null
    documents: ComposeDocument[]
}

export interface ComposeGap {
    id: string
    policyId: string | null
    ruleId: string | null
    ruleInputs: unknown
    engineVersion: string | null
    definition: { slug: string; detectionLogic: unknown; lineOfBusiness: string }
}

export interface ComposeProfile {
    answeredFields: string[]
    ownsHome: boolean | null
    vehiclesCount: number | null
    dependentsCount: number | null
}

export interface ComposedPolicy {
    id: string
    lifecycle: PolicyStatus | "analyzing"
    daysUntilExpiry: number | null
    endDate: Date | null
    assetLabel: string
    family: string
    lineOfBusiness: string
    document: ComposeDocument | null
    neverAnalysed: boolean
    analysisFailed: boolean
    unresolvedFields: number
}

/** The policy's current document: the newest that nothing supersedes, schedules first. */
export function currentDocument(docs: ComposeDocument[]): ComposeDocument | null {
    const live = docs.filter((d) => !d.supersededById)
    if (live.length === 0) return null
    const rank = (d: ComposeDocument) => (d.documentKind === "policy_schedule" ? 0 : d.documentKind === "renewal_notice" ? 1 : 2)
    return [...live].sort((a, b) => rank(a) - rank(b) || (b.effectiveFrom?.getTime() ?? b.uploadedAt.getTime()) - (a.effectiveFrom?.getTime() ?? a.uploadedAt.getTime()))[0]
}

/** «Toyota Yaris · ΙΚΖ-4821» / «Κατοικία · Κηφισιά» / «Ασφαλιστήριο υγείας · Generali (123)» — never a sentinel. */
export function assetLabelFor(p: ComposePolicy, lang: "el" | "en"): string {
    const asset = policyAssetIdentifier({ lineOfBusiness: p.lineOfBusiness, acordData: p.acordData } as never)
    const branch = branchLabel(p.lineOfBusiness, lang)
    if (asset) return `${branch} · ${asset}`
    const label = policyLabel(p, "")
    return label ? `${branch} · ${label}` : branch
}

export function composePolicies(policies: ComposePolicy[], lang: "el" | "en", now: Date): ComposedPolicy[] {
    return policies
        .filter((p) => String(p.status || "").toLowerCase() !== "deleted")
        .map((p) => {
            const stored = String(p.status || "").toLowerCase()
            const lc = resolvePolicyLifecycle(p, now)
            const acord = (p.acordData ?? {}) as { processingError?: unknown; extraction?: { reviewState?: string; requiresReview?: boolean } }
            const unresolved = acord.extraction?.reviewState === "needs_review" || acord.extraction?.requiresReview === true ? 1 : 0
            return {
                id: p.id,
                lifecycle: stored === "analyzing" ? "analyzing" : lc.status,
                daysUntilExpiry: lc.daysUntilExpiry,
                endDate: lc.endDate,
                assetLabel: assetLabelFor(p, lang),
                family: branchFamilyId(p.lineOfBusiness),
                lineOfBusiness: p.lineOfBusiness,
                document: currentDocument(p.documents),
                neverAnalysed: !p.lastAnalyzedAt,
                analysisFailed: Boolean(acord.processingError),
                unresolvedFields: unresolved,
            }
        })
}

function operatorsOf(logic: unknown): string[] {
    const l = logic as { rules?: Array<{ operator?: string; fields?: string[]; field?: string }>; operator?: string } | null
    const rules = Array.isArray(l?.rules) ? l!.rules : l ? [l as { operator?: string }] : []
    return rules.map((r) => String(r.operator ?? "")).filter(Boolean)
}
function fieldsOf(logic: unknown): string[] {
    const l = logic as { rules?: Array<{ fields?: string[]; field?: string }> } | null
    const rules = Array.isArray(l?.rules) ? l!.rules : []
    return rules.flatMap((r) => (Array.isArray(r.fields) ? r.fields : r.field ? [r.field] : []))
}
function sourceFor(policy: ComposedPolicy, acordData: unknown, fields: string[], section: FindingSource["locator"] extends infer L ? (L extends { section: infer S } ? S : never) : never, lang: "el" | "en"): FindingSource | null {
    if (!policy.document) return null
    const sources = ((acordData as { extraction?: { sources?: Record<string, { page?: number; snippet?: string }> } })?.extraction?.sources) ?? {}
    const hit = fields.map((f) => sources[f]).find((s) => s && typeof s.page === "number")
    const documentLabel = documentDisplayLabel({ documentKind: policy.document.documentKind, lineOfBusiness: policy.lineOfBusiness, policyNumber: null, effectiveFrom: policy.document.effectiveFrom, effectiveTo: policy.document.effectiveTo }, lang)
    return {
        documentId: policy.document.id,
        documentLabel,
        locator: hit ? { kind: "page", page: hit.page!, ...(hit.snippet ? { snippet: hit.snippet.slice(0, 240) } : {}) } : { kind: "section", section, found: false },
    }
}

const PRIMARY_FAMILIES = new Set(["home", "motor", "health"])
const WHY_YOU: Record<string, { column: keyof ComposeProfile; key: string }> = {
    home: { column: "ownsHome", key: "app.finding.why.ownsHome" },
    motor: { column: "vehiclesCount", key: "app.finding.why.vehicles" },
    life: { column: "dependentsCount", key: "app.finding.why.dependants" },
}

/** Every finding the data supports — BEFORE the gate. */
export function composeFindings(
    composed: ComposedPolicy[],
    rawById: Map<string, ComposePolicy>,
    gaps: ComposeGap[],
    profile: ComposeProfile | null,
    lang: "el" | "en",
    log: (msg: string, meta?: Record<string, unknown>) => void = () => {}
): Finding[] {
    const out: Finding[] = []
    const byId = new Map(composed.map((p) => [p.id, p]))
    const live = composed.filter((p) => p.lifecycle !== "expired" && p.lifecycle !== "cancelled" && p.lifecycle !== "analyzing")

    // Expiries: every live policy inside the month window is a finding of kind `expiry`.
    for (const p of live) {
        if (p.daysUntilExpiry === null || p.daysUntilExpiry > MONTH_EXPIRY_DAYS || p.daysUntilExpiry < 0) continue
        const source = sourceFor(p, rawById.get(p.id)?.acordData, ["policy.expirationDate"], "schedule", lang)
        if (!source) { log("expiry finding has no document", { policyId: p.id }); continue }
        const kind: FindingKind = "expiry"
        out.push({
            id: `expiry:${p.id}`,
            hash: findingHash(p.id, "expiry", "lifecycle_expiry"),
            kind,
            tier: assignTier({ kind, daysUntilExpiry: p.daysUntilExpiry }),
            object: { policyId: p.id, assetLabel: p.assetLabel },
            sentence: { key: p.family === "motor" ? "app.finding.sentence.expiryMotor" : "app.finding.sentence.expiry", params: { asset: p.assetLabel, days: p.daysUntilExpiry, date: p.endDate ? p.endDate.toISOString().slice(0, 10) : "" } },
            source: { ...source, locator: { kind: "section", section: "schedule", found: true } },
            daysUntilExpiry: p.daysUntilExpiry,
            ruleId: "lifecycle_expiry",
        })
    }

    // Gaps and reviews: one per GapInstance on a live policy with an authored sentence.
    for (const g of gaps) {
        if (!g.policyId) { log("profile-level gap skipped — no document location", { gapId: g.id, slug: g.definition.slug }); continue }
        const p = byId.get(g.policyId)
        if (!p || !live.includes(p)) continue
        const sentence = GAP_SENTENCES[g.definition.slug]
        if (!sentence) { log("gap rule has no authored sentence — not shown", { slug: g.definition.slug }); continue }
        const ops = operatorsOf(g.definition.detectionLogic)
        const kind: FindingKind = ops.some((o) => SILENCE_OPERATORS.has(o)) && !ops.some((o) => !SILENCE_OPERATORS.has(o)) ? "review" : "gap"
        const fields = fieldsOf(g.definition.detectionLogic)
        const source = sourceFor(p, rawById.get(p.id)?.acordData, fields, sentence.section, lang)
        if (!source) { log("gap finding has no document", { gapId: g.id }); continue }
        const others = live.filter((q) => q.id !== p.id && q.family === p.family).length
        const inputs = (g.ruleInputs ?? {}) as Record<string, unknown>
        const drift = Object.entries(inputs).find(([k]) => /drift|pct|percent/i.test(k))?.[1]
        const why = WHY_YOU[p.family]
        const whyYou = why && profile && profile.answeredFields.includes(why.column) && profile[why.column] ? { key: why.key, params: { n: Number(profile[why.column]) || 0 }, profileField: why.column } : null
        out.push({
            id: `gap:${g.id}`,
            hash: findingHash(p.id, g.definition.slug, g.ruleId ?? g.definition.slug),
            kind,
            tier: assignTier({ kind, daysUntilExpiry: null, confirmedGap: kind === "gap", onPrimaryAsset: PRIMARY_FAMILIES.has(p.family), profileSupportsExposure: Boolean(whyYou), missingLimit: kind === "review" && fields.some((f) => /limit|insuredValue/i.test(f)) }),
            object: { policyId: p.id, assetLabel: p.assetLabel },
            sentence: { key: `gap:${g.definition.slug}`, params: { asset: p.assetLabel, ...(typeof drift === "number" ? { drift: Math.round(drift) } : {}) } },
            source: { ...source, ...(others > 0 ? { othersSearched: others } : {}) },
            whyYou,
            ruleId: g.ruleId ?? g.definition.slug,
            engineVersion: g.engineVersion,
        })
    }
    return out
}

/** The composed findings that pass the gate, sorted for display. */
export function composeRenderable(findings: Finding[]): RenderableFinding[] {
    return renderableFindings(findings)
}

/** Resolve a finding's sentence: authored gap sentence or a catalogue key the caller formats. */
export function gapSentenceTemplate(key: string, lang: "el" | "en"): string | null {
    if (!key.startsWith("gap:")) return null
    return GAP_SENTENCES[key.slice(4)]?.[lang] ?? null
}
