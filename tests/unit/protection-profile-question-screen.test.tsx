import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { QuestionScreen } from "@/components/onboarding/protection-profile/QuestionScreen"
import { UNSURE } from "@/lib/services/protection-profile/vocabulary"

const base = {
    prompt: "Πού μένεις;",
    why: "Το σπίτι είναι συνήθως το μεγαλύτερο πράγμα που έχει κανείς να προστατέψει.",
    whyLabel: "Γιατί ρωτάμε",
    options: [
        { value: "owned", label: "Σε δικό μου σπίτι" },
        { value: "rented", label: "Σε νοικιασμένο" },
    ],
    savingLabel: "Αποθήκευση…",
    retryLabel: "Δοκίμασε ξανά",
    errorText: "Δεν αποθηκεύτηκε.",
}

describe("QuestionScreen", () => {
    it("single-select: real buttons with aria-pressed, an h1, 44px targets", () => {
        const onSelect = vi.fn()
        const { container } = render(
            <QuestionScreen {...base} kind="single" selected="owned" onSelect={onSelect} status="idle" cta={{ label: "Συνέχεια", onClick: vi.fn(), visible: true }} />
        )
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Πού μένεις;")
        const pressed = container.querySelectorAll('button[aria-pressed="true"]')
        expect(pressed).toHaveLength(1)
        fireEvent.click(screen.getByRole("button", { name: "Σε νοικιασμένο" }))
        expect(onSelect).toHaveBeenCalledWith("rented")
        for (const button of Array.from(container.querySelectorAll("button"))) {
            expect(button.className, button.textContent ?? "").toMatch(/min-h-11|h-11/)
        }
    })

    it("multi-select: real checkboxes plus the «none of these» answer", () => {
        const onToggle = vi.fn()
        const onNone = vi.fn()
        const { container } = render(
            <QuestionScreen {...base} kind="multi" selected={["owned"]} onSelect={vi.fn()} onToggle={onToggle} noneLabel="Κανένα από αυτά" onNone={onNone} status="idle" cta={{ label: "Συνέχεια", onClick: vi.fn(), visible: true }} />
        )
        const boxes = container.querySelectorAll('input[type="checkbox"]')
        expect(boxes).toHaveLength(2)
        expect((boxes[0] as HTMLInputElement).checked).toBe(true)
        fireEvent.click(boxes[1])
        expect(onToggle).toHaveBeenCalledWith("rented")
        fireEvent.click(screen.getByRole("button", { name: "Κανένα από αυτά" }))
        expect(onNone).toHaveBeenCalled()
    })

    it("«δεν είμαι σίγουρος/η» reveals an inline panel and never a new screen", () => {
        const onUnsure = vi.fn()
        render(
            <QuestionScreen {...base} kind="single" selected={undefined} onSelect={vi.fn()} status="idle" cta={{ label: "Συνέχεια", onClick: vi.fn(), visible: false }}
                unsure={{ label: "Δεν είμαι σίγουρος/η", discovery: "Σκέψου ποιος θα δυσκολευόταν.", proceedLabel: "Προχώρα χωρίς απάντηση", onUnsure }} />
        )
        const toggle = screen.getByRole("button", { name: "Δεν είμαι σίγουρος/η" })
        expect(toggle).toHaveAttribute("aria-expanded", "false")
        fireEvent.click(toggle)
        expect(toggle).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByText("Σκέψου ποιος θα δυσκολευόταν.")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Προχώρα χωρίς απάντηση" }))
        expect(onUnsure).toHaveBeenCalled()
    })

    it("an unsure answer shows as pressed on the unsure control", () => {
        render(
            <QuestionScreen {...base} kind="single" selected={UNSURE} onSelect={vi.fn()} status="idle" cta={{ label: "Συνέχεια", onClick: vi.fn(), visible: false }}
                unsure={{ label: "Δεν είμαι σίγουρος/η", discovery: "…", proceedLabel: "Προχώρα", onUnsure: vi.fn() }} />
        )
        expect(screen.getByRole("button", { name: "Δεν είμαι σίγουρος/η" })).toHaveAttribute("aria-pressed", "true")
    })

    it("saving keeps the label and disables; an error is an alert and the answer stays", () => {
        const { rerender } = render(
            <QuestionScreen {...base} kind="single" selected="owned" onSelect={vi.fn()} status="saving" cta={{ label: "Συνέχεια", onClick: vi.fn(), visible: true }} />
        )
        const cta = screen.getByRole("button", { name: /Αποθήκευση/ })
        expect(cta).toBeDisabled()
        rerender(<QuestionScreen {...base} kind="single" selected="owned" onSelect={vi.fn()} status="error" cta={{ label: "Συνέχεια", onClick: vi.fn(), visible: true }} />)
        expect(screen.getByRole("alert")).toHaveTextContent("Δεν αποθηκεύτηκε.")
        expect(screen.getByRole("button", { name: "Σε δικό μου σπίτι" })).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByRole("button", { name: "Δοκίμασε ξανά" })).toBeTruthy()
    })
})
