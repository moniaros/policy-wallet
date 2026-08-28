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
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { planTierName } from "../../lib/subscription-copy"

/**
 * The universe is ENUMERATED, not listed.
 *
 * The first version of this guard named two files. `PlanBadge.tsx` held a third
 * copy — `plus: "Starter", pro: "Plus"` — and was invisible to it, which is the
 * exact failure this repo keeps re-learning: a guard scoped to known locations
 * guards those locations, not the invariant.
 *
 * So: every component under `components/monetization/` plus the plan-facing
 * shell and account surfaces is scanned for a tier LABEL MAP — an object whose
 * keys are the code tiers and whose values are quoted names.
 */
function tsxFilesUnder(dirs: string[]): string[] {
    const out: string[] = []
    const walk = (dir: string) => {
        let entries
        try {
            entries = readdirSync(dir, { withFileTypes: true })
        } catch {
            return
        }
        for (const e of entries) {
            const full = join(dir, e.name)
            if (e.isDirectory()) walk(full)
            else if (/\.tsx?$/.test(e.name) && !e.name.includes(".test.")) out.push(full)
        }
    }
    dirs.forEach(walk)
    return out
}

const CONSUMERS = tsxFilesUnder([
    "components/monetization",
    "components/account",
    "components/shell",
])

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
    it("the scan actually sees the monetization tree", () => {
        expect(CONSUMERS.length).toBeGreaterThan(10)
    })

    it("no conversion surface contains a bare tier label", () => {
        // «Starter» was the specific literal that collided: it named ph-plus
        // here while every other surface called ph-plus «Plus», and this file's
        // «Plus» meant ph-pro. Any bare label reintroduces that class.
        const offenders: string[] = []
        // A tier LABEL MAP: `plus: "Something"` / `"ph-pro": "Something"`.
        // Matching only this shape keeps prose and aria-labels out of scope
        // while catching every place a name is assigned to a tier.
        const LABEL_MAP = /["']?(?:ph-)?(?:free|plus|pro)["']?\s*:\s*["'`](Free|Starter|Plus|Family|Δωρεάν)["'`]/
        for (const file of CONSUMERS) {
            const src = readFileSync(file, "utf-8")
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/(^|[^:])\/\/.*$/gm, "$1")
            const m = LABEL_MAP.exec(src)
            if (m) offenders.push(`${file}: ${m[0].trim()}`)
        }
        expect(
            offenders,
            `tier names must come from planTierName(), never a literal:\n  ${offenders.join("\n  ")}`
        ).toEqual([])
    })
})
