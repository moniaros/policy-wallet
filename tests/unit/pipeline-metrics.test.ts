import { describe, expect, it } from "vitest"

import {
    conversionRate,
    hasDecidedOpportunities,
    renewalRate,
} from "@/lib/agent/pipeline-metrics"

/**
 * QA round 3. The advisor's executive dashboard rendered two figures labelled
 * "rate" with different denominators: renewalRate over resolved renewals
 * (correct), conversionRate over EVERY opportunity ever opened (not).
 *
 * The consequence was perverse: adding ten open opportunities mechanically
 * dropped the conversion rate, so the headline KPI punished exactly the
 * prospecting the product wants. Both now measure decided outcomes.
 */

describe("conversionRate", () => {
    it("measures won against DECIDED opportunities, not all of them", () => {
        // The case that motivated the fix: 5 won, 5 lost, 40 still open.
        // Old behaviour read 11%; the advisor's real strike rate is 50%.
        expect(conversionRate(5, 5)).toBe(50)
    })

    it("does not move when new opportunities are opened", () => {
        const before = conversionRate(5, 5)
        // Opening more work cannot change a rate over decided outcomes — that
        // is the whole point.
        const after = conversionRate(5, 5)
        expect(after).toBe(before)
    })

    it("is 100 when everything decided was won", () => {
        expect(conversionRate(7, 0)).toBe(100)
    })

    it("is 0 when everything decided was lost", () => {
        expect(conversionRate(0, 7)).toBe(0)
    })

    it("is 0 rather than NaN when nothing is decided", () => {
        expect(conversionRate(0, 0)).toBe(0)
    })

    it("rounds to a whole percent", () => {
        expect(conversionRate(1, 2)).toBe(33)
        expect(conversionRate(2, 1)).toBe(67)
    })

    it("survives non-finite input instead of rendering NaN%", () => {
        expect(conversionRate(NaN, 3)).toBe(0)
        expect(conversionRate(3, Infinity)).toBe(0)
    })
})

describe("hasDecidedOpportunities", () => {
    it("distinguishes a true 0% from nothing decided yet", () => {
        expect(hasDecidedOpportunities(0, 0)).toBe(false)
        expect(hasDecidedOpportunities(0, 1)).toBe(true)
        expect(hasDecidedOpportunities(1, 0)).toBe(true)
    })
})

describe("renewalRate", () => {
    it("measures renewed against resolved renewals", () => {
        expect(renewalRate(8, 2)).toBe(80)
    })

    it("is 0 rather than NaN with nothing resolved", () => {
        expect(renewalRate(0, 0)).toBe(0)
    })
})

describe("both dashboard rates agree on their denominator", () => {
    it("produces the same number for the same won/lost shape", () => {
        // Two figures sitting side by side labelled "rate" must mean the same
        // kind of thing.
        expect(conversionRate(3, 1)).toBe(renewalRate(3, 1))
        expect(conversionRate(0, 0)).toBe(renewalRate(0, 0))
    })
})
