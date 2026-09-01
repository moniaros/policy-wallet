import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { StyleguidePresentations } from "@/app/(public)/styleguide/StyleguidePresentations"

/**
 * D4 (audit ladder): the compact/regular/expanded declaration — the same
 * widget carries the same FACTS at 375, 768 and 1100. A presentation that
 * drops a fact at a width fails here before it fails a user.
 */
describe("three presentations, same facts", () => {
    it("every fact renders in all three containers", () => {
        const { container } = render(<StyleguidePresentations />)
        const panes = [...container.querySelectorAll("[data-presentation]")]
        expect(panes.map((p) => p.getAttribute("data-presentation"))).toEqual(["375", "768", "1100"])
        const FACTS = ["22", "5", "3", "30", "8.224 €", "1,3 εκ. €", "84 €", "Αυτοκίνητο", "Κατοικία", "Υγεία", "Ζωή", "Καλύπτονται", "Χωρίς κάλυψη", "Για έλεγχο", "δεν έχετε"]
        for (const pane of panes) {
            const text = (pane.textContent || "").replace(/\s+/g, " ")
            for (const fact of FACTS) {
                expect(text, `fact «${fact}» missing at ${pane.getAttribute("data-presentation")}px`).toContain(fact)
            }
        }
    })
})
