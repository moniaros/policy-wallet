import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"

import { CTA_REASSURANCE } from "@/lib/marketing/positioning"
import { DEFAULT_ENTITLEMENT_LIMITS } from "@/lib/pricing/plan-defaults"

/**
 * One free-tier promise, in one place.
 *
 * There used to be two exports — `CTA_REASSURANCE` and `CTA_REASSURANCE_SHORT`
 * — carrying the same promise at different lengths. Sixteen product pages
 * rendered one and the landing page rendered the other, so the free tier was
 * stated twice and could drift in half the places at once. It did: the pricing
 * v2 change had to find both.
 */
describe("the free-tier reassurance has a single source", () => {
    const positioning = readFileSync("lib/marketing/positioning.ts", "utf-8")

    it("exports exactly one reassurance constant", () => {
        const exports = [...positioning.matchAll(/export const (CTA_REASSURANCE\w*)/g)].map((m) => m[1])
        expect(
            exports,
            "A second reassurance export is how the promise drifted last time. " +
                "If a page needs a shorter line, shorten the one string."
        ).toEqual(["CTA_REASSURANCE"])
    })

    it("quotes the policy count the code actually enforces", () => {
        const enforced = DEFAULT_ENTITLEMENT_LIMITS.free.policies
        expect(enforced, "the free tier must enforce a finite policy count").toBeTypeOf("number")

        for (const [locale, text] of Object.entries(CTA_REASSURANCE)) {
            const digits = (text.match(/\d+/g) ?? []).map(Number)
            expect(
                digits,
                `${locale} reassurance quotes ${digits.join("/")} but the free tier enforces ${enforced}`
            ).toContain(enforced)
        }
    })

    it("no page hand-types a competing free-tier promise", () => {
        // The literal shapes that used to be copy-pasted across the marketing site.
        const stale = /Free for 1 policy|Δωρεάν για 1 συμβόλαιο|free plan for one policy|δωρεάν για 1 συμβόλαιο/i
        const offenders = globSync("{app,components,lib}/**/*.{ts,tsx}", { ignore: "**/node_modules/**" })
            .filter((f) => stale.test(readFileSync(f, "utf-8")))

        expect(
            offenders,
            "These still promise the old one-policy free tier:\n  " + offenders.join("\n  ")
        ).toEqual([])
    })
})
