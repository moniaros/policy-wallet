import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

import { globSync } from "../helpers/glob"
import { canRunDeepAnalysis, FEATURE_GATES, tierUnlocks } from "@/lib/monetization/feature-gates"

/**
 * ONE predicate decides whether a B2C tier may run the deep analysis:
 * `canRunDeepAnalysis(tier)` (lib/monetization/feature-gates.ts). The three
 * server gates call it; the locked-state displays call it. Nothing compares
 * `tier` to a literal to answer that question — until Sept 2026 the gates
 * said `tier !== "pro"` and the displays said `tier === "free"`, and Starter
 * was shown an unlocked analysis a server would refuse.
 *
 * The universe is enumerated from disk: every `tier` ↔ literal comparison
 * under app/ and lib/. Each must be allow-listed BY FILE with the reason it
 * is not the analysis gate (a plan display name, a checkout mapping, the
 * free-tier report unlock, …). An entry the file no longer matches is
 * tolerated so the display owners can migrate without touching this file;
 * a comparison with no entry fails. The scanner is proven against committed
 * probes.
 */

const GATES = [
    "lib/services/analysis/policy-analysis-orchestrator.service.ts",
    "app/onboarding/actions.ts",
    "lib/services/policy.service.ts",
]

/** `tier !== "pro"`, `'free' === x.tier`, `tier == "plus"` … on one line. */
const COMPARISON = /(?:\btier\s*(?:!==|===|==|!=)\s*['"](?:free|plus|pro)['"])|(?:['"](?:free|plus|pro)['"]\s*(?:!==|===|==|!=)\s*[\w$.]*\btier\b)/g

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
}

export function tierComparisons(src: string): string[] {
    return [...stripComments(src).matchAll(COMPARISON)].map((m) => m[0].replace(/\s+/g, " "))
}

/**
 * Comparisons that are NOT the deep-analysis gate, by file, with the reason.
 * `snippet` is matched as a substring of the normalised comparison.
 */
const ALLOWED: Array<{ file: string; snippet: string; reason: string }> = [
    { file: "app/(protected)/admin/partners/[vendorId]/page.tsx", snippet: 'tier === "pro"', reason: "partner-offer tier checkbox default" },
    { file: "app/(protected)/dashboard/PolicyholderHome.tsx", snippet: 'tier === "free"', reason: "dashboard upsell band — free-only copy, not the analysis gate" },
    { file: "app/(protected)/protection/areas/[area]/page.tsx", snippet: 'tier === "free"', reason: "display lock; its owner is migrating it to canRunDeepAnalysis — delete this entry when the match disappears" },
    { file: "app/(protected)/protection/page.tsx", snippet: "tier === 'free'", reason: "display lock; its owner is migrating it to canRunDeepAnalysis — delete this entry when the match disappears" },
    { file: "app/(protected)/protection/page.tsx", snippet: 'tier === "free"', reason: "free-only recommendation teaser band" },
    { file: "app/(protected)/wallet/[id]/page.tsx", snippet: 'tier === "free"', reason: "the free tier's one trial analysis — a free-only allowance, not the tier ladder" },
    { file: "app/(protected)/wallet/[id]/AnalysisCard.tsx", snippet: 'tier === "free"', reason: "trial-analysis card (free-only allowance)" },
    { file: "app/api/v1/policies/[id]/report-unlock/route.ts", snippet: 'tier !== "free"', reason: "€3 report unlock exists for the free tier only" },
    { file: "app/api/v1/me/subscription/route.ts", snippet: 'tier === "free"', reason: "plan display name" },
    { file: "app/api/v1/tokens/purchase/route.ts", snippet: 'tier === "free"', reason: "token top-ups are a paid-plan feature (token_topup gate)" },
    { file: "app/api/stripe/checkout/route.ts", snippet: "tier === 'pro'", reason: "checkout: tier → Stripe price mapping" },
    { file: "app/api/stripe/checkout/route.ts", snippet: "tier === 'plus'", reason: "checkout: tier → Stripe price mapping" },
    { file: "lib/subscription-entitlements.ts", snippet: 'tier !== "free"', reason: "isPaid derivation" },
    { file: "lib/subscription-entitlements.ts", snippet: 'tier !== "pro"', reason: "agent-feature fallback for a dual-role user who pays for B2C Pro (AGENT_UPGRADE_REQUIRED)" },
    { file: "lib/token-tracking.ts", snippet: "tier === 'plus'", reason: "tier string parsing" },
    { file: "lib/token-tracking.ts", snippet: "tier === 'pro'", reason: "tier string parsing" },
    { file: "lib/token-tracking.ts", snippet: "tier === 'free'", reason: "tier string parsing" },
    { file: "lib/token-tracking.ts", snippet: "tier !== 'free'", reason: "monthly token allowance for paid tiers" },
    { file: "lib/wallet/gap-report.ts", snippet: 'tier !== "free"', reason: "computeReportUnlocked — the free tier's paid report unlock" },
    { file: "lib/monetization/feature-gates.ts", snippet: 'tier === "plus"', reason: "recommendedPlan — the registry itself" },
    { file: GATES[0], snippet: 'tier === "pro"', reason: "priority-queue ladder (pro=2, plus=1, free=0) — ordering, not admission" },
    { file: GATES[0], snippet: 'tier === "plus"', reason: "priority-queue ladder (pro=2, plus=1, free=0) — ordering, not admission" },
]

describe("canRunDeepAnalysis — the one predicate", () => {
    it("is the full_ai_policy_analysis gate: pro only today", () => {
        expect(canRunDeepAnalysis("free")).toBe(false)
        expect(canRunDeepAnalysis("plus")).toBe(false)
        expect(canRunDeepAnalysis("pro")).toBe(true)
        for (const tier of ["free", "plus", "pro"] as const) {
            expect(canRunDeepAnalysis(tier)).toBe(tierUnlocks(tier, FEATURE_GATES.full_ai_policy_analysis))
        }
    })

    it("every server gate calls it, and none spells the rule out as a literal", () => {
        for (const file of GATES) {
            const src = stripComments(readFileSync(file, "utf-8"))
            expect(src, file).toMatch(/canRunDeepAnalysis\(/)
            expect(tierComparisons(src).filter((c) => /!==? ['"]pro['"]/.test(c)), `${file} still compares tier to "pro" for admission`).toEqual([])
        }
    })
})

describe("no other file compares `tier` to a literal without a stated reason — app/ and lib/, enumerated", () => {
    const files = [...globSync("app/**/*.ts"), ...globSync("app/**/*.tsx"), ...globSync("lib/**/*.ts"), ...globSync("lib/**/*.tsx")].filter(
        (f) => !/\.(test|spec)\.tsx?$/.test(f) && !f.includes("/__tests__/")
    )

    it("walks the real universe", () => {
        expect(files.length).toBeGreaterThan(300)
        for (const gate of GATES) expect(files).toContain(gate)
    })

    it("every comparison is allow-listed with a reason", () => {
        const offenders: string[] = []
        for (const file of files) {
            for (const comparison of tierComparisons(readFileSync(file, "utf-8"))) {
                const allowed = ALLOWED.some((a) => a.file === file && comparison.includes(a.snippet))
                if (!allowed) offenders.push(`${file}: ${comparison}`)
            }
        }
        expect(
            offenders,
            `These compare \`tier\` to a literal with no allow-list reason. If it decides whether the deep analysis runs or is shown as unlocked, call canRunDeepAnalysis(tier) (lib/monetization/feature-gates.ts); otherwise add the file with its reason:\n  ${offenders.join("\n  ")}`
        ).toEqual([])
    })

    it("no allow-list entry names a file outside the universe", () => {
        for (const a of ALLOWED) expect(files, a.file).toContain(a.file)
    })
})

describe("the scanner is proven against committed probes", () => {
    const probe = (name: string) => readFileSync(`tests/fixtures/guard-probes/${name}`, "utf-8")

    it("flags the literal gate, both spellings", () => {
        const red = tierComparisons(probe("deep-analysis-gate-literal.ts.txt"))
        expect(red).toEqual(['tier !== "pro"', "tier === 'free'"])
    })

    it("stays silent on the predicate, a template literal, and a commented-out gate — and sees only the display comparison", () => {
        const green = probe("deep-analysis-gate-predicate.ts.txt")
        expect(green).toMatch(/canRunDeepAnalysis\(/)
        expect(tierComparisons(green)).toEqual(['tier === "free"'])
    })
})
