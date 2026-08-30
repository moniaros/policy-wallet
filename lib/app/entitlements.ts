/**
 * Plan facts, re-exported from their single sources — no literal lives here.
 * Tier keys are `free | plus | pro` (display «Free / Plus / Family» via
 * planTierName). Never introduce a `family` key.
 */
import { DEFAULT_ENTITLEMENT_LIMITS } from "@/lib/pricing/plan-defaults"
import { planTierName } from "@/lib/subscription-copy"

export { DEFAULT_ENTITLEMENT_LIMITS, planTierName }
/** `free | plus | pro` — the keys of the single source, never restated. */
export type PlanTier = keyof typeof DEFAULT_ENTITLEMENT_LIMITS

export type CheckKey = "gap_detection"

/** What the plan does NOT run — stated plainly on the verdict (A-13). */
export function checksNotInPlan(tier: PlanTier): CheckKey[] {
    const limits = DEFAULT_ENTITLEMENT_LIMITS[tier]
    const out: CheckKey[] = []
    if (limits.gapAnalysisPerDay === 0) out.push("gap_detection")
    return out
}

/** The lowest tier that runs a given check — for the transparent «περιλαμβάνεται στο …» line. */
export function tierThatRuns(check: CheckKey): PlanTier | null {
    const order: PlanTier[] = ["free", "plus", "pro"]
    for (const t of order) if (!checksNotInPlan(t).includes(check)) return t
    return null
}
