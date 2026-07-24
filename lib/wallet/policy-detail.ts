/**
 * Shared read model for the policy detail page.
 *
 * Plain module (NOT "use server") so the types and sync helpers are usable
 * from server pages and client components alike — sibling of
 * lib/wallet/policy-review.ts, which serves the extraction-review screen.
 * All data comes from the acordData JSON blob; every reader is defensive
 * because legacy policies predate several of these sections.
 */

import { parseDocumentDate } from "@/lib/dates/document-date"

export type Bilingual = { en: string; el: string }

export interface NotableCondition {
    conditionType: string
    summary: Bilingual
    value?: string
    deadline?: string
    userActionRequired?: boolean
}

export interface FinePrintClause {
    clause: string
    section: string
    riskLevel: "info" | "warning" | "critical"
    impactSummary: Bilingual
    relatedCoverage?: string
}

export interface PolicyPerk {
    perkType: string
    name: Bilingual
    description: Bilingual
    contactPhone?: string
    contactUrl?: string
    usageLimit?: string
    expiresWithPolicy?: boolean
    reminderRecommended?: boolean
}

export interface PolicySections {
    exclusions: string[]
    notableConditions: NotableCondition[]
    finePrintClauses: FinePrintClause[]
    perks: PolicyPerk[]
}

export interface RenewalHistoryEntry {
    id: string
    startDate: string | null
    endDate: string | null
    sourceDocumentName: string | null
}

export type PremiumFrequency = "annual" | "semiannual" | "quarterly" | "monthly" | "one_off"

const PREMIUM_FREQUENCIES: readonly PremiumFrequency[] = ["annual", "semiannual", "quarterly", "monthly", "one_off"]

const RISK_LEVELS = ["info", "warning", "critical"] as const

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : []
}

export function parsePolicyDate(value: unknown): Date | null {
    if (!value) return null
    // Document formats first (ISO, DD-MM-YYYY, Greek month phrases) — the
    // acord envelope stores extracted strings verbatim; native Date parsing
    // covers full ISO timestamps as the fallback.
    const documentParsed = parseDocumentDate(value)
    if (documentParsed) return documentParsed
    const parsed = new Date(String(value))
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatPolicyDate(value: unknown, locale: string): string {
    const parsed = parsePolicyDate(value)
    if (!parsed) return "-"
    return parsed.toLocaleDateString(locale)
}

/** Resolve a bilingual {en, el} value for the active language, falling back across languages. */
export function pickLang(value: Partial<Bilingual> | undefined | null, lang: "el" | "en"): string {
    if (!value || typeof value !== "object") return ""
    return value[lang] || value.en || value.el || ""
}

/**
 * Read the extracted narrative sections out of acordData, dropping malformed
 * items so legacy or partially-extracted policies never break the page.
 */
export function extractPolicySections(acord: unknown): PolicySections {
    const data = (acord as Record<string, unknown>) || {}

    const exclusions = asArray<unknown>(data.exclusions)
        .map((e) => (typeof e === "string" ? e.trim() : ""))
        .filter(Boolean)

    const notableConditions = asArray<NotableCondition>(data.notableConditions).filter(
        (c) => c && typeof c.conditionType === "string" && c.summary && typeof c.summary === "object"
    )

    const finePrintClauses = asArray<FinePrintClause>(data.finePrintClauses)
        .filter((f) => f && typeof f.clause === "string")
        .map((f) => ({
            ...f,
            section: typeof f.section === "string" ? f.section : "",
            riskLevel: RISK_LEVELS.includes(f.riskLevel) ? f.riskLevel : "info",
        }))

    const perks = asArray<PolicyPerk>(data.perksAndBenefits).filter(
        (p) => p && typeof p.perkType === "string" && p.name && typeof p.name === "object"
    )

    return { exclusions, notableConditions, finePrintClauses, perks }
}

/** Envelope fields that only exist inside acordData.policy (no DB columns). */
export function derivePolicyMeta(acord: unknown): {
    renewalDate: string | null
    premiumFrequency: PremiumFrequency | null
} {
    const envelope = ((acord as Record<string, unknown>)?.policy as Record<string, unknown>) || {}
    const renewalDate =
        typeof envelope.renewalDate === "string" && parsePolicyDate(envelope.renewalDate)
            ? envelope.renewalDate
            : null
    const premiumFrequency = PREMIUM_FREQUENCIES.includes(envelope.premiumFrequency as PremiumFrequency)
        ? (envelope.premiumFrequency as PremiumFrequency)
        : null
    return { renewalDate, premiumFrequency }
}

/** Past policy periods recorded by re-uploads, newest first. */
export function normalizeRenewalHistory(acord: unknown): RenewalHistoryEntry[] {
    const history = asArray<Record<string, unknown>>((acord as Record<string, unknown>)?.renewalHistory)
    return history
        .map((entry, index) => ({
            id: typeof entry?.id === "string" && entry.id ? entry.id : `renewal-${index}`,
            startDate: typeof entry?.startDate === "string" ? entry.startDate : null,
            endDate: typeof entry?.endDate === "string" ? entry.endDate : null,
            sourceDocumentName: typeof entry?.sourceDocumentName === "string" ? entry.sourceDocumentName : null,
        }))
        .sort((a, b) => (parsePolicyDate(b.endDate)?.getTime() || 0) - (parsePolicyDate(a.endDate)?.getTime() || 0))
}

/** Conditions the claims flow must surface: filing deadlines and notification duties. */
export function deriveClaimDeadlines(conditions: NotableCondition[]): NotableCondition[] {
    return conditions.filter(
        (c) => c.conditionType === "claim_deadline" || c.conditionType === "notification_obligation"
    )
}

export function hasAutoRenewal(conditions: NotableCondition[]): boolean {
    return conditions.some((c) => c.conditionType === "auto_renewal")
}

/** One reminder milestone recorded by the renewal-check cron (days before expiry + send time). */
export interface RenewalReminderMilestone {
    milestone: number
    sentAt: string
}

/** Serialized PolicyRenewal row as the detail page receives it. */
export interface PolicyRenewalEntry {
    id: string
    policyEndDate: string
    status: string
    outcome: string | null
    lastReminderAt: string | null
    remindersSent: RenewalReminderMilestone[]
}

/** remindersSent is an untyped Json column — keep only well-formed milestones. */
export function normalizeRemindersSent(value: unknown): RenewalReminderMilestone[] {
    return asArray<Record<string, unknown>>(value)
        .filter((m) => m && typeof m.milestone === "number" && typeof m.sentAt === "string")
        .map((m) => ({ milestone: m.milestone as number, sentAt: m.sentAt as string }))
}

export type PolicyHealthLevel = "good" | "moderate" | "attention"

export interface PolicyHealthScore {
    score: number
    level: PolicyHealthLevel
}

/**
 * Per-policy health signal shown in the detail-page donut.
 * (The portfolio-level ProtectionScore is a separate, user-scoped metric.)
 *
 * It used to deduct 10 points for every EXCLUSION found. Exclusions are not
 * defects — they are the boundary that defines the cover and makes the premium
 * calculable. Every policy has them; this page's own exclusions card says so in
 * as many words («Κάθε ασφαλιστήριο περιλαμβάνει εξαιρέσεις»), directly beneath
 * a donut that had just docked the policy ten points each for having them.
 *
 * The consequences ran the wrong way twice over. A carefully drafted wording
 * that enumerates twelve exclusions scored 0 — "needs attention" — while a vague
 * one listing two scored 80 and read "good": the product rewarded the worse
 * contract. And because the count comes from AI extraction, a BETTER analysis
 * lowered the score; re-running it to get more detail was punished.
 *
 * What actually reflects on a policy is whether something in it is unexpected or
 * leaves the holder exposed. The engine already decides that: open gaps, and
 * fine-print clauses the analysis rated `critical` or `warning`. Those are the
 * inputs now. Confirmed extraction still earns +5, because a verified reading is
 * genuinely worth more than an unverified one.
 */
export function calculatePolicyHealthScore(input: {
    gapCount: number
    /** Fine-print clauses rated `critical` — things that can cost the holder. */
    criticalClauseCount?: number
    /** Fine-print clauses rated `warning`. */
    warningClauseCount?: number
    verified: boolean
}): PolicyHealthScore {
    let score = 100
    score -= Math.max(0, input.gapCount) * 15
    score -= Math.max(0, input.criticalClauseCount ?? 0) * 10
    score -= Math.max(0, input.warningClauseCount ?? 0) * 4
    if (input.verified) score = Math.min(score + 5, 100)
    score = Math.max(0, Math.min(100, score))

    const level: PolicyHealthLevel = score <= 40 ? "attention" : score <= 70 ? "moderate" : "good"
    return { score, level }
}
