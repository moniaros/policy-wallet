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

export type CheckupDetailKey = "frequency" | "limitAmount" | "tests" | "network" | "waitingPeriodDays" | "conditions"

/** One term of the check-up, as the document states it, with its own evidence. */
export interface CheckupDetail {
    key: CheckupDetailKey
    value: string | number | string[]
    /** The term's own citation was found in the locally read document. */
    verified: boolean
    page?: number
}

export interface CheckupBenefit {
    state: CheckupState
    citation: { page?: number; snippet?: string } | null
    /** The check-up's terms from `health.checkup` — only what the document states. */
    details: CheckupDetail[]
    /** Frequency and cap are the two terms a person needs first; true when either is unstated. */
    coreTermsMissing: boolean
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

    const details = checkupDetails(health.checkup, sources)
    const has = (k: CheckupDetailKey) => details.some((d) => d.key === k)
    const coreTermsMissing = !has("frequency") || !has("limitAmount")

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
        details,
        coreTermsMissing,
        conditions,
        contactPhone: extractedField(health.coordinationCentre?.phone).value,
        contactName: extractedField(health.coordinationCentre?.name ?? health.coordinationCentreName).value,
        showCard,
    }
}

/**
 * The usage row that speaks for a policy in `year`: that year's, else last
 * year's while the reminder the person picked is still pending — a date chosen
 * in November for February must not vanish on 1 January. A reminder that has
 * already been sent reads as no date at all, so the card offers the choices
 * again instead of promising a reminder on a day that has passed.
 */
export function pickCheckupUsage(
    rows: Array<{ policyKey: string; year: number; status: string; intent: string | null; remindAt: Date | null; remindedAt: Date | null }>,
    policyId: string,
    year: number
): CheckupUsage | null {
    const row =
        rows.find((r) => r.policyKey === policyId && r.year === year) ??
        rows.find((r) => r.policyKey === policyId && r.year === year - 1 && r.remindAt !== null && r.remindedAt === null)
    if (!row) return null
    return { status: row.status, intent: row.intent, remindAt: row.remindedAt ? null : row.remindAt }
}

const DETAIL_ORDER: CheckupDetailKey[] = ["frequency", "limitAmount", "tests", "network", "waitingPeriodDays", "conditions"]

/**
 * `health.checkup` as a list of stated terms. Masked or empty values are
 * dropped (an unreadable «XXXX» is not a term), numbers must be positive and
 * finite, lists keep only readable entries.
 */
export function checkupDetails(raw: unknown, sources: ExtractionSources): CheckupDetail[] {
    const checkup = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
    const out: CheckupDetail[] = []
    for (const key of DETAIL_ORDER) {
        const v = checkup[key]
        let value: CheckupDetail["value"] | null = null
        if (typeof v === "number") value = Number.isFinite(v) && v > 0 ? v : null
        else if (typeof v === "string") value = extractedField(v).value
        else if (Array.isArray(v)) {
            const items = v.map((x) => (typeof x === "string" ? extractedField(x).value : null)).filter((x): x is string => Boolean(x))
            value = items.length ? items : null
        }
        if (value === null) continue
        const source = sources[citationKeyForAcordPath(`health.checkup.${key}`)]
        out.push({ key, value, verified: source?.verified === true, ...(source?.page !== undefined ? { page: source.page } : {}) })
    }
    return out
}

// Re-exported so callers of the benefit keep one import.
export { reminderWindow } from "@/lib/wellness/nudges"
