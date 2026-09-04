import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { UploadPolicyModal } from "@/components/agent/UploadPolicyModal"
import { scanPolicyForResolution } from "@/app/(protected)/agent/actions"
import { el } from "@/lib/i18n/translations/el"

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
vi.mock("@/app/(protected)/agent/actions", () => ({
    scanPolicyForResolution: vi.fn(),
    commitScannedPolicy: vi.fn(),
    requestAiConsent: vi.fn(),
}))
// The shared Modal animates with framer-motion; render its elements as plain
// DOM so the consent dialog mounts synchronously under jsdom.
vi.mock("framer-motion", () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, {
        get: () => React.forwardRef<HTMLDivElement, any>(function MotionStub(props, ref) {
            const { children, initial, animate, exit, transition, whileHover, whileTap, ...domProps } = props
            return <div ref={ref} {...domProps}>{children}</div>
        }),
    }),
}))

/**
 * The scan refuses with AI_CONSENT_REQUIRED when the ADVISOR's own
 * AI-processing consent is unset — every fresh advisor account. That used to
 * be a dead end: the message pointed at «ρυθμίσεις απορρήτου», the only
 * consent page redirected to /dashboard afterwards, and the upload was lost.
 *
 * Now the consent is captured in the flow: the file stays, the shared consent
 * modal opens over this one, and an accept re-runs the scan with the same
 * file and the same attestation. A dismiss keeps the message and adds the
 * standalone page as a soft link — still no dead end.
 */
const up = el.agentModals.uploadPolicy

const SCAN_OK = {
    success: true,
    extraction: {
        customerName: "Μαρία",
        customerSurname: "Παπαδοπούλου",
        insurerName: "Interamerican",
        policyNumber: "POL-42",
        lineOfBusiness: "motor",
        startDate: "2026-01-01",
        endDate: "2027-01-01",
    },
    resolution: { candidates: [], conflict: false },
}
const CONSENT_REFUSED = { success: false, error: "AI_CONSENT_REQUIRED" }

let fetchMock: ReturnType<typeof vi.fn>

function renderPreset() {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <UploadPolicyModal
                    isOpen
                    onClose={vi.fn()}
                    presetCustomerId="cust-1"
                    presetCustomerName="Μαρία Παπαδοπούλου"
                    presetCustomerConsent="granted"
                />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

const attestation = () => screen.getByLabelText(up.preScanAttestation, { exact: false }) as HTMLInputElement

function dropFile() {
    const input = document.getElementById("upload-policy-file") as HTMLInputElement
    const file = new File(["%PDF-1.4 test"], "policy.pdf", { type: "application/pdf" })
    Object.defineProperty(input, "files", { value: [file], configurable: true })
    fireEvent.change(input)
}

const consentDialog = () => screen.findByRole("dialog", { name: el.common.aiConsentTitle })
const scanCalls = () => vi.mocked(scanPolicyForResolution).mock.calls.map((c) => c[0] as FormData)

beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("UploadPolicyModal — the advisor's own AI consent is captured in the flow", () => {
    it("AI_CONSENT_REQUIRED opens the consent modal over the kept file — no error, no code, attestation intact", async () => {
        vi.mocked(scanPolicyForResolution).mockResolvedValueOnce(CONSENT_REFUSED as any)
        renderPreset()
        fireEvent.click(attestation())
        dropFile()

        const dialog = await consentDialog()
        expect(dialog).toBeTruthy()
        expect(screen.getByRole("button", { name: el.common.aiConsentAccept })).toBeTruthy()
        // The upload step is still underneath with its state: nothing was
        // reset, the attestation survives, and no refusal is shown yet.
        expect(attestation().checked).toBe(true)
        expect(screen.queryByRole("alert")).toBeNull()
        expect(document.body.textContent).not.toContain("AI_CONSENT_REQUIRED")
        expect(scanPolicyForResolution).toHaveBeenCalledTimes(1)
    })

    it("accepting records the consent from this flow and re-runs the scan with the same file and attested=true", async () => {
        vi.mocked(scanPolicyForResolution)
            .mockResolvedValueOnce(CONSENT_REFUSED as any)
            .mockResolvedValueOnce(SCAN_OK as any)
        renderPreset()
        fireEvent.click(attestation())
        dropFile()
        await consentDialog()

        fireEvent.click(screen.getByRole("button", { name: el.common.aiConsentAccept }))

        // The retry ran and the flow moved on to the confirm step by itself.
        await screen.findByText(up.confirmKicker)
        expect(screen.queryByRole("dialog", { name: el.common.aiConsentTitle })).toBeNull()

        // Consent went to the API tagged with THIS surface.
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]!
        expect(url).toBe("/api/v1/consents")
        expect(JSON.parse(init.body)).toMatchObject({ consentType: "ai_processing", source: "agent_upload" })

        // Same File object, same attestation — nothing re-picked or re-ticked.
        expect(scanPolicyForResolution).toHaveBeenCalledTimes(2)
        const [first, second] = scanCalls()
        expect(second!.get("attested")).toBe("true")
        expect(second!.get("file")).toBe(first!.get("file"))
        expect((second!.get("file") as File).name).toBe("policy.pdf")
    })

    it("dismissing keeps the message and links to /consent/ai as a soft pill — no second scan, no dead end", async () => {
        vi.mocked(scanPolicyForResolution).mockResolvedValueOnce(CONSENT_REFUSED as any)
        renderPreset()
        fireEvent.click(attestation())
        dropFile()
        await consentDialog()

        fireEvent.click(screen.getByRole("button", { name: el.common.aiConsentCancel }))

        await waitFor(() => expect(screen.queryByRole("dialog", { name: el.common.aiConsentTitle })).toBeNull())
        expect(screen.getByRole("alert").textContent).toBe(el.apiErrors.aiConsentRequired)
        const link = screen.getByText(up.agentConsentLink).closest("a")
        expect(link?.getAttribute("href")).toBe("/consent/ai")
        expect(link?.className).toContain("pw-soft-button")
        expect(link?.className).not.toContain("pw-primary-button")

        expect(fetchMock).not.toHaveBeenCalled()
        expect(scanPolicyForResolution).toHaveBeenCalledTimes(1)
        // The attestation survives the dismissal.
        expect(attestation().checked).toBe(true)
    })

    it("a refusal that survives the recorded consent falls back to the message and link — never a second modal", async () => {
        vi.mocked(scanPolicyForResolution)
            .mockResolvedValueOnce(CONSENT_REFUSED as any)
            .mockResolvedValueOnce(CONSENT_REFUSED as any)
        renderPreset()
        fireEvent.click(attestation())
        dropFile()
        await consentDialog()

        fireEvent.click(screen.getByRole("button", { name: el.common.aiConsentAccept }))

        await screen.findByRole("alert")
        expect(screen.getByRole("alert").textContent).toBe(el.apiErrors.aiConsentRequired)
        expect(screen.getByText(up.agentConsentLink).closest("a")?.getAttribute("href")).toBe("/consent/ai")
        expect(screen.queryByRole("dialog", { name: el.common.aiConsentTitle })).toBeNull()
        expect(scanPolicyForResolution).toHaveBeenCalledTimes(2)
    })

    it("a successful scan never opens the consent modal and shows no link", async () => {
        vi.mocked(scanPolicyForResolution).mockResolvedValueOnce(SCAN_OK as any)
        renderPreset()
        fireEvent.click(attestation())
        dropFile()

        await screen.findByText(up.confirmKicker)
        expect(screen.queryByRole("dialog", { name: el.common.aiConsentTitle })).toBeNull()
        expect(screen.queryByText(up.agentConsentLink)).toBeNull()
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
