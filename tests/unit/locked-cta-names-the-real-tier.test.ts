import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

/**
 * A locked feature's CTA must name the plan that actually unlocks it.
 *
 * The shipped defect: `isDeepAnalysisLocked = entitlements.tier !== 'pro'`,
 * beneath a button reading «Ξεκλείδωμα με Plus» / "Unlock with Plus". Tiers are
 * free | plus | pro, so **Plus does not clear that gate**. A free customer who
 * read it, bought Plus (€4.99/mo) and came back was still locked out of the
 * thing they bought it for — a claim the code does not support, made at the
 * exact moment it induces a purchase. Separately, a paying Plus subscriber was
 * shown an upgrade prompt for a plan they already held.
 *
 * This guard does not decide WHICH tier should own the feature — that is H-009
 * and a commercial question. It only holds the sentence to the predicate: the
 * tier is read out of the gate expression in the source, so if someone changes
 * the gate the copy has to follow, and vice versa.
 */
const PAGE = "app/(protected)/protection/page.tsx"
const CLIENT = "components/coverage/CoverageInsightsClient.tsx"

describe("the deep-analysis lock names the tier its gate requires", () => {
    const page = readFileSync(PAGE, "utf-8")
    const client = readFileSync(CLIENT, "utf-8")

    /** The tier literal the gate compares against, read from the source. */
    const gateTier = page.match(/isDeepAnalysisLocked:\s*entitlements\.tier\s*!==\s*['"](\w+)['"]/)?.[1]

    it("finds the gate it claims to check", () => {
        expect(
            gateTier,
            `no isDeepAnalysisLocked gate found in ${PAGE} — if it moved, re-point this guard rather than deleting it`
        ).toBeTruthy()
    })

    it("the CTA names the gating tier, and no other paid tier", () => {
        const cta = client.match(/notAnalyzedLockedCta:[^\n]*\n?[^\n]*/)?.[0] ?? ""
        expect(cta, "notAnalyzedLockedCta not found").toContain("Unlock")

        const required = gateTier!.toLowerCase() // "pro"
        const others = ["plus", "pro"].filter((t) => t !== required)

        expect(cta.toLowerCase(), `CTA must name "${required}", the tier that clears the gate`).toContain(required)
        for (const other of others) {
            // Word-boundary: "pro" must not match inside "professional" etc.
            expect(
                new RegExp(`\\b${other}\\b`, "i").test(cta),
                `CTA names "${other}", which does NOT clear a \`tier !== '${required}'\` gate — that promises an upgrade that changes nothing`
            ).toBe(false)
        }
    })

    it("both languages say the same tier", () => {
        const cta = client.match(/notAnalyzedLockedCta:[^\n]*/)?.[0] ?? ""
        const mentions = (cta.match(/\b(plus|pro)\b/gi) ?? []).map((m) => m.toLowerCase())
        expect(mentions.length, "expected the tier named in both el and en").toBeGreaterThanOrEqual(2)
        expect(new Set(mentions).size, `el and en name different tiers: ${mentions.join(", ")}`).toBe(1)
    })
})
