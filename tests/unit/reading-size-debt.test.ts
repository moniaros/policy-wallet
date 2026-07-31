/**
 * WP-21 — the sub-16px debt in decision content, made countable.
 *
 * What a policy covers, what it excludes, what a gap means and what a renewal
 * costs is largely rendered at `text-sm` (14px) and `text-xs` (12px). That is
 * below what this reading wants, and the people it fails hardest are the ones
 * the product is for: policyholders in their sixties and seventies working
 * through an exclusion clause on a phone.
 *
 * The re-ladder itself is not safe to do here. Moving ~480 sizes in these
 * surfaces changes layout, and layout is exactly what cannot be verified
 * without a browser — this session already produced the proof: a three-column
 * control passed type-check, lint and seventeen of its own tests while being
 * wrong at 375px, and was caught only by a guard that already existed. There is
 * no such guard for the re-ladder.
 *
 * So this does the thing that IS verifiable and that the repo already does for
 * debts it cannot pay immediately (bundle size, sold-but-unbuilt features): it
 * counts the debt and stops it growing. A number that can only go down turns
 * "1,590 unmeasured sizes" into a figure someone can watch fall, and makes any
 * new `text-xs` in a decision surface a deliberate act with this comment in
 * front of it.
 *
 * The ratchet is strict in BOTH directions on purpose. Growth is a regression;
 * a stale-high baseline is a slack gate, which is how a ratchet quietly stops
 * measuring anything.
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const BASELINE = JSON.parse(readFileSync("scripts/reading-size-baseline.json", "utf-8"))

/** Occurrences of a class token across the decision surfaces. */
function countToken(token: string): number {
    let total = 0
    for (const dir of BASELINE.surfaces as string[]) {
        try {
            const out = execFileSync("grep", ["-roh", "--include=*.tsx", token, dir], {
                encoding: "utf8",
            })
            total += out.trim().split("\n").filter(Boolean).length
        } catch {
            // grep exits 1 with no matches — a surface with none contributes 0.
        }
    }
    return total
}

function ratchet(token: string, baseline: number, actual: number) {
    if (actual > baseline) {
        throw new Error(
            `${token} in decision surfaces grew from ${baseline} to ${actual}. ` +
            "This is text a policyholder has to read to understand their own cover. " +
            "Use a larger step, or — if it is genuinely decorative — say so in the " +
            "diff and raise scripts/reading-size-baseline.json deliberately."
        )
    }
    if (actual < baseline) {
        throw new Error(
            `${token} in decision surfaces fell from ${baseline} to ${actual} — good. ` +
            `Lower scripts/reading-size-baseline.json to ${actual} so the gate keeps ` +
            "holding the new floor instead of going slack."
        )
    }
}

describe("sub-16px type in policyholder decision surfaces", () => {
    it("measures real surfaces that still exist", () => {
        // Vacuity floor: a renamed or moved directory would silently count 0 and
        // make the ratchet pass while measuring nothing — the exact failure this
        // repo has hit before.
        expect(BASELINE.surfaces.length).toBeGreaterThan(3)
        expect(countToken("text-xs") + countToken("text-sm")).toBeGreaterThan(100)
    })

    it("never grows the 12px count", () => {
        ratchet("text-xs", BASELINE.textXs, countToken("text-xs"))
    })

    it("never grows the 14px count", () => {
        ratchet("text-sm", BASELINE.textSm, countToken("text-sm"))
    })

    it("keeps the baseline honest about what it is", () => {
        // A ratchet whose baseline reads as a target is one someone will "meet"
        // by raising it.
        expect(String(BASELINE.description)).toMatch(/ratchet, not a target/i)
        expect(BASELINE.textXs).toBeGreaterThan(0)
        expect(BASELINE.textSm).toBeGreaterThan(0)
    })

    it("still offers the reader a way out while the debt is unpaid", () => {
        // The large-text mode is what makes this debt survivable in the
        // meantime: it scales every rem-based size from the root, including
        // every one counted above. If it were ever removed, these counts would
        // stop being an inconvenience and start being a barrier.
        const css = readFileSync("app/globals.css", "utf-8")
        expect(css).toContain('data-text-size="large"')
        expect(css).toContain('data-text-size="larger"')
    })
})
