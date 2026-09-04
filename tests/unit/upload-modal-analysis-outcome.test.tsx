import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { UploadPolicyModal } from "@/components/agent/UploadPolicyModal"
import { commitScannedPolicy, scanPolicyForResolution } from "@/app/(protected)/agent/actions"
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

/**
 * H1 — the modal renders what the action DECIDED, never a promise.
 *
 * The token gate used to run only inside the deferred after() of
 * addPolicyForCustomer, so the success step had already said «Η ανάλυση
 * εκτελείται στο παρασκήνιο» when createRun refused — and on the free agent
 * tier it refused every time (a document run estimates at ~211k tokens
 * against a 150k monthly budget). The action now returns
 * `analysis: 'queued' | 'blocked_quota' | 'blocked_consent' | 'none'`
 * and the modal renders each truthfully.
 *
 * M2 — the pre-scan mandate attestation: the dropzone stays disabled until
 * it is ticked, and the FormData that reaches the scan carries attested=true.
 */
const up = el.agentModals.uploadPolicy

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

function dropFile() {
    const input = document.getElementById("upload-policy-file") as HTMLInputElement
    const file = new File(["%PDF-1.4 test"], "policy.pdf", { type: "application/pdf" })
    Object.defineProperty(input, "files", { value: [file], configurable: true })
    fireEvent.change(input)
}

async function reachSuccessWith(analysis: string) {
    vi.mocked(commitScannedPolicy).mockResolvedValue({
        success: true,
        policyId: "pol-1",
        customerId: "cust-1",
        created: false,
        analysis,
    } as any)
    fireEvent.click(screen.getByLabelText(up.preScanAttestation, { exact: false }))
    dropFile()
    await screen.findByText(up.confirmKicker)
    fireEvent.click(screen.getByText(up.submitAttach))
    await screen.findByText(`${up.successTitle} ${up.successAccent}`)
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scanPolicyForResolution).mockResolvedValue({
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
    } as any)
})

describe("UploadPolicyModal — pre-scan mandate attestation (M2)", () => {
    it("keeps the dropzone disabled until the attestation is ticked, and never scans without it", async () => {
        renderPreset()
        const input = document.getElementById("upload-policy-file") as HTMLInputElement
        expect(input.disabled).toBe(true)
        dropFile()
        expect(scanPolicyForResolution).not.toHaveBeenCalled()

        fireEvent.click(screen.getByLabelText(up.preScanAttestation, { exact: false }))
        expect(input.disabled).toBe(false)
    })

    it("sends attested=true with the document once ticked", async () => {
        renderPreset()
        fireEvent.click(screen.getByLabelText(up.preScanAttestation, { exact: false }))
        dropFile()
        await screen.findByText(up.confirmKicker)

        expect(scanPolicyForResolution).toHaveBeenCalledTimes(1)
        const fd = vi.mocked(scanPolicyForResolution).mock.calls[0]![0] as FormData
        expect(fd.get("attested")).toBe("true")
        expect(fd.get("file")).toBeInstanceOf(File)
    })

    it("names the server's refusal in the agent's language instead of echoing the code", async () => {
        vi.mocked(scanPolicyForResolution).mockResolvedValue({ success: false, error: "AGENT_ATTESTATION_REQUIRED" } as any)
        renderPreset()
        fireEvent.click(screen.getByLabelText(up.preScanAttestation, { exact: false }))
        dropFile()
        await screen.findByRole("alert")
        expect(screen.getByRole("alert").textContent).toBe(el.apiErrors.agentAttestationRequired)
        expect(document.body.textContent).not.toContain("AGENT_ATTESTATION_REQUIRED")
    })
})

describe("UploadPolicyModal — the success step reports the action's verdict (H1)", () => {
    it("blocked_quota: says the policy was saved and what a reading needs — never «εκτελείται»", async () => {
        renderPreset()
        await reachSuccessWith("blocked_quota")

        expect(screen.getByTestId("upload-policy-analysis-blocked-quota")).toBeTruthy()
        expect(screen.getByText(up.analysisBlockedQuota)).toBeTruthy()
        // The way out is the advisor plans, not the B2C pricing page.
        const link = screen.getByText(el.analysis.actions.viewAgentPlans).closest("a")
        expect(link?.getAttribute("href")).toBe("/agent/pricing")
        expect(screen.queryByText(up.analysisStarted)).toBeNull()
        expect(document.body.textContent).not.toMatch(/εκτελείται στο παρασκήνιο/)
    })

    it("queued: only then does it say the analysis is running", async () => {
        renderPreset()
        await reachSuccessWith("queued")

        expect(screen.getByText(up.analysisStarted)).toBeTruthy()
        expect(screen.queryByTestId("upload-policy-analysis-blocked-quota")).toBeNull()
    })

    it("blocked_consent: asks for the customer's consent and offers to request it", async () => {
        renderPreset()
        await reachSuccessWith("blocked_consent")

        expect(screen.getByText(up.analysisConsentRequired)).toBeTruthy()
        expect(screen.getByText(up.requestConsentCta)).toBeTruthy()
        expect(screen.queryByText(up.analysisStarted)).toBeNull()
    })

    it("none (no document): claims nothing about an analysis", async () => {
        renderPreset()
        await reachSuccessWith("none")

        expect(screen.queryByText(up.analysisStarted)).toBeNull()
        expect(screen.queryByText(up.analysisBlockedQuota)).toBeNull()
        expect(screen.queryByText(up.analysisConsentRequired)).toBeNull()
    })
})
