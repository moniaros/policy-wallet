/**
 * The verdict — counts of documents, never a judgement of the person (§9).
 *
 *   covered — active policies with no gap and nothing under review
 *   gap     — policies where a gap was found, or expiring within 14 days
 *   review  — policies with at least one unresolved field or review finding
 *
 * The three sum to the active policies; expired ones are excluded from all
 * three. The quiet state («Δεν χρειάζεται να κάνετε τίποτα σήμερα») requires
 * MORE than "nothing found": no `now` findings, no expiry within 30 days, AND a
 * check that actually covered the wallet — nothing unanalysed, nothing whose
 * reading failed. Absence of a detected problem is not evidence of no problem.
 *
 * `notChecked` states what the plan did NOT run (A-13): on Free/Plus, gap
 * detection is a Family capability, and the verdict says so rather than
 * rendering a silent all-clear.
 */
import type { PolicyStatus } from "@/lib/policy-status"
import { policyState, type FindingKind, type ProtectionState, type Tier } from "./state"

export const QUIET_EXPIRY_DAYS = 30

export interface VerdictPolicy {
    id: string
    lifecycle: PolicyStatus | "analyzing"
    daysUntilExpiry: number | null
    /** No lastAnalyzedAt — the engine has never read the document. */
    neverAnalysed: boolean
    /** Latest analysis failed. */
    analysisFailed: boolean
    unresolvedFields?: number
}

export interface VerdictFinding {
    policyId: string | null
    kind: FindingKind
    tier: Tier
    daysUntilExpiry?: number | null
}

export interface VerdictEntitlements {
    /** 0 on Free and Plus, null (unlimited) on Family — from DEFAULT_ENTITLEMENT_LIMITS. */
    gapAnalysisPerDay: number | null
}

export type NotCheckedReason = "gap_detection_not_in_plan" | "policies_not_analysed" | "readings_failed"

export interface Verdict {
    counts: Record<ProtectionState, number>
    active: number
    expired: number
    quiet: boolean
    /** Soonest expiry among live policies, in days; null when none has a date. */
    nextExpiryDays: number | null
    nextExpiryPolicyId: string | null
    nowCount: number
    notChecked: NotCheckedReason[]
    perPolicy: Record<string, ProtectionState>
}

export function computeVerdict(
    policies: readonly VerdictPolicy[],
    findings: readonly VerdictFinding[],
    entitlements: VerdictEntitlements
): Verdict {
    const counts: Record<ProtectionState, number> = { covered: 0, gap: 0, review: 0 }
    const perPolicy: Record<string, ProtectionState> = {}
    let expired = 0
    let nextExpiryDays: number | null = null
    let nextExpiryPolicyId: string | null = null

    for (const p of policies) {
        if (p.lifecycle === "expired") {
            expired += 1
            continue
        }
        const own = findings.filter((f) => f.policyId === p.id)
        const state = policyState({
            lifecycle: p.lifecycle,
            daysUntilExpiry: p.daysUntilExpiry,
            findings: own,
            unresolvedFields: p.unresolvedFields,
        })
        if (!state) continue
        counts[state] += 1
        perPolicy[p.id] = state
        if (p.daysUntilExpiry !== null && p.daysUntilExpiry >= 0) {
            if (nextExpiryDays === null || p.daysUntilExpiry < nextExpiryDays) {
                nextExpiryDays = p.daysUntilExpiry
                nextExpiryPolicyId = p.id
            }
        }
    }

    const active = counts.covered + counts.gap + counts.review
    const nowCount = findings.filter((f) => f.tier === "now").length

    const notChecked: NotCheckedReason[] = []
    if (entitlements.gapAnalysisPerDay === 0) notChecked.push("gap_detection_not_in_plan")
    const live = policies.filter((p) => p.lifecycle !== "expired" && p.lifecycle !== "cancelled")
    if (live.some((p) => p.neverAnalysed)) notChecked.push("policies_not_analysed")
    if (live.some((p) => p.analysisFailed)) notChecked.push("readings_failed")

    const quiet =
        active > 0 &&
        nowCount === 0 &&
        (nextExpiryDays === null || nextExpiryDays > QUIET_EXPIRY_DAYS) &&
        !notChecked.includes("policies_not_analysed") &&
        !notChecked.includes("readings_failed")

    return { counts, active, expired, quiet, nextExpiryDays, nextExpiryPolicyId, nowCount, notChecked, perPolicy }
}
