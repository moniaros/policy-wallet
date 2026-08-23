import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { CoverageGapsWidget } from "@/components/dashboard/home/CoverageGapsWidget"
import { ScoreRing } from "@/components/ui/ScoreRing"

/**
 * A NUMBER IS NOT AN ANSWER WITHOUT ITS SUBJECT.
 *
 * Two controls on this page conveyed their meaning only to people who could see
 * them. The score ring draws its arc in an `aria-hidden` SVG with the figure
 * centred inside, so the whole control announced as «74» — no scale, no units,
 * and no hint that it measures the BREADTH of cover rather than grading how
 * protected someone is. The severity chips each read «4 υψηλά» — a number and an
 * adjective with no subject, four times over, with nothing saying they are one
 * tally of one set of findings.
 *
 * Outstanding since Goal 0, which recorded that answering it "needs an
 * accessibility-tree assertion". This is that assertion.
 */
describe("the score ring announces what its number is", () => {
    it("has an accessible name carrying the scale", () => {
        const { container } = render(
            <ScoreRing value={74} toneClass="" label="Coverage breadth index: 74 out of 100">
                <span>74</span>
            </ScoreRing>
        )
        const img = container.querySelector('[role="img"]')
        expect(img, "the ring is not exposed as an image with a name").not.toBeNull()
        expect(img!.getAttribute("aria-label")).toMatch(/74/)
        expect(img!.getAttribute("aria-label")).toMatch(/100/)
    })

    it("does not announce the figure twice", () => {
        // The centred number is the visual half of the same information.
        const { container } = render(
            <ScoreRing value={74} toneClass="" label="Coverage breadth index: 74 out of 100">
                <span>74</span>
            </ScoreRing>
        )
        expect(container.querySelector("span[aria-hidden]")).not.toBeNull()
    })

    it("stays silent rather than announcing a bare number when unlabelled", () => {
        // Other surfaces render a ring decoratively; forcing a name on them would
        // put "—" into the accessibility tree.
        const { container } = render(<ScoreRing value={null} toneClass=""><span>—</span></ScoreRing>)
        expect(container.querySelector('[role="img"]')).toBeNull()
    })
})

describe("the severity chips announce as one named tally", () => {
    const labels = {
        kicker: "Coverage gaps",
        noGaps: "No gaps",
        severity: { critical: "critical", high: "high", medium: "medium", low: "low" },
        note: null,
        groupLabel: "Open findings by priority",
    }

    it("groups the chips and names the group", () => {
        const { container } = render(
            <CoverageGapsWidget counts={{ critical: 0, high: 4, medium: 5, low: 4 }} labels={labels} />
        )
        const list = container.querySelector('[role="list"]')
        expect(list, "chips are not grouped").not.toBeNull()
        expect(list!.getAttribute("aria-label")).toBe("Open findings by priority")
        expect(list!.querySelectorAll('[role="listitem"]').length).toBe(3)
    })

    it("keeps colour off the critical path — every chip carries its word", () => {
        const { container } = render(
            <CoverageGapsWidget counts={{ critical: 1, high: 4, medium: 0, low: 0 }} labels={labels} />
        )
        const items = Array.from(container.querySelectorAll('[role="listitem"]'))
        expect(items.map((i) => i.textContent)).toEqual(["1 critical", "4 high"])
        // The dot is decoration; it must never be the only carrier.
        container.querySelectorAll("span.rounded-full.h-1\\.5").forEach((dot) => {
            expect(dot.getAttribute("aria-hidden")).toBeTruthy()
        })
    })

    it("renders no list at all when there is nothing to tally", () => {
        const { container } = render(
            <CoverageGapsWidget counts={{ critical: 0, high: 0, medium: 0, low: 0 }} labels={labels} />
        )
        expect(container.querySelector('[role="list"]')).toBeNull()
    })
})
