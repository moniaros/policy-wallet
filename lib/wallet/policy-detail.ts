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

/**
 * How prominently a notable condition should sit — most consequential first.
 * The list rendered in raw extraction order, so a "you must file the claim within
 * 8 days" deadline could appear below an informational "no-claims bonus". These
 * are the policy's gotchas; the ones that DENY a claim if missed, then the ones
 * that COST money, then scope limits, then the informational benefit, belong at
 * the top where a policyholder — or a claims manager reviewing this — will see them.
 */
const CONDITION_PRIORITY: Record<string, number> = {
    claim_deadline: 0,          // miss it → claim denied
    notification_obligation: 1, // miss it → claim denied
    cancellation_penalty: 2,    // costs money to leave
    co_payment: 3,              // you pay part of every claim
    sub_limit: 4,               // a cap hidden inside the cover
    waiting_period: 5,          // cover not active yet
    age_limit: 6,               // cover ends at an age
    geographic_restriction: 7,  // where cover applies
    auto_renewal: 8,            // renews unless you act
    no_claims_bonus: 9,         // an informational benefit
}

/**
 * Order conditions by risk to the holder: anything flagged userActionRequired
 * first, then by the type ranking above. Stable within a tie (extraction order
 * preserved), pure, so it can be unit-tested without a render.
 */
export function sortNotableConditions(conditions: NotableCondition[]): NotableCondition[] {
    const rank = (c: NotableCondition) => CONDITION_PRIORITY[c.conditionType] ?? 50
    return conditions
        .map((c, i) => ({ c, i }))
        .sort((a, b) => {
            const actionA = a.c.userActionRequired ? 0 : 1
            const actionB = b.c.userActionRequired ? 0 : 1
            if (actionA !== actionB) return actionA - actionB
            const rankDelta = rank(a.c) - rank(b.c)
            if (rankDelta !== 0) return rankDelta
            return a.i - b.i
        })
        .map((entry) => entry.c)
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

    const notableConditions = sortNotableConditions(
        asArray<NotableCondition>(data.notableConditions).filter(
            (c) => c && typeof c.conditionType === "string" && c.summary && typeof c.summary === "object"
        )
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

/**
 * Why the coverage section has nothing to show, derived from the newest analysis
 * run's status. These are NOT interchangeable: each points the reader at a
 * different next step, and getting the mapping wrong misinforms them.
 *
 *  - never    → no run yet (queued/running included: nothing has produced a verdict)
 *  - failed   → the run broke; retrying, or a clearer copy, is the right move
 *  - blocked  → the run was GATED, not run: deep AI analysis is a Plus feature, or
 *               the owner has not granted AI-processing consent. It did not fail,
 *               the document is fine, and retrying reproduces the block — so the
 *               copy must point at the real unlock (upgrade / consent), never "retry".
 *  - degraded → completed_with_warnings: steps failed, sections are missing;
 *               retrying often helps because the cause is frequently transient.
 *  - empty    → a clean completed run that simply found no structured coverage;
 *               re-running the same file will most likely give the same nothing.
 */
export type CoverageAbsence = "never" | "failed" | "blocked" | "degraded" | "empty"

export function resolveCoverageAbsence(lastRunStatus: string | null | undefined): CoverageAbsence {
    if (!lastRunStatus) return "never"
    if (lastRunStatus === "blocked") return "blocked"
    if (lastRunStatus === "failed") return "failed"
    if (lastRunStatus === "completed_with_warnings") return "degraded"
    if (lastRunStatus === "completed") return "empty"
    return "never" // queued / running — nothing has produced a verdict yet
}

/** The 12 copy strings the coverage-absence card can render, keyed by i18n name. */
export interface CoverageAbsenceCopy {
    analysisNeverRun: string
    analysisNeverRunHint: string
    analysisFailedTitle: string
    analysisFailedHint: string
    analysisBlockedConsentTitle: string
    analysisBlockedConsentHint: string
    analysisBlockedUpgradeTitle: string
    analysisBlockedUpgradeHint: string
    analysisDegradedTitle: string
    analysisDegradedHint: string
    analysisFoundNothingTitle: string
    analysisFoundNothingHint: string
}

/**
 * Resolve the exact title/hint the coverage-absence card shows. Pure so the
 * mapping — especially that a `blocked` run never shows the `failed`/retry copy,
 * and splits consent vs upgrade on blockedReason — can be pinned without a render.
 */
export function resolveCoverageAbsenceCopy(
    lastRunStatus: string | null | undefined,
    blockedReason: string | null | undefined,
    copy: CoverageAbsenceCopy,
): { absence: CoverageAbsence; title: string; hint: string } {
    const absence = resolveCoverageAbsence(lastRunStatus)
    switch (absence) {
        case "never":
            return { absence, title: copy.analysisNeverRun, hint: copy.analysisNeverRunHint }
        case "failed":
            return { absence, title: copy.analysisFailedTitle, hint: copy.analysisFailedHint }
        case "blocked":
            // ai_consent_missing → the owner must consent; anything else (e.g.
            // free_tier_ai_locked) → the feature is behind Plus.
            return blockedReason === "ai_consent_missing"
                ? { absence, title: copy.analysisBlockedConsentTitle, hint: copy.analysisBlockedConsentHint }
                : { absence, title: copy.analysisBlockedUpgradeTitle, hint: copy.analysisBlockedUpgradeHint }
        case "degraded":
            return { absence, title: copy.analysisDegradedTitle, hint: copy.analysisDegradedHint }
        case "empty":
            return { absence, title: copy.analysisFoundNothingTitle, hint: copy.analysisFoundNothingHint }
    }
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
