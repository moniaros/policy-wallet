import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AudienceCards } from "@/components/landing/AudienceCards"

vi.mock("@/components/landing/real-screens/RealScreens", () => ({
    AppScreen: () => null, CoverageMapScreen: () => null, AdvisorScreen: () => null,
}))

// Both audiences are explained in full, with nothing behind a click
// (owner, 2026-10-08): the old tabs defaulted to «Ιδιώτες» and hid the agent story.
describe("AudienceCards", () => {
    for (const isGreek of [true, false]) {
        it(`${isGreek ? "el" : "en"}: renders both role cards visibly, with no tab switch`, () => {
            render(<AudienceCards isGreek={isGreek} />)
            expect(screen.queryByRole("tablist")).toBeNull()
            const headings = screen.getAllByRole("heading", { level: 3 })
            expect(headings).toHaveLength(2)
            for (const h of headings) expect(h).toBeVisible()
            expect(screen.getAllByRole("listitem")).toHaveLength(6)
        })
    }
})
