import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { GettingStartedChecklist } from "@/components/dashboard/GettingStartedChecklist"

const baseProps = {
    language: "en" as const,
    policyCount: 1,
    hasAnalysis: false,
    gapCount: 0,
    hasAgent: false,
    notificationsEnabled: false,
}

// Clear any localStorage dismissal state between tests
beforeEach(() => {
    localStorage.removeItem("pw-checklist-dismissed")
})

describe("GettingStartedChecklist — link routes", () => {
    it("Enable notifications link points to /notifications, not /settings", () => {
        render(<GettingStartedChecklist {...baseProps} />)
        const link = screen.getByRole("link", { name: /enable notifications/i })
        expect(link).toHaveAttribute("href", "/notifications")
        expect(link).not.toHaveAttribute("href", "/settings")
    })

    it("Upload a policy link points to /wallet/add", () => {
        render(<GettingStartedChecklist {...baseProps} policyCount={0} />)
        const link = screen.getByRole("link", { name: /upload a policy/i })
        expect(link).toHaveAttribute("href", "/wallet/add")
    })

    it("Check coverage gaps link points to /coverage-insights", () => {
        render(<GettingStartedChecklist {...baseProps} hasAnalysis={false} gapCount={1} />)
        const link = screen.getByRole("link", { name: /check coverage gaps/i })
        expect(link).toHaveAttribute("href", "/coverage-insights")
    })
})

describe("GettingStartedChecklist — analysis completion (finding 2)", () => {
    it("analysis item shows as incomplete when hasAnalysis=false", () => {
        render(<GettingStartedChecklist {...baseProps} hasAnalysis={false} />)
        // Incomplete items show their description text
        expect(screen.getByText(/see what ai discovered/i)).toBeInTheDocument()
    })

    it("analysis item shows as complete when hasAnalysis=true (covers completed_with_warnings)", () => {
        render(<GettingStartedChecklist {...baseProps} hasAnalysis={true} />)
        // Completed items show a strikethrough title and hide description
        const title = screen.getByText("Review AI analysis")
        expect(title).toHaveClass("line-through")
        expect(screen.queryByText(/see what ai discovered/i)).not.toBeInTheDocument()
    })
})

describe("GettingStartedChecklist — gaps completion (finding 3)", () => {
    it("gaps item is NOT complete when no analysis has run even if gapCount is 0", () => {
        render(
            <GettingStartedChecklist
                {...baseProps}
                hasAnalysis={false}
                gapCount={0}
                policyCount={1}
            />
        )
        // Incomplete items show their description
        expect(screen.getByText(/check if there are gaps/i)).toBeInTheDocument()
        const title = screen.getByText("Check coverage gaps")
        expect(title).not.toHaveClass("line-through")
    })

    it("gaps item IS complete when analysis ran and gapCount is 0", () => {
        render(
            <GettingStartedChecklist
                {...baseProps}
                hasAnalysis={true}
                gapCount={0}
                policyCount={1}
            />
        )
        const title = screen.getByText("Check coverage gaps")
        expect(title).toHaveClass("line-through")
        expect(screen.queryByText(/check if there are gaps/i)).not.toBeInTheDocument()
    })

    it("gaps item is NOT complete when analysis ran but gaps exist", () => {
        render(
            <GettingStartedChecklist
                {...baseProps}
                hasAnalysis={true}
                gapCount={2}
                policyCount={1}
            />
        )
        const title = screen.getByText("Check coverage gaps")
        expect(title).not.toHaveClass("line-through")
    })
})
