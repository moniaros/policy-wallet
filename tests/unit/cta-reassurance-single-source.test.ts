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
/** The matchers, hoisted so the probes below run the guard's own expressions. */
const reassuranceExports = (src: string) =>
    [...src.matchAll(/export const (CTA_REASSURANCE\w*)/g)].map((m) => m[1])
const quotedCounts = (text: string) => (text.match(/\d+/g) ?? []).map(Number)
const STALE_PROMISE = /Free for 1 policy|Δωρεάν για 1 συμβόλαιο|free plan for one policy|δωρεάν για 1 συμβόλαιο/i

describe("the free-tier reassurance has a single source", () => {
    const positioning = readFileSync("lib/marketing/positioning.ts", "utf-8")

    it("exports exactly one reassurance constant", () => {
        const exports = reassuranceExports(positioning)
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
            const digits = quotedCounts(text)
            expect(
                digits,
                `${locale} reassurance quotes ${digits.join("/")} but the free tier enforces ${enforced}`
            ).toContain(enforced)
        }
    })

    it("no page hand-types a competing free-tier promise", () => {
        // The literal shapes that used to be copy-pasted across the marketing site.
        const offenders = globSync("{app,components,lib}/**/*.{ts,tsx}", { ignore: "**/node_modules/**" })
            .filter((f) => STALE_PROMISE.test(readFileSync(f, "utf-8")))

        expect(
            offenders,
            "These still promise the old one-policy free tier:\n  " + offenders.join("\n  ")
        ).toEqual([])
    })
})

/**
 * PROBES — the matchers proven red against the drift that actually happened:
 * the second export (`CTA_REASSURANCE_SHORT`) that let the promise fork, and
 * the hand-typed one-policy promise the pricing v2 change had to hunt down.
 */
describe("the matchers are proven against the pre-fix shapes", () => {
    it("detects the second export that split the promise last time", () => {
        const preFix = `
export const CTA_REASSURANCE = { el: "…", en: "…" }
export const CTA_REASSURANCE_SHORT = { el: "…", en: "…" }
`
        expect(reassuranceExports(preFix)).toEqual(["CTA_REASSURANCE", "CTA_REASSURANCE_SHORT"])
        expect(reassuranceExports(preFix)).not.toEqual(["CTA_REASSURANCE"])
    })

    it("detects a reassurance quoting a count the code does not enforce", () => {
        const enforced = DEFAULT_ENTITLEMENT_LIMITS.free.policies
        expect(enforced, "the free tier must enforce a finite policy count").toBeTypeOf("number")
        if (typeof enforced !== "number") return // narrowed for tsc; unreachable
        const wrong = `Δωρεάν για ${enforced + 1} συμβόλαια`
        expect(quotedCounts(wrong)).not.toContain(enforced)
        // …and the true count passes, so the check discriminates.
        expect(quotedCounts(`Δωρεάν για ${enforced} συμβόλαια`)).toContain(enforced)
    })

    it("detects the hand-typed stale promise in both languages", () => {
        expect(STALE_PROMISE.test('<p>Free for 1 policy — forever.</p>')).toBe(true)
        expect(STALE_PROMISE.test('<p>Δωρεάν για 1 συμβόλαιο</p>')).toBe(true)
        expect(STALE_PROMISE.test('<p>{CTA_REASSURANCE[locale]}</p>')).toBe(false)
    })
})
