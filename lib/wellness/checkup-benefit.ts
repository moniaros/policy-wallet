import { citationKeyForAcordPath, type ExtractionSources } from "@/lib/services/ai/extraction-citations"
import { resolvePolicyLifecycle } from "@/lib/policy-status"
import { extractedField } from "@/lib/wallet/unreadable-value"

/**
 * Prevention brief P0 — what a health policy's reading says about an annual
 * check-up, and how sure we can be. The rules:
 *
 *   - «confirmed by document» needs the value AND a citation the local read of
 *     the document verified. Anything less is «needs confirmation».
 *   - An explicit `false` is only stated as «not included» with a verified
 *     citation; unverified, it too needs confirmation.
 *   - Silence is «not recorded», never «not covered».
 *   - Frequency, limits and conditions come only from a prevention perk the
 *     document itself lists; otherwise they need confirmation.
 *
 * Pure: no model call, no database.
 */
export type CheckupState = "confirmed_by_document" | "needs_confirmation" | "stated_not_included" | "not_recorded" | "expired"
export type CheckupIntent = "considering" | "later" | "not_relevant"

export interface CheckupUsage {
    status: string
    intent: string | null
    remindAt: Date | null
}

export interface CheckupBenefit {
    state: CheckupState
    citation: { page?: number; snippet?: string } | null
    /** Document-stated usage limits of prevention perks; empty = unknown. */
    conditions: string[]
    contactPhone: string | null
    contactName: string | null
    /** The blue Benefit Reminder card should render. */
    showCard: boolean
}

const PATH = "health.annualCheckupIncluded"

export function resolveCheckupBenefit(
    policy: { status?: string | null; policyNumber?: string | null; insurerName?: string | null; endDate?: Date | string | null; acordData?: unknown },
    usage: CheckupUsage | null,
    now: Date = new Date()
): CheckupBenefit {
    const acord = (policy.acordData ?? {}) as Record<string, any>
    const health = acord.health ?? {}
    const value: unknown = health.annualCheckupIncluded
    const sources = (acord.extraction?.sources ?? {}) as ExtractionSources
    const source = sources[citationKeyForAcordPath(PATH)]
    const verified = source?.verified === true

    const lifecycle = resolvePolicyLifecycle(policy, now)
    const expired = lifecycle.status === "expired"

    let state: CheckupState
    if (typeof value !== "boolean") state = "not_recorded"
    else if (expired) state = "expired"
    else if (value === true) state = verified ? "confirmed_by_document" : "needs_confirmation"
    else state = verified ? "stated_not_included" : "needs_confirmation"

    const conditions = (Array.isArray(acord.perksAndBenefits) ? acord.perksAndBenefits : [])
        .filter((perk: any) => perk?.perkType === "prevention")
        .map((perk: any) => extractedField(typeof perk.usageLimit === "string" ? perk.usageLimit : null).value)
        .filter((limit: string | null): limit is string => Boolean(limit))

    const today = new Date(now.toISOString().slice(0, 10))
    const snoozed = usage?.intent === "later" && usage.remindAt !== null && usage.remindAt > today
    const showCard =
        (state === "confirmed_by_document" || (state === "needs_confirmation" && value === true)) &&
        usage?.status !== "completed" &&
        usage?.intent !== "not_relevant" &&
        !snoozed

    return {
        state,
        citation: source && (source.snippet || source.page !== undefined) ? { page: source.page, snippet: source.snippet } : null,
        conditions,
        contactPhone: extractedField(health.coordinationCentre?.phone).value,
        contactName: extractedField(health.coordinationCentre?.name ?? health.coordinationCentreName).value,
        showCard,
    }
}


// Re-exported so callers of the benefit keep one import.
export { reminderWindow } from "@/lib/wellness/nudges"
