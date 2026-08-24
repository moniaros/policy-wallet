import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { PolicyCard } from "@/components/wallet/PolicyCard"

/**
 * A control the finger has to hit is at least 44×44.
 *
 * The harness measures this — `smallTapTargets` runs on every capture — but
 * nothing GATES on it, exactly like the contrast metric. A fresh pass over
 * /wallet at 320/390/430 found **87 sub-44 controls in one capture**: three
 * `CardAction` buttons per policy card, 29 policies, every one 36×44. The
 * height was borrowed from a stretching parent and the width was 8px short, so
 * the defect had been sitting under a number that looked like a per-card
 * problem and was really one primitive rendered 29 times.
 *
 * jsdom computes no layout, so this asserts the CLASS that sets the floor
 * rather than a measured box — the measured box is the Playwright harness's
 * job, and the two are checked against each other whenever the baselines are
 * re-measured. It renders the component instead of grepping the file, so a
 * refactor that moves the className elsewhere still has to keep the floor.
 */
function withProviders(node: React.ReactNode) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>{node}</TranslationsProvider>
        </LanguageProvider>
    )
}

const policy = {
    id: "p1",
    insurerName: "Interamerican",
    policyNumber: "POL-42",
    status: "active",
    policyType: "motor",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2027-01-01"),
    premium: 300,
} as never

/** Tailwind sizes that reach 44px, in either the fixed or the min- form. */
const CLEARS_44 = /\b(h-11|min-h-11|h-12|size-11|py-3\.5)\b/
const CLEARS_44_W = /\b(w-11|min-w-11|w-12|size-11|w-full|flex-1)\b/

/** No readable text: everything it says is in `aria-label`. */
const isIconOnly = (b: Element) =>
    Boolean(b.getAttribute("aria-label")) && (b.textContent ?? "").trim() === ""

describe("wallet card actions meet the 44px tap-target floor", () => {
    const { container } = withProviders(<PolicyCard policy={policy} onShare={() => {}} />)
    const buttons = [...container.querySelectorAll("button")]

    it("renders the actions it is meant to guard", () => {
        // Vacuity: a card that rendered no buttons would pass every assertion
        // below without checking anything.
        expect(buttons.length).toBeGreaterThan(0)
        expect(
            buttons.filter(isIconOnly).length,
            "no icon-only actions rendered — this is the wrong element set"
        ).toBeGreaterThanOrEqual(1)
    })

    it("every icon-only action clears 44px in both directions", () => {
        const short = buttons
            // Icon-only means NO text content — the label lives in aria-label
            // because there is nothing to read. The card's own full-width
            // button also carries an aria-label but takes its height from its
            // content, so filtering on the attribute alone flagged it: a false
            // positive, and false positives are how allowlists start.
            .filter((b) => isIconOnly(b))
            .filter((b) => !(CLEARS_44.test(b.className) && CLEARS_44_W.test(b.className)))
            .map((b) => `${b.getAttribute("aria-label")}: ${b.className.slice(0, 80)}`)
        expect(short).toEqual([])
    })

    it("h-9 w-9 is gone from the action primitive", () => {
        // The exact shape that measured 36×44, pinned so it cannot come back
        // under a different name.
        for (const b of buttons.filter(isIconOnly)) {
            expect(b.className, b.getAttribute("aria-label") ?? "").not.toMatch(/\bh-9\b|\bw-9\b/)
        }
    })
})
