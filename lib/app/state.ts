/**
 * The three-state system — the ONLY status vocabulary the B2C surface renders.
 *
 *   covered  — an in-force policy with nothing found and nothing unresolved
 *   gap      — the rules found explicit evidence that a cover is absent
 *              (an `is_false` / `all_false` rule fired), or the cover lapses
 *              within 14 days
 *   review   — the product could not tell: a `missing`-operator finding
 *              ("not recorded", never "not covered"), an unreadable value, an
 *              unknown duration, an identity the extractor could not read
 *
 * `review` is load-bearing honesty: silence in a document is not evidence of
 * absence, so it never becomes a gap. Severity (`critical|high|medium|low`)
 * remains an internal computation input and must never reach a component —
 * tests/unit/app-severity-never-rendered.test.ts enumerates the app tree.
 *
 * Expired and cancelled policies have NO state here: they are excluded from
 * every count upstream («Τα κρατάω για ιστορικό. Δεν σας καλύπτουν και δεν τα
 * μετράω πουθενά.»).
 */
import type { PolicyStatus } from "@/lib/policy-status"

export const PROTECTION_STATES = ["covered", "gap", "review"] as const
export type ProtectionState = (typeof PROTECTION_STATES)[number]

/** What a finding IS. `expiry` renders in the gap colour but is its own kind. */
export const FINDING_KINDS = ["gap", "review", "expiry"] as const
export type FindingKind = (typeof FINDING_KINDS)[number]

/** When to look — the only urgency vocabulary a user ever sees. */
export const TIERS = ["now", "month", "later"] as const
export type Tier = (typeof TIERS)[number]

/** The catalogue keys for the spoken names — copy lives in the dictionary. */
export const STATE_LABEL_KEY: Record<ProtectionState, string> = {
    covered: "app.state.covered",
    gap: "app.state.gap",
    review: "app.state.review",
}

export const TIER_LABEL_KEY: Record<Tier, { title: string; definition: string }> = {
    now: { title: "app.tier.now.title", definition: "app.tier.now.definition" },
    month: { title: "app.tier.month.title", definition: "app.tier.month.definition" },
    later: { title: "app.tier.later.title", definition: "app.tier.later.definition" },
}

/** A finding's kind mapped onto the status indicator colour it carries. */
export function kindToState(kind: FindingKind): ProtectionState {
    return kind === "review" ? "review" : "gap"
}

/** The expiry window that turns a live policy into a `gap` (§9 verdict rule). */
export const GAP_EXPIRY_DAYS = 14

export interface PolicyStateInput {
    /** From `resolvePolicyLifecycle` — never recomputed here. */
    lifecycle: PolicyStatus | "analyzing"
    /** From the same call; null when no trustworthy end date exists. */
    daysUntilExpiry: number | null
    /** Open findings attached to this policy. */
    findings: ReadonlyArray<{ kind: FindingKind }>
    /** Extracted fields the review screen still holds open (`requiresReview`). */
    unresolvedFields?: number
}

/**
 * One policy → one state, or null when the policy is not live and therefore
 * counts nowhere. Priority: gap > review > covered.
 */
export function policyState(input: PolicyStateInput): ProtectionState | null {
    const { lifecycle } = input
    if (lifecycle === "expired" || lifecycle === "cancelled" || lifecycle === "analyzing") return null

    const hasGap =
        input.findings.some((f) => f.kind === "gap") ||
        (input.daysUntilExpiry !== null && input.daysUntilExpiry <= GAP_EXPIRY_DAYS)
    if (hasGap) return "gap"

    const needsReview =
        lifecycle === "unknown_duration" ||
        lifecycle === "action_needed" ||
        (input.unresolvedFields ?? 0) > 0 ||
        input.findings.some((f) => f.kind === "review")
    if (needsReview) return "review"

    return "covered"
}

/** True when a policy is counted at all (live, whatever its state). */
export function isCountedLifecycle(lifecycle: PolicyStatus | "analyzing"): boolean {
    return lifecycle !== "expired" && lifecycle !== "cancelled" && lifecycle !== "analyzing"
}
