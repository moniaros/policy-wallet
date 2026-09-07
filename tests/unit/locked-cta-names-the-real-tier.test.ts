import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { canRunDeepAnalysis } from "@/lib/monetization/feature-gates"
import { DEFAULT_PLAN_FACTS } from "@/lib/pricing/plan-defaults"

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
// The locked CTA's copy moved into the bundle with the «Καλύψεις & κενά» story
// (2026-09-07): `protection.gaps.notAnalysedLocked` in both languages.
const BUNDLES = ["lib/i18n/translations/el.ts", "lib/i18n/translations/en.ts"]

/** Cheapest first — the order a customer would be asked to pay in. */
const PAID_TIERS = ["plus", "pro"] as const

describe("the deep-analysis lock names the tier its gate requires", () => {
    const page = readFileSync(PAGE, "utf-8")
    // Both languages' CTA lines, joined — the checks below read them as one.
    const client = BUNDLES.map((f) => readFileSync(f, "utf-8").match(/notAnalysedLocked:[^\n]*/)?.[0] ?? "").join("\n")

    /**
     * Tiers that clear the gate, derived from the ONE predicate every surface
     * and the orchestrator now read (Sept 2026: `canRunDeepAnalysis` in
     * lib/monetization/feature-gates.ts). The page must route its lock through
     * it — a hand-rolled `tier !== 'x'` beside it would be the second
     * definition H-009 was about.
     */
    const unlocking = (() => {
        const routed = /isDeepAnalysisLocked:\s*!canRunDeepAnalysis\(/.test(page)
        if (!routed) return null
        return PAID_TIERS.filter((t) => canRunDeepAnalysis(t))
    })()

    it("finds the gate it claims to check", () => {
        expect(
            unlocking,
            `${PAGE} must compute isDeepAnalysisLocked as !canRunDeepAnalysis(tier) — if the lock moved, re-point this guard rather than deleting it`
        ).toBeTruthy()
        expect(unlocking!.length).toBeGreaterThan(0)
    })

    it("the predicate never unlocks the free tier and unlocks at least one paid tier", () => {
        expect(canRunDeepAnalysis("free")).toBe(false)
        expect(PAID_TIERS.some((t) => canRunDeepAnalysis(t))).toBe(true)
    })

    /**
     * The CTA may name NO plan (the modal then names the one the gate
     * requires) or the CHEAPEST plan that clears the gate — by the plan's
     * display name (lib/pricing/plan-defaults.ts: plus → «Plus», pro →
     * «Family») or its code. It may never name a plan that does not clear it
     * (H-009's original defect: «Ξεκλείδωμα με Plus» over a Pro-only gate) and
     * never a dearer one than the cheapest that does.
     */
    it("the CTA names either no plan or the cheapest one that actually unlocks it", () => {
        const cta = client
        expect(cta, "notAnalysedLocked not found").toContain("Unlock")

        const cheapest = PAID_TIERS.find((t) => unlocking!.includes(t))!
        const namesOf = (t: (typeof PAID_TIERS)[number]) =>
            [t, ...DEFAULT_PLAN_FACTS.filter((p) => p.tierKey === t).map((p) => p.displayName)]
        const named = PAID_TIERS.filter((t) =>
            namesOf(t).some((n) => new RegExp(`\\b${n}\\b`, "i").test(cta))
        )

        for (const t of named) {
            expect(
                unlocking!.includes(t),
                `CTA names "${t}", which does NOT clear this gate — that promises an upgrade that changes nothing`
            ).toBe(true)
            expect(
                t,
                `CTA names "${t}", which unlocks but is dearer than "${cheapest}" — it sells an upgrade the customer does not need`
            ).toBe(cheapest)
        }
    })

    it("both languages name the same plan, or none", () => {
        const cta = client
        const mentions = (cta.match(/\b(plus|pro|family)\b/gi) ?? []).map((m) => m.toLowerCase())
        expect(new Set(mentions).size, `el and en name different plans: ${mentions.join(", ")}`).toBeLessThanOrEqual(1)
    })
})
