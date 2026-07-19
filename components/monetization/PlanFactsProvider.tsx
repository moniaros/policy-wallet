"use client"

/**
 * Client-side seam for the admin-managed plan catalog.
 *
 * The protected layout fetches ClientPlanFacts server-side and mounts this
 * provider; client components (UpgradeModal, PricingComparison, meters) read
 * prices/caps through usePlanFacts(). Without a provider — or for any field
 * the catalog can't supply — the hook falls back to the code snapshots
 * (PLAN_PRICING / FREE_POLICY_LIMIT / PLUS_POLICY_LIMIT), so every consumer
 * keeps working in isolation and can never render an empty price.
 */

import { createContext, useContext, type ReactNode } from "react"
import {
    FREE_POLICY_LIMIT,
    PLAN_PRICING,
    PLUS_POLICY_LIMIT,
} from "@/lib/monetization/feature-gates"
// Type-only import: erased at compile time, so the server-only module
// (db imports) never reaches the client bundle.
import type { ClientPlanFacts } from "@/lib/pricing/plan-catalog"

const PlanFactsContext = createContext<ClientPlanFacts | null>(null)

export function PlanFactsProvider({
    facts,
    children,
}: {
    facts: ClientPlanFacts | null
    children: ReactNode
}) {
    return <PlanFactsContext.Provider value={facts}>{children}</PlanFactsContext.Provider>
}

export interface TierPurchaseFacts {
    planId: string
    monthlyEur: number
    annualEur: number
    trialDays: number
}

export function usePlanFacts() {
    const facts = useContext(PlanFactsContext)

    /** Purchase facts for a paid B2C tier — live catalog values over the
     *  PLAN_PRICING fallback, field by field. */
    const tierPricing = (tier: "plus" | "pro"): TierPurchaseFacts => {
        const fallback = PLAN_PRICING[tier]
        const live = facts?.tiers?.[tier]
        return {
            planId: live?.planId ?? fallback.planId,
            monthlyEur: live?.monthlyEur ?? fallback.monthlyEur,
            annualEur: live?.annualEur ?? fallback.annualEur,
            trialDays: live?.trialDays ?? fallback.trialDays ?? 0,
        }
    }

    return {
        facts,
        tierPricing,
        freePolicyLimit: facts?.freePolicyLimit ?? FREE_POLICY_LIMIT,
        plusPolicyLimit: facts?.plusPolicyLimit ?? PLUS_POLICY_LIMIT,
    }
}
