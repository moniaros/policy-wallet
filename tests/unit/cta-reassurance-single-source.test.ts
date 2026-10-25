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

/**
 * PW-CONTENT-02 item 2 — the free plan's limit is stated by ONE module.
 *
 * `CTA_REASSURANCE` was the single reassurance constant, yet «Δωρεάν για 3
 * ασφαλιστήρια» was ALSO typed by hand in /product (twice, one with an English
 * twin that promised unconditional deletion), the LoB pricing band, two FAQ
 * answers and the signup form — the guard above only matched the retired
 * one-policy wording, so every one of those passed. This arm enumerates
 * app/, components/ and lib/ and bans the current wording typed anywhere but
 * `lib/marketing/limit-statement.ts`, which reads the number from the
 * entitlement source. H-020: no monthly-cap wording either.
 * Probe: tests/fixtures/guard-probes/free-limit-hand-typed.tsx.txt.
 */
// The free count is read from the entitlement source, so a typed «έως 3» / «τρία» / "up to three" is found whatever the wording.
const FREE_N = DEFAULT_ENTITLEMENT_LIMITS.free.policies
const HAND_TYPED_LIMIT = new RegExp(`Δωρεάν για \\d+ ασφαλιστήρι|Free for \\d+ polic|(?:έως|για|up to|for|με)\\s+(?:${FREE_N}|τρία|τρεις|three)\\s+(?:ασφαλιστήρι|polic)|(?:${FREE_N}|τρία|three)\\s+(?:δωρεάν|free)\\s+(?:ασφαλιστήρι|polic)|(?:includes|περιλαμβάνει|holds|χωρά)\\s+(?:${FREE_N}|τρία|three)\\s+(?:ασφαλιστήρι|polic)|μηνια[ίι]ο όριο (?:επεξεργασίας|χρήσης)|monthly usage allowance|μηνια[ίι]ο όριο επεξεργασίας|όρι[αο] επεξεργασίας|monthly (processing )?(allowance|limit)|processing (limits?|allowances?)`, "i")
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, "")).replace(/^[ \t]*\/\/.*$/gm, "")

describe("the free-plan limit is typed once, in lib/marketing/limit-statement.ts", () => {
    it("no source file hand-types it (nor a monthly-cap phrase)", () => {
        // The authenticated app (translations, protected routes) and the Terms
        // (lib/legal — out of this series) are separate backlogs: the in-app
        // «Μηνιαίο όριο επεξεργασίας AI» label is listed in RESULT.md as open.
        const offenders = globSync("{app,components,lib}/**/*.{ts,tsx}", {
            ignore: ["**/node_modules/**", "lib/marketing/limit-statement.ts", "lib/legal/**", "lib/i18n/translations/**", "app/(protected)/**", "components/admin/**"],
        })
            .flatMap((f) =>
                stripComments(readFileSync(f, "utf-8"))
                    .split("\n")
                    .flatMap((line, i) => (HAND_TYPED_LIMIT.test(line) ? [`${f}:${i + 1}  ${line.trim().slice(0, 90)}`] : []))
            )
        expect(offenders, "a free-limit promise is hand-typed; import FREE_PLAN_LIMIT:\n" + offenders.join("\n")).toEqual([])
    })

    it("probe — the hand-typed shape turns the arm red", () => {
        const probe = readFileSync("tests/fixtures/guard-probes/free-limit-hand-typed.tsx.txt", "utf-8")
        expect(HAND_TYPED_LIMIT.test(stripComments(probe))).toBe(true)
    })
})


/**
 * The deletion line (owner-approved 2026-10-22) is a SHORTER statement than the /trust
 * paragraph, so it is not a copy — but its load-bearing clause is /trust's, and the two must
 * not drift apart: both carry «δεν διαγράφονται πριν λήξει η σχετική υποχρέωση» / "are not erased
 * before … obligation ends".
 */
import { DELETION_ON_REQUEST } from "@/lib/marketing/limit-statement"
describe("the deletion line keeps /trust's retained-records clause", () => {
    const trust = readFileSync("app/(public)/trust/TrustSections.tsx", "utf-8")
    it("el", () => {
        const clause = "δεν διαγράφονται πριν λήξει η σχετική υποχρέωση"
        expect(DELETION_ON_REQUEST.el).toContain(clause)
        expect(trust).toContain(clause)
    })
    it("en", () => {
        expect(DELETION_ON_REQUEST.en).toMatch(/are not erased before .*obligation ends/)
        expect(trust).toMatch(/are not erased before .*obligation ends/)
    })
})
