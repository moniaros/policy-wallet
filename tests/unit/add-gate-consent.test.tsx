import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getTranslations } from "@/lib/i18n"
import { LEGAL_POLICY_VERSIONS } from "@/lib/compliance/consent"
import { AddGate } from "@/app/(protected)/add/AddGate"

vi.mock("@/contexts/LanguageContext", () => ({
    useLanguage: () => ({ t: getTranslations("el"), language: "el" }),
}))
// The dropzone client pulls the supabase browser client — irrelevant here; the
// gate's contract is what this suite pins.
vi.mock("@/components/wallet/AddPolicyClient", () => ({
    AddPolicyClient: () => <div data-testid="dropzone" />,
}))

/**
 * The /add gate switch is the Article 9 consent ACT, and the analysis
 * pipeline's enforcement anchor is the ACCOUNT-level consent
 * (user.aiProcessingConsentVersion — the orchestrator refuses without it).
 * A switch that only flips local state produces exactly the shipped bug:
 * «Δεν ξεκίνησε: λείπει η συγκατάθεση για AI» after an upload the user
 * believed they had consented to. The gate must persist BEFORE it unlocks,
 * and must fail closed.
 */
describe("AddGate — the switch persists the account-level AI consent", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    const props = {
        insurers: [{ id: "i1", name: "Interamerican" }],
        types: [{ id: "t1", name: "Αυτοκίνητο", slug: "motor" }],
    }

    it("POSTs /api/v1/consents before unlocking, then shows the dropzone", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true })
        vi.stubGlobal("fetch", fetchMock)
        const user = userEvent.setup()
        render(<AddGate {...props} hasAccountConsent={false} />)

        expect(screen.queryByTestId("dropzone")).toBeNull()
        await user.click(screen.getByRole("switch"))

        await waitFor(() => expect(screen.getByTestId("dropzone")).toBeInTheDocument())
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe("/api/v1/consents")
        expect(JSON.parse((init as RequestInit).body as string)).toEqual({
            consentType: "ai_processing",
            locale: "el",
            source: "add_gate",
            policyVersion: LEGAL_POLICY_VERSIONS.ai_processing,
        })
    })

    it("fails closed: a rejected POST keeps the switch off and says why", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
        const user = userEvent.setup()
        render(<AddGate {...props} hasAccountConsent={false} />)

        await user.click(screen.getByRole("switch"))

        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
        expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false")
        expect(screen.queryByTestId("dropzone")).toBeNull()
    })

    it("an account that already consented gets no duplicate POST", async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal("fetch", fetchMock)
        const user = userEvent.setup()
        render(<AddGate {...props} hasAccountConsent={true} />)

        expect(screen.getByTestId("dropzone")).toBeInTheDocument()
        await user.click(screen.getByRole("switch")) // off
        await user.click(screen.getByRole("switch")) // on again
        expect(screen.getByTestId("dropzone")).toBeInTheDocument()
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
