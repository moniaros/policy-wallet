/**
 * WP-25 — prevention actions, the part of the product that is useful when
 * nothing has gone wrong.
 *
 * Everything else is reactive: a policy is analysed, gaps are reported, a
 * renewal approaches. None of it gives a policyholder a reason to open the app
 * in an ordinary week, which is what "used daily" actually requires.
 *
 * The properties worth pinning are the ones that decide whether such a surface
 * is trusted or ignored: it must never show advice irrelevant to what the
 * person actually insures, it must be honest and render nothing when nothing
 * fits, and it must be stable — a card that reshuffles on every render reads as
 * noise rather than counsel.
 */
import { describe, expect, it } from "vitest"
import {
    PREVENTION_ACTIONS,
    matchPreventionActions,
    preventionActionOfTheWeek,
    seasonForMonth,
} from "@/lib/prevention/prevention-actions"

const JANUARY = new Date(2026, 0, 15)
const JULY = new Date(2026, 6, 15)
const OCTOBER = new Date(2026, 9, 15)

describe("prevention actions", () => {
    it("carries a real catalogue", () => {
        // Vacuity floor: an empty catalogue would make every filter below pass.
        expect(PREVENTION_ACTIONS.length).toBeGreaterThan(3)
    })

    it("is bilingual throughout — this is policyholder-facing copy", () => {
        for (const action of PREVENTION_ACTIONS) {
            expect(action.title.el.length).toBeGreaterThan(0)
            expect(action.title.en.length).toBeGreaterThan(0)
            expect(action.body.el.length).toBeGreaterThan(0)
            expect(action.body.en.length).toBeGreaterThan(0)
        }
    })

    it("never suggests something for a line the person does not hold", () => {
        // Advice about a car to someone with only home insurance is the fastest
        // way to teach them to ignore the surface entirely.
        const homeOnly = matchPreventionActions(["home"], JANUARY)
        for (const action of homeOnly) {
            expect(action.lobs.length === 0 || action.lobs.includes("home")).toBe(true)
        }
    })

    it("matches the season", () => {
        const winter = matchPreventionActions(["home"], JANUARY).map((a) => a.slug)
        const autumn = matchPreventionActions(["home"], OCTOBER).map((a) => a.slug)

        expect(winter).toContain("home-winter-pipes")
        expect(winter).not.toContain("home-storm-balcony")
        expect(autumn).toContain("home-storm-balcony")
    })

    it("keeps year-round advice available in every season", () => {
        for (const date of [JANUARY, JULY, OCTOBER]) {
            expect(matchPreventionActions(["motor"], date).map((a) => a.slug)).toContain(
                "motor-pre-renewal-photos"
            )
        }
    })

    it("renders nothing rather than padding when nothing fits", () => {
        // Honest-when-empty, the same rule the partner catalogue follows.
        expect(matchPreventionActions([], JANUARY)).toEqual([])
        expect(preventionActionOfTheWeek([], JANUARY)).toBeNull()
    })

    it("treats a motorbike as motor, matching the branch taxonomy", () => {
        expect(matchPreventionActions(["motorbike"], JULY).map((a) => a.slug)).toContain(
            "motor-summer-tyres"
        )
    })

    it("shows the same card all week rather than reshuffling per render", () => {
        const monday = new Date(2026, 0, 12)
        const wednesday = new Date(2026, 0, 14)

        expect(preventionActionOfTheWeek(["home", "motor"], monday)?.slug).toBe(
            preventionActionOfTheWeek(["home", "motor"], wednesday)?.slug
        )
    })

    it("rotates across weeks so the same advice is not shown for months", () => {
        const seen = new Set<string>()
        for (let week = 0; week < 8; week += 1) {
            const date = new Date(2026, 0, 5 + week * 7)
            const action = preventionActionOfTheWeek(["home", "motor", "health"], date)
            if (action) seen.add(action.slug)
        }
        expect(seen.size).toBeGreaterThan(1)
    })

    it("maps months to the right seasons", () => {
        expect(seasonForMonth(0)).toBe("winter")
        expect(seasonForMonth(6)).toBe("summer")
        expect(seasonForMonth(9)).toBe("autumn")
    })

    it("is deterministic for a given person and date", () => {
        const first = preventionActionOfTheWeek(["home"], JANUARY)?.slug
        for (let i = 0; i < 5; i += 1) {
            expect(preventionActionOfTheWeek(["home"], JANUARY)?.slug).toBe(first)
        }
    })
})
