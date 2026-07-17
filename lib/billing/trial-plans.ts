/**
 * Which plans start with a free trial, and for how many days.
 *
 * Single source of truth, kept in a client-safe module (no server imports) so
 * both the checkout server code (`lib/billing.ts`) and pricing UI can gate the
 * "free trial" badge/CTA on the SAME data — never a display-name heuristic.
 * A plan absent here has NO trial and is charged on the first day.
 */
export const TRIAL_DAYS_BY_PLAN: Record<string, number> = {
    "ph-pro": 14,
}

/** True when the given plan id starts with a free trial. */
export function planHasTrial(planId: string | null | undefined): boolean {
    return !!planId && (TRIAL_DAYS_BY_PLAN[planId] ?? 0) > 0
}
