import { describe, it, expect } from "vitest"
import {
    ANALYSIS_OVERAGE_PACKAGES,
    TOKENS_PER_ANALYSIS,
} from "@/lib/billing/token-packages"
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS } from "@/lib/pricing/plan-defaults"

/**
 * An overage analysis must cost the business what an in-plan one costs.
 *
 * The B2B tiers were sized so the marketed analysis count is funded by the
 * monthly token budget at one rate. If the overage were converted at a
 * different rate, every extra analysis sold would either lose money or
 * silently deliver less work than the same analysis inside the plan — and
 * nobody would notice, because the customer sees "analyses" and the ledger
 * sees tokens.
 */
describe("analysis overage is priced at the same rate the plans fund", () => {
    const B2B = ["agent_starter", "agent_pro", "agency"] as const

    it("no paid B2B tier funds an analysis below the overage rate", () => {
        for (const tier of B2B) {
            const limits = DEFAULT_AGENT_ENTITLEMENT_LIMITS[tier]
            const analyses = limits.aiAnalysesPerMonth
            const budget = limits.monthlyTokenBudget

            expect(analyses, `${tier} must meter analyses`).toBeTypeOf("number")
            expect(budget, `${tier} must fund a budget`).toBeTypeOf("number")

            // >= not ==: the approved tiers fund at 32k/30k/30k, so the
            // overage rate is the floor. Below it, a bought analysis would be
            // smaller than an in-plan one and nothing on screen would say so.
            expect(
                budget! / analyses!,
                `${tier} funds ${budget} tokens for ${analyses} analyses ` +
                    `(${budget! / analyses!}/analysis), below the overage rate ${TOKENS_PER_ANALYSIS}`
            ).toBeGreaterThanOrEqual(TOKENS_PER_ANALYSIS)
        }
    })

    it("each package's tokens equal its analyses × the rate", () => {
        for (const [key, pkg] of Object.entries(ANALYSIS_OVERAGE_PACKAGES)) {
            expect(pkg.tokens, `${key}`).toBe(pkg.analyses * TOKENS_PER_ANALYSIS)
        }
    })

    it("the 50-pack is cheaper per analysis than buying singly", () => {
        const { single, pack50 } = ANALYSIS_OVERAGE_PACKAGES
        const singleRate = single.priceEur / single.analyses
        const packRate = pack50.priceEur / pack50.analyses
        expect(packRate, "a bulk pack that costs more per unit is not a pack").toBeLessThan(singleRate)
    })

    it("is denominated in analyses, never tokens, in customer-facing labels", () => {
        for (const [key, pkg] of Object.entries(ANALYSIS_OVERAGE_PACKAGES)) {
            for (const [locale, text] of Object.entries(pkg.label)) {
                expect(text, `${key}.${locale} must not show a token count`).not.toMatch(/token|K\b|M\b|\d{4,}/i)
            }
        }
    })
})
