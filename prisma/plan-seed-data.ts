/**
 * Canonical plan rows for seeding, derived from lib/pricing/plan-defaults.ts
 * so the seed can never drift from the code fallback (parity-tested in
 * tests/unit/plan-catalog.test.ts).
 *
 * Consumed by prisma/seed.ts (dev upsert — dev DBs may clobber admin edits)
 * and scripts/gen-plan-seed-sql.ts (prod SQL — ON CONFLICT DO NOTHING, so a
 * re-run NEVER overwrites admin edits made via /admin/plans).
 */

// Relative import on purpose: this file runs under the seed's ts-node/tsx
// config where the "@/*" alias is not guaranteed.
import {
    DEFAULT_PLAN_FACTS,
    defaultEntitlementsForTier,
} from '../lib/pricing/plan-defaults'

export interface PlanSeedRow {
    id: string
    planType: 'policyholder' | 'agent'
    name: string
    displayName: string
    price: number
    billingPeriod: 'monthly'
    tierKey: string
    annualPrice: number | null
    trialDays: number
    isActive: boolean
    isPublic: boolean
    sortOrder: number
    entitlements: Record<string, unknown>
}

export const PLAN_SEED: PlanSeedRow[] = DEFAULT_PLAN_FACTS.map((f) => ({
    id: f.id,
    planType: f.planType,
    name: f.name,
    displayName: f.displayName,
    price: f.monthlyEur,
    billingPeriod: 'monthly',
    tierKey: f.tierKey,
    annualPrice: f.annualEur,
    trialDays: f.trialDays,
    isActive: true,
    isPublic: true,
    sortOrder: f.sortOrder,
    entitlements: { ...defaultEntitlementsForTier(f.tierKey) },
}))
