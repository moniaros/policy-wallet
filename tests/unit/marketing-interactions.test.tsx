import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { DeviceFrame } from "@/src/design-system/product"
import GuidesIndex from "@/app/(public)/guides/GuidesIndexClient"
import { ProductWalkthrough } from "@/components/landing/ProductWalkthrough"

const track = vi.hoisted(() => vi.fn())
vi.mock("@/lib/analytics/google-analytics", () => ({ trackGoogleEvent: track }))
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "el" }) }))
vi.mock("@/components/landing/LoBPageShell", () => ({ LoBPageShell: ({ children }: any) => <main>{children}</main> }))
vi.mock("@/components/growth/HookTicker", () => ({ HookTicker: () => null }))
vi.mock("next/image", () => ({ default: ({ onError, ...props }: any) => <img {...props} /> }))

beforeEach(() => {
    track.mockClear()
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} })
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe("Marketing interactions", () => {
    it("keeps manual previews stable and makes hidden screens inert", () => {
        vi.useFakeTimers()
        const { container } = render(<DeviceFrame autoplay={false} screens={[
            { id: "a", label: "First", content: <button>First action</button> },
            { id: "b", label: "Second", content: <button>Second action</button> },
        ]} />)
        vi.advanceTimersByTime(10000)
        expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-pressed", "true")
        fireEvent.click(screen.getByRole("button", { name: "Second" }))
        expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute("aria-pressed", "true")
        expect(container.querySelector('[aria-hidden="true"]')).toHaveAttribute("inert")
    })
    it("matches Greek search without accents, resets, and never sends search text", () => {
        render(<GuidesIndex />)
        const input = screen.getByRole("searchbox")
        fireEvent.change(input, { target: { value: "ΑΝΑΝΕΩΣΗ" } })
        expect(screen.getByRole("status")).not.toHaveTextContent(": 0")
        fireEvent.submit(screen.getByRole("search"))
        expect(track).toHaveBeenLastCalledWith("marketing_guide_search", expect.objectContaining({ control: "search", locale: "el" }))
        expect(JSON.stringify(track.mock.calls)).not.toContain("ΑΝΑΝΕΩΣΗ")
        fireEvent.change(input, { target: { value: "zzzzzzzzzz" } })
        expect(screen.getByText(/Δεν βρέθηκε οδηγός/)).toBeVisible()
        fireEvent.click(screen.getByRole("button", { name: "Καθαρισμός" }))
        expect(input).toHaveValue("")
        expect(screen.queryByText(/Δεν βρέθηκε οδηγός/)).not.toBeInTheDocument()
    })
    it("shows sample findings on explicit selection without losing plan qualifications", () => {
        render(<ProductWalkthrough locale="en" />)
        fireEvent.click(screen.getByRole("button", { name: /keep you in the loop/ }))
        expect(screen.getByText("What needs attention")).toBeVisible()
        expect(screen.getByText(/An example showing/)).toBeVisible()
        expect(screen.getByText(/from the Plus plan/)).toBeVisible()
        expect(track).toHaveBeenCalledWith("marketing_preview_select", { route: "/en/product", locale: "en", control: "step_3" })
    })
})
