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
 * H-009 was answered 2026-08-25: deep analysis sits on BOTH paid tiers, so the
 * gate became `tier === 'free'` and the CTA became «Ξεκλείδωμα με Plus».
 *
 * This guard still does not decide which tier owns the feature. It holds the
 * sentence to the predicate, and it reads the predicate out of the source — so
 * it survived that change by FAILING and saying "re-point this guard rather
 * than deleting it", which is what a guard should do when the thing it
 * describes moves. It now understands both gate shapes:
 *
 *   tier !== 'X'    → only X unlocks
 *   tier === 'free' → every paid tier unlocks
 *
 * and requires the CTA to name the CHEAPEST unlocking tier. Naming a dearer
 * one is not a lie, but it sells an upgrade the customer does not need.
 */
const PAGE = "app/(protected)/protection/page.tsx"
const CLIENT = "components/coverage/CoverageInsightsClient.tsx"

/** Cheapest first — the order a customer would be asked to pay in. */
const PAID_TIERS = ["plus", "pro"] as const

describe("the deep-analysis lock names the tier its gate requires", () => {
    const page = readFileSync(PAGE, "utf-8")
    const client = readFileSync(CLIENT, "utf-8")

    /** Tiers that clear the gate, derived from the gate expression itself. */
    const unlocking = (() => {
        const excl = page.match(/isDeepAnalysisLocked:\s*entitlements\.tier\s*!==\s*['"](\w+)['"]/)
        if (excl) return [excl[1]]
        const only = page.match(/isDeepAnalysisLocked:\s*entitlements\.tier\s*===\s*['"](\w+)['"]/)
        if (only) return PAID_TIERS.filter((t) => t !== only[1])
        return null
    })()

    it("finds the gate it claims to check", () => {
        expect(
            unlocking,
            `no isDeepAnalysisLocked gate found in ${PAGE} — if it moved, re-point this guard rather than deleting it`
        ).toBeTruthy()
        expect(unlocking!.length).toBeGreaterThan(0)
    })

    it("the CTA names the cheapest tier that actually unlocks it", () => {
        const cta = client.match(/notAnalyzedLockedCta:[^\n]*/)?.[0] ?? ""
        expect(cta, "notAnalyzedLockedCta not found").toContain("Unlock")

        const cheapest = PAID_TIERS.find((t) => unlocking!.includes(t))!
        expect(
            cta.toLowerCase(),
            `CTA must name "${cheapest}" — the cheapest tier clearing this gate`
        ).toContain(cheapest)

        for (const other of PAID_TIERS.filter((t) => t !== cheapest)) {
            expect(
                new RegExp(`\\b${other}\\b`, "i").test(cta),
                unlocking!.includes(other)
                    ? `CTA names "${other}", which unlocks but is dearer than "${cheapest}" — it sells an upgrade the customer does not need`
                    : `CTA names "${other}", which does NOT clear this gate — that promises an upgrade that changes nothing`
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
