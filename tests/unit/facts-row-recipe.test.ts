import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

/**
 * The «Συνοπτική εικόνα» facts row — the recipe, pinned at the source.
 *
 * Owner report 2026-09-07: on a desktop the seven items rendered as one row of
 * ~110px columns with the longest label wrapped seven lines deep. The cause was
 * a column count bound to the VIEWPORT (`lg:grid-flow-col lg:auto-cols-fr`)
 * while the card's width is set by the sidebar and the rail — beside the rail
 * at 1024px the card is 314px inside, narrower than on a phone. The rebuild
 * keeps ONE viewport boundary (lg: ink pill → fact-cell grid) and lets the
 * CARD's width step the columns (2 → 3 → 4) through container queries; hairlines
 * only from lg and only between cells of the same row; 44px targets by
 * construction. These are the classes that carry each of those rules.
 */
const HERO = readFileSync("components/dashboard/home/ProtectionStatusHero.tsx", "utf8")

describe("the facts row's recipe (components/dashboard/home/ProtectionStatusHero.tsx)", () => {
    it("makes the card the query container and steps the columns with the card, not the viewport", () => {
        expect(HERO).toMatch(/className="pw-card pw-pad @container"/)
        expect(HERO).toMatch(/lg:grid-cols-2/)
        expect(HERO).toMatch(/lg:@md:grid-cols-3/)
        expect(HERO).toMatch(/lg:@xl:grid-cols-4/)
        expect(HERO).not.toMatch(/grid-flow-col/)
        expect(HERO).not.toMatch(/auto-cols-fr/)
    })

    it("draws hairlines from lg only, and never at a row's start", () => {
        // class tokens only: split on whitespace and quotes so a string's opening quote
        // is not read as part of the token
        for (const token of HERO.split(/[\s"'`{}$]+/)) {
            if (!/(^|:)border-l(:|$)/.test(token)) continue
            expect(token, `a hairline class without the lg: prefix: ${token}`).toMatch(/^lg:/)
        }
        // the row-start suppression exists for every column step
        expect(HERO).toMatch(/lg:@max-md:pl-0/)
        expect(HERO).toMatch(/lg:@md:@max-xl:pl-0/)
        expect(HERO).toMatch(/lg:@xl:pl-0/)
    })

    it("keeps the note screen-reader-only below lg and visible from lg, after the words", () => {
        expect(HERO).toMatch(/const NOTE = "sr-only lg:not-sr-only lg:order-3/)
    })

    it("holds 44px targets by construction — no negative margins", () => {
        expect(HERO).not.toMatch(/-my-/)
        expect(HERO).toMatch(/min-h-11/)
    })
})
