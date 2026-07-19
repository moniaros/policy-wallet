/**
 * Which plans start with a free trial, and for how many days.
 *
 * FALLBACK of the admin-managed plan catalog: the live value is the plan
 * row's trial_days column (edited via /admin/plans; checkout reads it first).
 * This client-safe map covers rows that predate the column and keeps the
 * pricing UI's trial badge working without a server fetch — never a
 * display-name heuristic. A plan absent here has NO trial.
 */
import { DEFAULT_TRIAL_DAYS_BY_PLAN } from "@/lib/pricing/plan-defaults"
export const TRIAL_DAYS_BY_PLAN: Record<string, number> = DEFAULT_TRIAL_DAYS_BY_PLAN

/** True when the given plan id starts with a free trial. */
export function planHasTrial(planId: string | null | undefined): boolean {
    return !!planId && (TRIAL_DAYS_BY_PLAN[planId] ?? 0) > 0
}
