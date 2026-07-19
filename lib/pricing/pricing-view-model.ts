/**
 * Builds the public pricing view from the admin-managed plan catalog.
 *
 * lib/pricing/public-pricing-content.ts is the bilingual TEMPLATE (prose,
 * feature bullets, FAQ — reviewable in git); the € amounts on the cards are
 * populated here from CatalogPlan rows so an /admin/plans price edit reaches
 * the public page, its JSON-LD, /for-agents, and /agent/pricing without a
 * deploy. Plans whose catalog row is not public are dropped from the view.
 *
 * Savings copy: while a plan's catalog prices equal the template defaults the
 * template's hand-written savings prose is kept verbatim; once an admin
 * changes a price the savings are recomputed as "~€N" so the claim can never
 * go stale.
 */

import type { CatalogPlan } from "@/lib/pricing/plan-catalog"
import {
    publicPricingContent,
    type LocalizedText,
    type PricingAudience,
    type PublicPricingAudienceContent,
    type PublicPricingPlan,
} from "@/lib/pricing/public-pricing-content"

/** "€7.99" / "€29" — integers render without decimals, like the hand-written copy. */
export function formatEur(value: number): string {
    return `€${Number.isInteger(value) ? value : value.toFixed(2)}`
}

function parseEur(amount: string): number {
    return Number(amount.replace(/[^0-9.]/g, ""))
}

/** Template plans without a checkoutPlanId still map to a catalog row. */
const PLAN_ID_BY_TEMPLATE_KEY: Record<string, string> = {
    free: "ph-free",
    "agent-free": "agent-free",
}

function computedSavings(cat: CatalogPlan): LocalizedText | null {
    const saved = Math.round(cat.monthlyEur * 12 - cat.effectiveAnnualEur)
    if (saved <= 0) return null
    return { el: `Εξοικονομείτε ~€${saved}`, en: `Save ~€${saved}` }
}

function buildPlan(plan: PublicPricingPlan, cat: CatalogPlan | undefined): PublicPricingPlan | null {
    if (!cat) return plan // no catalog row — render the template as-is (fallback)
    if (!cat.isPublic) return null

    const monthlyUnchanged = parseEur(plan.pricing.monthly.amount) === cat.monthlyEur
    const monthly = { ...plan.pricing.monthly, amount: formatEur(cat.monthlyEur) }

    let annual = plan.pricing.annual
    if (annual) {
        const annualUnchanged = parseEur(annual.amount) === cat.effectiveAnnualEur
        const savings =
            monthlyUnchanged && annualUnchanged
                ? annual.savings
                : (computedSavings(cat) ?? annual.savings)
        annual = { ...annual, amount: formatEur(cat.effectiveAnnualEur), savings }
    }

    return { ...plan, pricing: { monthly, ...(annual ? { annual } : {}) } }
}

export function buildPublicPricingContent(
    catalog: CatalogPlan[]
): Record<PricingAudience, PublicPricingAudienceContent> {
    const byId = new Map(catalog.map((p) => [p.id, p]))
    const build = (audience: PricingAudience): PublicPricingAudienceContent => {
        const template = publicPricingContent[audience]
        const plans = template.plans
            .map((plan) => {
                const planId = plan.checkoutPlanId ?? PLAN_ID_BY_TEMPLATE_KEY[plan.key]
                return buildPlan(plan, planId ? byId.get(planId) : undefined)
            })
            .filter((plan): plan is PublicPricingPlan => plan != null)
        return { ...template, plans }
    }
    return { policyholder: build("policyholder"), agent: build("agent") }
}
