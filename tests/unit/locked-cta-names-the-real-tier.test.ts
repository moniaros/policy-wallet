import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { DEFAULT_ENTITLEMENT_LIMITS, tierThatRuns } from "@/lib/app/entitlements"

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
// Grafí G8: the gate no longer lives on a page. The single source is
// plan-defaults (`gapAnalysisPerDay` 0 = the plan does not run gap detection);
// lib/app/entitlements.ts derives the cheapest tier that does (`tierThatRuns`)
// and /see names it through `planTierName`, never as a literal.
const CLIENT = "components/coverage/CoverageInsightsClient.tsx"
const SEE_MODEL = "lib/app/see-model.ts"
const SEE_SCREEN = "app/(protected)/see/SeeScreen.tsx"
const PAID_TIERS = ["plus", "pro"] as const

describe("the deep-analysis lock names the tier its gate requires", () => {
    const client = readFileSync(CLIENT, "utf-8")
    const unlocking = PAID_TIERS.filter((t) => DEFAULT_ENTITLEMENT_LIMITS[t].gapAnalysisPerDay !== 0)

    it("finds the gate it claims to check", () => {
        expect(unlocking.length).toBeGreaterThan(0)
        expect(tierThatRuns("gap_detection")).toBe(unlocking[0])
        expect(readFileSync(SEE_MODEL, "utf-8")).toMatch(/gapDetectionTier: tierThatRuns\("gap_detection"\)/)
    })

    it("/see names the plan through planTierName from the same source — never a literal tier name in the copy", () => {
        expect(readFileSync(SEE_SCREEN, "utf-8")).toMatch(/planTierName\(model\.gapDetectionTier, lang\)/)
        for (const lang of ["el", "en"]) {
            const dict = readFileSync(`lib/i18n/translations/app/${lang}.ts`, "utf-8")
            const line = dict.match(/see: \{[\s\S]*?\n\s*notChecked: [^\n]*/)?.[0].split("\n").pop() ?? ""
            expect(line, `${lang}: app.see.notChecked missing`).toBeTruthy()
            expect(line).toContain("{plan}")
            expect(/\b(Plus|Family|Pro)\b/.test(line), `${lang}: the plan name must come from planTierName, not the copy`).toBe(false)
        }
    })

    it("the retired legacy client is not mounted by any route (A-25) — its CTA is no longer a surface", () => {
        expect(client).toContain("notAnalyzedLockedCta")
        const pages = readFileSync("app/(protected)/protection/page.tsx", "utf-8")
        expect(pages).not.toContain("CoverageInsightsClient")
    })
})
