import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

/**
 * Mobile-first invariants for the risk surfaces.
 *
 * `RiskAssessmentPanel` was deleted rather than guarded: it rendered a flat list
 * of all 21 risks beside the nine dimensions that describe the same assessment,
 * and asking a customer to reconcile two views of one thing is our job, not
 * theirs. Each risk now sits inside the dimension it belongs to.
 *
 * Source-level rather than rendered, deliberately: the rendered checks live in
 * the Playwright responsive sweep (which measures real layout at 320–1920), and
 * a jsdom render cannot measure width anyway. What this guards is the set of
 * decisions that produced the audit's mobile findings in the first place —
 * truncated Greek labels, wrapping chip rows, and sub-44px tap targets — so a
 * later edit cannot quietly reintroduce them between sweeps.
 */

const WIZARD = readFileSync("components/coverage/RiskProfileWizard.tsx", "utf-8")
const GLOBALS = readFileSync("app/globals.css", "utf-8")
const GRAPH = readFileSync("components/coverage/RiskGraphPanel.tsx", "utf-8")

describe("the risk graph panel is mobile-first", () => {
    it("is a list, not a canvas", () => {
        // A node-and-edge diagram is illegible at 320px, cannot show evidence,
        // and encodes nothing the grouped list does not. Guarding the absence
        // because "let's visualise the graph" is the obvious later temptation.
        expect(GRAPH).not.toMatch(/<canvas|<svg[^>]*viewBox="0 0 (?:[5-9]\d\d|\d{4})/)
        expect(GRAPH).toMatch(/<ul\b/)
    })

    it("never lays out multiple columns", () => {
        const gridCols = [...GRAPH.matchAll(/\bgrid-cols-(\d+)\b/g)].map((m) => Number(m[1]))
        expect(gridCols.filter((n) => n > 1)).toEqual([])
    })

    it("keeps the state filter in a scrollable strip", () => {
        // `.pw-scroll-strip` IS the scrolling primitive (CLAUDE.md: a strip
        // that is meant to scroll uses it) — a raw overflow-x-auto is the
        // pre-primitive spelling and still accepted.
        expect(GRAPH).toMatch(/pw-scroll-strip|overflow-x-auto/)
        // The chips must never wrap mid-label. Since the segmented recipe
        // moved into app/globals.css, the no-wrap can live on the chip's own
        // class list OR on the `.pw-segment` rule the chip uses — but then
        // the rule itself has to declare it, so a later edit to the recipe
        // cannot quietly drop it either.
        const segmentRule = GLOBALS.match(/:where\(\.pw-segment\)\s*\{[^}]*\}/)?.[0] ?? ""
        const noWrapViaRecipe = /\bpw-segment\b/.test(GRAPH) && /whitespace-nowrap/.test(segmentRule)
        expect(/whitespace-nowrap/.test(GRAPH) || noWrapViaRecipe).toBe(true)
    })

    it("holds the WCAG 2.5.8 touch floor on every interactive control", () => {
        const buttons = [...GRAPH.matchAll(/<button\b[\s\S]*?>/g)].map((m) => m[0])
        expect(buttons.length).toBeGreaterThan(0)
        for (const button of buttons) {
            expect(button, `control without a tap floor:\n${button.slice(0, 120)}`).toMatch(/min-h-11/)
        }
    })

    it("lets long Greek anchor labels shrink rather than push the row wide", () => {
        // `min-w-0` on the flex child is what stops a long «Η ενοικιαζόμενη
        // κατοικία σας» from forcing horizontal scroll on the whole page.
        expect(GRAPH).toMatch(/min-w-0/)
    })

    it("discloses evidence with <details>, which works before hydration", () => {
        expect(GRAPH).toMatch(/<details/)
        expect(GRAPH).toMatch(/<summary/)
    })

    it("prints each finding once", () => {
        // The evidence array already carries every failed and unevaluable
        // dimension, so rendering `risk.dimensions` as a second list printed
        // those sentences twice, one directly under the other. One source, two
        // lists, split by what the item does.
        expect(GRAPH).not.toMatch(/risk\.dimensions\s*\n?\s*\.filter/)
        expect(GRAPH).toMatch(/declared_fact", "held_policy", "absence"/)
        expect(GRAPH).toMatch(/"derived", "market_rule"/)
    })

    it("does not claim to know things it does not", () => {
        // Every graph contains a person and a household, so a customer who has
        // told us nothing still counts two — and "we are tracking 2 things in
        // your life" implies we know two things about them when we know none.
        expect(GRAPH).toMatch(/knowsSomething/)
        expect(GRAPH).toMatch(/You have not yet told us what is in your life/)
    })

    it("inflects its Greek counts", () => {
        // Greek marks number on the noun, so a literal «1 περιουσιακά στοιχεία»
        // is simply ungrammatical in the product's default language.
        expect(GRAPH).toMatch(/περιουσιακό στοιχείο/)
        expect(GRAPH).toMatch(/υποχρέωση/)
        expect(GRAPH).toMatch(/εξαρτώμενο μέλος/)
        expect(GRAPH).toMatch(/count === 1/)
    })

    it("renders unknown differently from unprotected", () => {
        // The two say different things — "we cannot tell" and "nothing covers
        // this". Painting them the same colour is how an unread sum insured
        // looked like a finding, or worse, like adequate cover.
        const styles = GRAPH.slice(GRAPH.indexOf("STATE_STYLES"), GRAPH.indexOf("export function RiskGraphPanel"))
        const unprotected = styles.slice(styles.indexOf("unprotected:"), styles.indexOf("partially_protected:"))
        const unknown = styles.slice(styles.indexOf("unknown:"), styles.indexOf("protected:", styles.indexOf("unknown:")))
        // The colour vocabulary is the status TOKENS since Direction A
        // (2026-09-03) — `bg-status-info-tint text-status-info` against
        // `bg-status-danger-tint text-status-danger` — with the Tailwind
        // palette form kept so a regression to hand-picked hues still counts.
        const palette = (s: string) =>
            (s.match(/\b(?:border|bg|text)-(?:status-[a-z]+(?:-tint|-edge)?|[a-z]+-\d{2,3})\b/g) ?? []).join(",")
        expect(palette(unknown)).not.toBe(palette(unprotected))
        expect(palette(unknown).length).toBeGreaterThan(0)
    })
})

// (A describe block guarding the ProtectionScoreCard's category grid lived
// here. The card — and the portfolio protection score — were removed from the
// product in Aug 2026, PW-MOBILE-TRANSFORM-01 halt H-001.)

describe("the risk wizard stays single-column on a phone", () => {
    it("never renders three or more ungated columns", () => {
        // Three columns at 320px is ~93px per cell — too narrow for a labelled
        // input in either language. Two is deliberately allowed: the one bare
        // `grid-cols-2` pairs Height and Weight, whose labels and values both
        // fit comfortably in ~140px, and splitting them would be worse.
        const bare = [...WIZARD.matchAll(/(?:^|\s)grid-cols-(\d+)/g)].filter(
            (m) => Number(m[1]) >= 3
        )
        expect(
            bare.map((m) => m[0].trim()),
            "three-or-more-column grid with no breakpoint prefix"
        ).toEqual([])
    })

    it("activity chips meet the touch floor", () => {
        const chipBlock = WIZARD.slice(WIZARD.indexOf("ACTIVITY_OPTIONS.map"))
        expect(chipBlock.slice(0, 1200)).toMatch(/min-h-11/)
    })
})
