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
 * WHY THIS TEST PINS THE VIOLATION RATHER THAN FAILING ON IT: which name is
 * correct is a pricing decision with three defensible answers, not a defect with
 * one. The agent that found it deliberately did not choose. The exception below
 * is dated and must be DELETED — not edited — when the owner decides; deleting
 * it turns this into the plain invariant it is written as.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

/** The display name each code-side surface gives a plan code. */
function subscriptionCopyNames(): Record<string, string> {
    const src = readFileSync("lib/subscription-copy.ts", "utf-8")
    const out: Record<string, string> = {}
    for (const key of ["plus", "pro"]) {
        // `plus: {\n  name: { el: 'X', en: 'X' },`
        const m = new RegExp(`\\n\\s{8}${key}: \\{[\\s\\S]{0,200}?name: \\{ el: '([^']+)'`).exec(src)
        if (m) out[`ph-${key}`] = m[1]
    }
    return out
}

function carriedPlanCardNames(): Record<string, string> {
    const src = readFileSync("components/monetization/CarriedPlanCard.tsx", "utf-8")
    const out: Record<string, string> = {}
    const block = /const PLAN_LABEL: Record<string, string> = \{([\s\S]*?)\}/.exec(src)
    if (block) {
        for (const m of block[1].matchAll(/"(ph-[a-z]+)":\s*"([^"]+)"/g)) out[m[1]] = m[2]
    }
    return out
}

/**
 * The modal names its two tiers in the CTA prefixes, and maps them to codes in
 * the lines above: `tierPricing("pro")` is the one it calls Plus.
 */
function upgradeModalNames(): Record<string, string> {
    const src = readFileSync("components/monetization/UpgradeModal.tsx", "utf-8")
    const out: Record<string, string> = {}
    const plus = /plusPrefix: \{ el: "[^"]*?με ([A-Za-zΆ-ώ]+)/.exec(src)
    const starter = /starterPrefix: \{ el: "[^"]*?με ([A-Za-zΆ-ώ]+)/.exec(src)
    // PLUS = tierPricing("pro"); STARTER = tierPricing("plus")
    if (plus && /const PLUS = tierPricing\("pro"\)/.test(src)) out["ph-pro"] = plus[1]
    if (starter && /const STARTER = tierPricing\("plus"\)/.test(src)) out["ph-plus"] = starter[1]
    return out
}

const SOURCES: Array<[string, Record<string, string>]> = [
    ["lib/subscription-copy.ts", subscriptionCopyNames()],
    ["components/monetization/CarriedPlanCard.tsx", carriedPlanCardNames()],
    ["components/monetization/UpgradeModal.tsx", upgradeModalNames()],
]

/**
 * KNOWN, MEASURED CONTRADICTION — 2026-08-28. Owner decision pending; see the
 * docblock. DELETE this map when the names are unified; do not extend it.
 */
const PINNED_DISAGREEMENT: Record<string, string[]> = {
    "ph-plus": ["Plus", "Starter"],
    "ph-pro": ["Family", "Plus"],
}

describe("plan display names", () => {
    it("every source was actually parsed — a silent miss would pass this file vacuously", () => {
        for (const [file, names] of SOURCES) {
            expect.soft(Object.keys(names).sort(), file).toEqual(["ph-plus", "ph-pro"])
        }
    })

    it("one plan code resolves to ONE display name across every paying surface", () => {
        const disagreements: Record<string, string[]> = {}
        for (const code of ["ph-plus", "ph-pro"]) {
            const names = [...new Set(SOURCES.map(([, m]) => m[code]).filter(Boolean))].sort()
            if (names.length > 1) disagreements[code] = names
        }
        expect(
            disagreements,
            "a plan code renders under more than one name on the purchase path — " +
                "a customer can read one price against a name and be charged another:\n" +
                JSON.stringify(disagreements, null, 2)
        ).toEqual(PINNED_DISAGREEMENT)
    })

    it("no NAME is shared by two different plan codes", () => {
        // «Plus» currently names ph-plus (€4.99) on /upgrade and ph-pro (€8.99)
        // in the modal. This is the half that actually misprices the choice.
        const collisions: Record<string, string[]> = {}
        const byName: Record<string, Set<string>> = {}
        for (const [, m] of SOURCES) {
            for (const [code, name] of Object.entries(m)) (byName[name] ??= new Set()).add(code)
        }
        for (const [name, codes] of Object.entries(byName)) {
            if (codes.size > 1) collisions[name] = [...codes].sort()
        }
        expect(collisions, `one name, two plans:\n${JSON.stringify(collisions, null, 2)}`).toEqual({
            Plus: ["ph-plus", "ph-pro"],
        })
    })
})
