/**
 * Guard-probe fixture: the authentic defect's middle hop. On /dashboard/agent
 * and /customers the client component imported a tier-ordering constant from
 * lib/subscription-entitlements.ts, whose first line imported the db singleton
 * — which shipped the whole Prisma client to the browser.
 */
import { db } from "./db"

export const TIER_ORDER = ["free", "plus", "family"] as const

export function tierRank(tier: string): number {
    void db
    return TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number])
}
