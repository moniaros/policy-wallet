import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AudienceTabs } from "@/components/landing/AudienceTabs"

describe("AudienceTabs", () => {
    describe("WAI-ARIA tab semantics", () => {
        it("renders a tablist with two tabs", () => {
            render(<AudienceTabs isGreek={false} />)
            expect(screen.getByRole("tablist")).toBeInTheDocument()
            expect(screen.getAllByRole("tab")).toHaveLength(2)
        })

        it("first tab is selected by default", () => {
            render(<AudienceTabs isGreek={false} />)
            const [phTab, agTab] = screen.getAllByRole("tab")
            expect(phTab).toHaveAttribute("aria-selected", "true")
            expect(agTab).toHaveAttribute("aria-selected", "false")
        })

        it("each tab references its panel via aria-controls", () => {
            render(<AudienceTabs isGreek={false} />)
            const [phTab, agTab] = screen.getAllByRole("tab")
            const phPanelId = phTab.getAttribute("aria-controls")!
            const agPanelId = agTab.getAttribute("aria-controls")!
            expect(document.getElementById(phPanelId)).toBeInTheDocument()
            expect(document.getElementById(agPanelId)).toBeInTheDocument()
        })

        it("active panel is visible, inactive panel is hidden", () => {
            render(<AudienceTabs isGreek={false} />)
            const panels = screen.getAllByRole("tabpanel", { hidden: true })
            const visible = panels.filter((p) => !p.hasAttribute("hidden"))
            const hidden = panels.filter((p) => p.hasAttribute("hidden"))
            expect(visible).toHaveLength(1)
            expect(hidden).toHaveLength(1)
        })

        it("clicking the agents tab updates aria-selected and shows agent panel", async () => {
            const user = userEvent.setup()
            render(<AudienceTabs isGreek={false} />)
            const [phTab, agTab] = screen.getAllByRole("tab")

            await user.click(agTab)

            expect(agTab).toHaveAttribute("aria-selected", "true")
            expect(phTab).toHaveAttribute("aria-selected", "false")
            const panels = screen.getAllByRole("tabpanel", { hidden: true })
            const visible = panels.filter((p) => !p.hasAttribute("hidden"))
            expect(visible).toHaveLength(1)
            expect(visible[0].getAttribute("aria-labelledby")).toBe(agTab.id)
        })

        it("ArrowRight key moves focus to agents tab", async () => {
            const user = userEvent.setup()
            render(<AudienceTabs isGreek={false} />)
            const [phTab, agTab] = screen.getAllByRole("tab")

            phTab.focus()
            await user.keyboard("{ArrowRight}")

            expect(agTab).toHaveAttribute("aria-selected", "true")
        })

        it("ArrowLeft key moves focus back to policyholders tab", async () => {
            const user = userEvent.setup()
            render(<AudienceTabs isGreek={false} />)
            const [phTab, agTab] = screen.getAllByRole("tab")

            // start on agents
            await user.click(agTab)
            agTab.focus()
            await user.keyboard("{ArrowLeft}")

            expect(phTab).toHaveAttribute("aria-selected", "true")
        })
    })

    describe("Localisation", () => {
        it('renders "Ιδιώτες" and "Ασφαλιστές" in Greek mode', () => {
            render(<AudienceTabs isGreek={true} />)
            expect(screen.getByRole("tab", { name: "Ιδιώτες" })).toBeInTheDocument()
            expect(screen.getByRole("tab", { name: "Ασφαλιστές" })).toBeInTheDocument()
        })

        it('renders "Individuals" and "Agents" in English mode', () => {
            render(<AudienceTabs isGreek={false} />)
            expect(screen.getByRole("tab", { name: "Individuals" })).toBeInTheDocument()
            expect(screen.getByRole("tab", { name: "Agents" })).toBeInTheDocument()
        })

        it('renders "Χωρίς κάλυψη" (not "Not covered") in Greek mode on the warning badge', async () => {
            const user = userEvent.setup()
            render(<AudienceTabs isGreek={true} />)
            // policyholders panel is visible by default and contains the gap badge
            expect(screen.queryByText("Not covered")).not.toBeInTheDocument()
            expect(screen.getByText("Χωρίς κάλυψη")).toBeInTheDocument()
        })

        it('renders "Not covered" (not "Χωρίς κάλυψη") in English mode on the warning badge', () => {
            render(<AudienceTabs isGreek={false} />)
            expect(screen.getByText("Not covered")).toBeInTheDocument()
            expect(screen.queryByText("Χωρίς κάλυψη")).not.toBeInTheDocument()
        })
    })
})
