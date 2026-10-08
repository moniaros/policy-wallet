import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { CoverageGapsWidget } from "@/components/dashboard/home/CoverageGapsWidget"

/**
 * A NUMBER IS NOT AN ANSWER WITHOUT ITS SUBJECT.
 *
 * The severity chips each read «4 υψηλά» — a number and an adjective with no
 * subject, four times over, with nothing saying they are one tally of one set
 * of findings. (The score ring this file also covered was retired with the
 * score itself; its component was deleted 2026-10.)
 *
 * Outstanding since Goal 0, which recorded that answering it "needs an
 * accessibility-tree assertion". This is that assertion.
 */
describe("the severity chips announce as one named tally", () => {
    const labels = {
        kicker: "Coverage gaps",
        noGaps: "No gaps",
        provenance: { legislative: "legal", contractual: "contractual", market: "market" },
        underReviewOmitted: "Findings under review are not counted here.",
        underReviewLink: "See them",
        note: null,
        groupLabel: "Open findings by priority",
    }

    it("groups the chips and names the group", () => {
        const { container } = render(
            <CoverageGapsWidget counts={{ legislative: 0, contractual: 4, market: 5, underReview: 4 }} labels={labels} />
        )
        const list = container.querySelector('[role="list"]')
        expect(list, "chips are not grouped").not.toBeNull()
        expect(list!.getAttribute("aria-label")).toBe("Open findings by priority")
        expect(list!.querySelectorAll('[role="listitem"]').length).toBe(2)
    })

    it("keeps colour off the critical path — every chip carries its word", () => {
        const { container } = render(
            <CoverageGapsWidget counts={{ legislative: 1, contractual: 4, market: 0, underReview: 0 }} labels={labels} />
        )
        const items = Array.from(container.querySelectorAll('[role="listitem"]'))
        expect(items.map((i) => i.textContent)).toEqual(["1 legal", "4 contractual"])
        // The dot is decoration; it must never be the only carrier.
        container.querySelectorAll("span.rounded-full.h-1\\.5").forEach((dot) => {
            expect(dot.getAttribute("aria-hidden")).toBeTruthy()
        })
    })

    it("renders no list at all when there is nothing to tally", () => {
        const { container } = render(
            <CoverageGapsWidget counts={{ legislative: 0, contractual: 0, market: 0, underReview: 0 }} labels={labels} />
        )
        expect(container.querySelector('[role="list"]')).toBeNull()
    })
})
