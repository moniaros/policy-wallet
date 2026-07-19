/**
 * The plan catalog — single server-side read path for plan facts.
 *
 * Reads the `plans` table (admin-managed via /admin/plans), Zod-validates the
 * entitlements JSON, and merges over the code fallbacks in plan-defaults.ts.
 * Checkout, entitlement resolvers, pricing surfaces, and JSON-LD all consume
 * this module so an admin edit reaches every surface without a deploy.
 *
 * Fail-closed by design:
 * - a row whose entitlements JSON is missing/legacy/invalid resolves to the
 *   code-default limits for its tier (logged, never thrown);
 * - an unrecognized tier_key falls back to normalizeTier(name);
 * - a DB outage yields a synthetic catalog built from DEFAULT_PLAN_FACTS, so
 *   pricing pages and gating keep working on the shipped baseline.
 *
 * Cached under the "plan-catalog" tag (TTL 300s). Admin writes call
 * revalidateTag(PLAN_CATALOG_CACHE_TAG) so edits land immediately; the TTL is
 * only the backstop.
 */

import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
    AGENT_TIER_KEYS,
    B2C_TIER_KEYS,
    DEFAULT_ANNUAL_PRICE_BY_PLAN,
    DEFAULT_PLAN_FACTS,
    DEFAULT_TRIAL_DAYS_BY_PLAN,
    PLAN_ID_BY_TIER_KEY,
    defaultEntitlementsForTier,
    isAgentTierKey,
    isB2cTierKey,
    type TierKey,
} from "@/lib/pricing/plan-defaults"
import {
    AgentEntitlementLimitsSchema,
    EntitlementLimitsSchema,
} from "@/lib/pricing/entitlement-schema"
import { normalizeAgentTier, normalizeTier } from "@/lib/subscription-entitlements"
import type {
    AgentEntitlementLimits,
    EntitlementLimits,
} from "@/types/subscription-entitlements"

export const PLAN_CATALOG_CACHE_TAG = "plan-catalog"

export interface CatalogPlan {
    id: string
    planType: "policyholder" | "agent"
    tierKey: TierKey
    /** Machine tier name (Plan.name) — legacy tier routing input. */
    name: string
    displayName: string
    /** VAT-inclusive advertised monthly price (EUR). */
    monthlyEur: number
    /** Explicit annual price if set on the row (EUR, VAT-inclusive). */
    annualEur: number | null
    /** What an annual checkout actually charges: annualEur ?? default ?? 12×monthly. */
    effectiveAnnualEur: number
    trialDays: number
    isActive: boolean
    isPublic: boolean
    sortOrder: number
    version: number
    entitlements: EntitlementLimits | AgentEntitlementLimits
}

type PlanRow = {
    id: string
    planType: string
    name: string
    displayName: string
    price: unknown
    entitlements: unknown
    tierKey: string | null
    annualPrice: unknown | null
    trialDays: number
    isActive: boolean
    isPublic: boolean
    sortOrder: number
    version: number
}

/** Explicit tier_key wins when it is a KNOWN key for the row's audience;
 *  anything else (null, typo, cross-audience) falls back to name routing. */
export function resolveTierKey(
    planType: string,
    tierKey: string | null | undefined,
    name: string
): TierKey {
    if (planType === "agent") {
        return isAgentTierKey(tierKey) ? tierKey : normalizeAgentTier(name)
    }
    return isB2cTierKey(tierKey) ? tierKey : normalizeTier(name)
}

function parseEntitlements(
    planType: string,
    tierKey: TierKey,
    raw: unknown,
    planId: string
): EntitlementLimits | AgentEntitlementLimits {
    const schema = planType === "agent" ? AgentEntitlementLimitsSchema : EntitlementLimitsSchema
    const parsed = schema.safeParse(raw)
    if (parsed.success) return parsed.data
    // Legacy informational shape (pre-2026-07 rows) or a malformed edit —
    // fail closed to the shipped defaults for this tier.
    logger("info", "Plan entitlements not in canonical shape — using code defaults", {
        planId,
        tierKey,
    })
    return defaultEntitlementsForTier(tierKey)
}

function toCatalogPlan(row: PlanRow): CatalogPlan {
    const planType = row.planType === "agent" ? "agent" : "policyholder"
    const tierKey = resolveTierKey(planType, row.tierKey, row.name)
    const monthlyEur = Number(row.price)
    const annualEur = row.annualPrice == null ? null : Number(row.annualPrice)
    return {
        id: row.id,
        planType,
        tierKey,
        name: row.name,
        displayName: row.displayName,
        monthlyEur,
        annualEur,
        effectiveAnnualEur:
            annualEur ?? DEFAULT_ANNUAL_PRICE_BY_PLAN[row.id] ?? monthlyEur * 12,
        trialDays: row.trialDays ?? DEFAULT_TRIAL_DAYS_BY_PLAN[row.id] ?? 0,
        isActive: row.isActive ?? true,
        isPublic: row.isPublic ?? true,
        sortOrder: row.sortOrder ?? 0,
        version: row.version ?? 1,
        entitlements: parseEntitlements(planType, tierKey, row.entitlements, row.id),
    }
}

/** Shipped-baseline catalog for when the DB is unreachable. */
export function buildSyntheticCatalog(): CatalogPlan[] {
    return DEFAULT_PLAN_FACTS.map((f) => ({
        id: f.id,
        planType: f.planType,
        tierKey: f.tierKey,
        name: f.name,
        displayName: f.displayName,
        monthlyEur: f.monthlyEur,
        annualEur: f.annualEur,
        effectiveAnnualEur: f.annualEur ?? f.monthlyEur * 12,
        trialDays: f.trialDays,
        isActive: true,
        isPublic: true,
        sortOrder: f.sortOrder,
        version: 0,
        entitlements: defaultEntitlementsForTier(f.tierKey),
    }))
}

/** Uncached loader — exported for tests; consumers use getPlanCatalog(). */
export async function loadPlanCatalogUncached(): Promise<CatalogPlan[]> {
    try {
        const rows = await db.plan.findMany({
            orderBy: [{ planType: "asc" }, { sortOrder: "asc" }],
        })
        if (rows.length === 0) {
            logger("warn", "plans table is empty — serving the synthetic plan catalog")
            return buildSyntheticCatalog()
        }
        return rows.map((row) => toCatalogPlan(row as unknown as PlanRow))
    } catch (error) {
        logger("error", "Plan catalog load failed — serving the synthetic plan catalog", {
            error,
        })
        return buildSyntheticCatalog()
    }
}

export const getPlanCatalog = unstable_cache(
    loadPlanCatalogUncached,
    [PLAN_CATALOG_CACHE_TAG],
    { tags: [PLAN_CATALOG_CACHE_TAG], revalidate: 300 }
)

export async function getPlanById(planId: string): Promise<CatalogPlan | null> {
    const catalog = await getPlanCatalog()
    return catalog.find((p) => p.id === planId) ?? null
}

/**
 * The canonical plan for a tier: the seeded literal id when present, else the
 * lowest-sortOrder row carrying the tierKey (legacy rows like ph-premium can
 * share a tierKey with the canonical plan — they never win this selection
 * unless the canonical row is gone).
 */
export async function getCanonicalPlanForTier(tierKey: TierKey): Promise<CatalogPlan | null> {
    const catalog = await getPlanCatalog()
    const seeded = catalog.find((p) => p.id === PLAN_ID_BY_TIER_KEY[tierKey])
    if (seeded && seeded.tierKey === tierKey) return seeded
    const matching = catalog
        .filter((p) => p.tierKey === tierKey)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    return matching[0] ?? null
}

/** Plans a pricing surface may render: public AND purchasable, in order. */
export async function getVisiblePlans(
    planType: "policyholder" | "agent"
): Promise<CatalogPlan[]> {
    const catalog = await getPlanCatalog()
    return catalog
        .filter((p) => p.planType === planType && p.isPublic && p.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
}

// ── Client-facing serializable facts (PlanFactsProvider, Phase 2) ────

export interface ClientPlanFacts {
    /** Per tier key: the canonical plan's purchase facts. */
    tiers: Partial<
        Record<
            TierKey,
            { planId: string; monthlyEur: number; annualEur: number; trialDays: number }
        >
    >
    freePolicyLimit: number | null
    plusPolicyLimit: number | null
}

export async function getClientPlanFacts(): Promise<ClientPlanFacts> {
    const tiers: ClientPlanFacts["tiers"] = {}
    for (const tierKey of [...B2C_TIER_KEYS, ...AGENT_TIER_KEYS]) {
        const plan = await getCanonicalPlanForTier(tierKey)
        if (!plan) continue
        tiers[tierKey] = {
            planId: plan.id,
            monthlyEur: plan.monthlyEur,
            annualEur: plan.effectiveAnnualEur,
            trialDays: plan.trialDays,
        }
    }
    const free = await getCanonicalPlanForTier("free")
    const plus = await getCanonicalPlanForTier("plus")
    return {
        tiers,
        freePolicyLimit: (free?.entitlements as EntitlementLimits | undefined)?.policies ?? null,
        plusPolicyLimit: (plus?.entitlements as EntitlementLimits | undefined)?.policies ?? null,
    }
}
