/**
 * THE PROBE FOR THE CROSS-SURFACE COUNT COMPARISON
 * (tests/measure/cross-surface-count.ts).
 *
 * A detector that has never fired is not a detector (CLAUDE.md, "a guard
 * without a probe in the repo is not a guard"). Every rule the comparator's
 * header defends is exercised here: the RED case first — one key rendering
 * 3 on one surface and 4 on another, the exact shape D-025 names as v2's
 * headline defect — then each deliberate NON-finding (saturation floors,
 * page-scoped exclusion, subject scoping, single-surface silence), so the
 * red-proof cannot be satisfied by a comparator that fires on everything.
 *
 * RUNTIME. jsdom for the capture half: each fabricated "surface" is a DOM
 * run through the REAL `collectCountConsistency` (assumeVisible, as every
 * jsdom caller — no layout), so the probe covers the actual seam the live
 * sweep uses, not a hand-built groups array. The comparator itself is pure
 * node code and is never serialised into a browser, so no `new Function`
 * reconstruction is needed here — that proof belongs to the collector's own
 * probe (phase5-metrics-probe.test.ts) and already exists there.
 *
 * The LIVE red-proof — the same contradiction planted into the real /wallet
 * DOM and caught against real pages — is the sweep spec's
 * CROSS_SURFACE_PLANT=1 mode (phase5-cross-surface.spec.ts).
 *
 * Run: npx vitest --run tests/measure/phase5-cross-surface-probe.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest"

import { collectCountConsistency } from "./count-collector"
import {
    compareAcrossSurfaces,
    compareSweepPasses,
    PAGE_SCOPED_KEYS,
    type SurfaceCapture,
} from "./cross-surface-count"

/** One fabricated surface: render html, collect with the real collector. */
function capture(surface: string, html: string): SurfaceCapture {
    document.body.innerHTML = html
    return { surface, result: collectCountConsistency({ assumeVisible: true }) }
}

beforeEach(() => {
    document.body.innerHTML = ""
})

// ─────────────────────────────────────────────────────────────────────────────
describe("cross-surface contradiction — the probe that turns it red", () => {
    it("RED: one key, 3 on /dashboard and 4 on /wallet — the §2.8 defect — fires with key, values, surfaces", () => {
        const dash = capture(
            "/dashboard",
            `<section id="hero"><span data-count="portfolio.policyCount">3 ασφαλιστήρια</span></section>`
        )
        const wallet = capture(
            "/wallet",
            `<section id="list"><span data-count="portfolio.policyCount">4 ασφαλιστήρια</span></section>`
        )
        // Each page is internally consistent — the per-page metric sees NOTHING.
        expect(dash.result.failures).toBe(0)
        expect(wallet.result.failures).toBe(0)

        const r = compareAcrossSurfaces([dash, wallet])
        expect(r.verdict).toBe("contradicted")
        expect(r.contradictions).toHaveLength(1)
        expect(r.contradictions[0].key).toBe("portfolio.policyCount")
        expect(r.contradictions[0].values.sort()).toEqual(["3", "4"])
        expect(r.contradictions[0].surfaces).toEqual(["/dashboard", "/wallet"])
    })

    it("RED: agreement on four surfaces does not launder a fifth's disagreement", () => {
        const caps = [
            capture("/dashboard", `<span data-count="gap.openCount">5</span>`),
            capture("/wallet", `<span data-count="gap.openCount">5</span>`),
            capture("/protection", `<span data-count="gap.openCount">5</span>`),
            capture("/notifications", `<span data-count="gap.openCount">5</span>`),
            capture("/account", `<span data-count="gap.openCount">2</span>`),
        ]
        const r = compareAcrossSurfaces(caps)
        expect(r.verdict).toBe("contradicted")
        expect(r.contradictions[0].surfaces).toContain("/account")
        expect(r.contradictions[0].values.sort()).toEqual(["2", "5"])
    })

    it("GREEN: the same values on both surfaces are corroborated, not merely silent", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-count="portfolio.policyCount">3</span>`),
            capture("/wallet", `<span data-count="portfolio.policyCount">3 ασφαλιστήρια</span>`),
        ])
        expect(r.verdict).toBe("consistent-and-corroborated")
        expect(r.corroboratedExact).toBe(1)
        expect(r.contradictions).toHaveLength(0)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("saturation — «9+» is a floor claim, not a value (decision 2)", () => {
    it("9+ vs 12 is NOT a contradiction (12 satisfies the floor)", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-count="notification.unreadCount">9+</span>`),
            capture("/account", `<span data-count="notification.unreadCount">12</span>`),
        ])
        expect(r.contradictions).toHaveLength(0)
        // …but neither is it exact corroboration: one exact + one floor is
        // uncorroborated-shared (the floor fails to deny 12, it cannot confirm it).
        expect(r.corroboratedExact).toBe(0)
        expect(r.uncorroboratedShared).toBe(1)
        expect(r.verdict).toBe("consistent-but-uncorroborated")
    })

    it("RED: 9+ vs 3 IS a contradiction (3 violates the floor)", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-count="notification.unreadCount">9+</span>`),
            capture("/account", `<span data-count="notification.unreadCount">3</span>`),
        ])
        expect(r.verdict).toBe("contradicted")
        expect(r.contradictions[0].values.sort()).toEqual(["3", "≥9"])
    })

    it("9+ vs 19+ is threshold drift, never a value contradiction", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-count="notification.unreadCount">9+</span>`),
            capture("/wallet", `<span data-count="notification.unreadCount">19+</span>`),
        ])
        expect(r.contradictions).toHaveLength(0)
        expect(r.saturationThresholdDrift).toHaveLength(1)
        expect(r.saturationThresholdDrift[0].floors).toEqual(["19", "9"])
    })

    it("floors agreeing on two surfaces corroborate only the FLOOR, reported as such", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-count="notification.unreadCount">9+</span>`),
            capture("/wallet", `<span data-count="notification.unreadCount">9+</span>`),
        ])
        expect(r.contradictions).toHaveLength(0)
        expect(r.corroboratedFloorOnly).toBe(1)
        expect(r.corroboratedExact).toBe(0)
        expect(r.verdict).toBe("consistent-but-uncorroborated")
    })

    it("«3 + 2» in prose is NOT laundered into a floor (strict whole-text pattern)", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-count="plan.stepsDone">3 + 2</span>`),
            capture("/account", `<span data-count="plan.stepsDone">4</span>`),
        ])
        // «3 + 2» extracts as exact 3 (first number token) — vs 4 must FIRE,
        // which it would not if the loose text had been read as a floor.
        expect(r.verdict).toBe("contradicted")
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("page-scoped keys — excluded by name, with the reason stated (decision 3)", () => {
    it("portfolio.attentionCollapsedCount differing across surfaces is excluded AND reported, never a contradiction", () => {
        expect(PAGE_SCOPED_KEYS["portfolio.attentionCollapsedCount"]).toBeTruthy()
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-count="portfolio.attentionCollapsedCount">1</span>`),
            capture("/wallet", `<span data-count="portfolio.attentionCollapsedCount">3</span>`),
        ])
        expect(r.contradictions).toHaveLength(0)
        expect(r.excludedPageScoped).toHaveLength(1)
        expect(r.excludedPageScoped[0].key).toBe("portfolio.attentionCollapsedCount")
        expect(r.excludedPageScoped[0].reason).toMatch(/show more/)
        expect(r.excludedPageScoped[0].bySurface.map((b) => b.surface)).toEqual(["/dashboard", "/wallet"])
        // Excluded means excluded from the verdict too — nothing shared remains.
        expect(r.verdict).toBe("vacuous-no-shared-keys")
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("absence is not agreement (decision 4)", () => {
    it("a key on ONE surface is single-surface, and a run of only singletons is VACUOUS, never consistent", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-count="portfolio.policyCount">3</span>`),
            capture("/wallet", `<span data-count="gap.openCount">2</span>`),
            capture("/protection", ``),
            capture("/notifications", ``),
            capture("/account", ``),
        ])
        expect(r.contradictions).toHaveLength(0)
        expect(r.sharedKeyCount).toBe(0)
        expect(r.singleSurface).toHaveLength(2)
        expect(r.verdict).toBe("vacuous-no-shared-keys")
    })

    it("corroboration counts only keys with exact values from ≥2 surfaces", () => {
        const r = compareAcrossSurfaces([
            capture(
                "/dashboard",
                `<span data-count="portfolio.policyCount">3</span>
                 <span data-count="portfolio.activeCount">2</span>`
            ),
            capture("/wallet", `<span data-count="portfolio.policyCount">3</span>`),
        ])
        expect(r.corroboratedExact).toBe(1) // policyCount
        expect(r.singleSurface.map((s) => s.key)).toEqual(["portfolio.activeCount"])
        expect(r.verdict).toBe("consistent-and-corroborated")
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("subject scoping and channels", () => {
    it("RED: the same policy's daysRemaining disagreeing across surfaces fires per subject", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-fact="policy.daysRemaining" data-fact-subject="pol-1">30 ημέρες</span>`),
            capture("/wallet", `<span data-fact="policy.daysRemaining" data-fact-subject="pol-1">28 ημέρες</span>`),
        ])
        expect(r.verdict).toBe("contradicted")
        expect(r.contradictions[0].subject).toBe("pol-1")
        expect(r.contradictions[0].values.sort()).toEqual(["28", "30"])
    })

    it("different subjects never compare — each is single-surface, not a contradiction", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-fact="policy.daysRemaining" data-fact-subject="pol-1">30</span>`),
            capture("/wallet", `<span data-fact="policy.daysRemaining" data-fact-subject="pol-2">28</span>`),
        ])
        expect(r.contradictions).toHaveLength(0)
        expect(r.singleSurface).toHaveLength(2)
    })

    it("a key carried as data-count on one surface and data-fact on another still compares, and the vocabulary bug is named", () => {
        const r = compareAcrossSurfaces([
            capture("/dashboard", `<span data-count="gap.openCount">5</span>`),
            capture("/protection", `<span data-fact="gap.openCount">4</span>`),
        ])
        expect(r.channelMismatches).toHaveLength(1)
        expect(r.channelMismatches[0].channels).toEqual(["count", "fact"])
        // The mismatch does NOT hide the value contradiction.
        expect(r.verdict).toBe("contradicted")
    })

    it("intra-surface disagreement is passed through, labelled, and does not masquerade as cross-surface", () => {
        const r = compareAcrossSurfaces([
            capture(
                "/dashboard",
                `<span data-count="gap.openCount">5</span><span data-count="gap.openCount">4</span>`
            ),
            capture("/wallet", ``),
        ])
        expect(r.intraSurfaceInconsistencies).toHaveLength(1)
        expect(r.intraSurfaceInconsistencies[0].surface).toBe("/dashboard")
        // No SECOND surface renders the key: nothing cross-surface fired.
        expect(r.contradictions).toHaveLength(0)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("same-state check — the void detector (decision 1)", () => {
    it("RED: a value that moved between the two passes voids the sweep, naming surface, key and both values", () => {
        const p1 = [capture("/dashboard", `<span data-count="portfolio.policyCount">3</span>`)]
        const p2 = [capture("/dashboard", `<span data-count="portfolio.policyCount">4</span>`)]
        const check = compareSweepPasses(p1, p2)
        expect(check.void).toBe(true)
        expect(check.diffs[0]).toMatchObject({
            surface: "/dashboard",
            key: "portfolio.policyCount",
            pass1Values: ["3"],
            pass2Values: ["4"],
        })
    })

    it("RED: a key that APPEARED or VANISHED between passes also voids — presence is part of state", () => {
        const p1 = [capture("/dashboard", `<span data-count="portfolio.policyCount">3</span>`)]
        const p2 = [
            capture(
                "/dashboard",
                `<span data-count="portfolio.policyCount">3</span><span data-count="gap.openCount">1</span>`
            ),
        ]
        expect(compareSweepPasses(p1, p2).void).toBe(true)
    })

    it("GREEN: identical values in identical places twice is a stable state", () => {
        const html = `<span data-count="portfolio.policyCount">3</span>`
        const check = compareSweepPasses(
            [capture("/dashboard", html)],
            [capture("/dashboard", html)]
        )
        expect(check.void).toBe(false)
        expect(check.diffs).toHaveLength(0)
    })
})
