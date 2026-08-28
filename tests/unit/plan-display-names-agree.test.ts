/**
 * One plan, one name — across every surface that can take the customer's money.
 *
 * PolicyWallet currently calls `ph-pro` three different things and reuses one of
 * those names for a DIFFERENT, cheaper plan:
 *
 *   | code      | plan row (admin + public pricing) | subscription-copy (/upgrade, landing, help) | UpgradeModal / CarriedPlanCard |
 *   |-----------|-----------------------------------|---------------------------------------------|--------------------------------|
 *   | ph-plus   | Plus     (€4.99)                  | Plus     (€4.99)                            | **Starter**                    |
 *   | ph-pro    | Pro      (€8.99)                  | **Family** (€8.99)                          | **Plus**                       |
 *
 * The modal renders «Συνέχεια με Plus — 8,99 €/μήνα» for `ph-pro`, while
 * `/upgrade` lists a plan actually NAMED «Plus» at €4.99. A customer who reads
 * the upgrade page and then meets the modal can believe «Plus» costs €4.99 and
 * be charged €8.99. That is not a naming preference; it is the price being
 * attached to the wrong word on the path that takes money.
 *
 * No check could see it. `money-path.spec.ts` asserts the modal's names, but it
 * had rotted (wrong session, wrong fixture owner) and Playwright is not in CI —
 * and its own comment had predicted the failure mode: "how a genuine pricing
 * contradiction elsewhere in this file stayed hidden."
 *
 * RESOLVED 2026-08-28 (owner: fix it). The canonical customer-facing pair is
 * «Plus» / «Family» — already used by the public pricing page, /upgrade, the
 * landing page and the help centre. The two dissenters now resolve through
 * `planTierName()` in `lib/subscription-copy.ts`, which is the single source.
 * The plan ROW `name` column ("Plus"/"Pro") stays as it is: it is admin-side and
 * no customer surface renders it, so no catalog write was needed — and writing
 * one would have published to the live pricing page immediately.
 *
 * This guard therefore no longer pins a violation. It enforces two things: that
 * the source of truth gives every tier a distinct name, and that nothing
 * hardcodes a tier name again.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { planTierName } from "../../lib/subscription-copy"

/** Every surface that may NOT hardcode a tier name. */
const CONSUMERS = [
    "components/monetization/UpgradeModal.tsx",
    "components/monetization/CarriedPlanCard.tsx",
]

describe("the source of truth", () => {
    it("gives every tier a distinct name, in both languages", () => {
        for (const language of ["el", "en"]) {
            const names = (["free", "plus", "pro"] as const).map((t) => planTierName(t, language))
            expect.soft(new Set(names).size, `${language}: ${names.join(" / ")}`).toBe(3)
        }
    })

    it("names ph-plus «Plus» and ph-pro «Family» — the pair the public pricing page publishes", () => {
        // If these change, they must change in public-pricing-content.ts too,
        // which is what a customer compares against before they click.
        expect(planTierName("plus", "el")).toBe("Plus")
        expect(planTierName("pro", "el")).toBe("Family")
        const pricing = readFileSync("lib/pricing/public-pricing-content.ts", "utf-8")
        expect(pricing).toContain('name: { el: "Plus", en: "Plus" }')
        expect(pricing).toContain('name: { el: "Family", en: "Family" }')
    })
})

describe("nothing hardcodes a tier name", () => {
    it("the conversion surfaces resolve through planTierName", () => {
        for (const file of CONSUMERS) {
            expect.soft(readFileSync(file, "utf-8"), file).toMatch(/planTierName\(/)
        }
    })

    it("no conversion surface contains a bare tier label", () => {
        // «Starter» was the specific literal that collided: it named ph-plus
        // here while every other surface called ph-plus «Plus», and this file's
        // «Plus» meant ph-pro. Any bare label reintroduces that class.
        const offenders: string[] = []
        for (const file of CONSUMERS) {
            const src = readFileSync(file, "utf-8")
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/(^|[^:])\/\/.*$/gm, "$1")
            for (const label of ["Starter", "Family", "Plus"]) {
                // A quoted literal, i.e. rendered copy — not an identifier.
                if (new RegExp(`["'\`][^"'\`]*\\b${label}\\b`).test(src)) {
                    offenders.push(`${file}: "${label}"`)
                }
            }
        }
        expect(
            offenders,
            `tier names must come from planTierName(), never a literal:\n  ${offenders.join("\n  ")}`
        ).toEqual([])
    })
})
