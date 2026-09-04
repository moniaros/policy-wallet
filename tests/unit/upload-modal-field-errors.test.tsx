import { describe, it, expect, vi, beforeEach } from "vitest"
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
 * The harness saw the literal «VALIDATION_ERROR» on the CONFIRM step for a
 * `customer.taxId` checksum failure — a field that lives on the RESOLVE step.
 * The modal now localises the code, jumps back to the step that owns the
 * field, and marks the input aria-invalid with the message beside it. A
 * policy-field issue stays on confirm and marks that input instead.
 */
const up = el.agentModals.uploadPolicy
const ac = el.agentModals.addCustomer

function renderModal() {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <UploadPolicyModal isOpen onClose={vi.fn()} />
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

/** Upload → resolve (new customer, the scan found nobody) → confirm. */
async function reachConfirmAsNewCustomer() {
    fireEvent.click(screen.getByLabelText(up.preScanAttestation, { exact: false }))
    dropFile()
    await screen.findByText(up.resolveKicker)
    fireEvent.change(screen.getByLabelText(ac.taxId), { target: { value: "123456789" } })
    fireEvent.click(screen.getByRole("button", { name: up.createNewOption }))
    await screen.findByText(up.confirmKicker)
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scanPolicyForResolution).mockResolvedValue({
        success: true,
        extraction: {
            customerName: "Μαρία",
            customerSurname: "Παπαδοπούλου",
            customerEmail: "maria@example.gr",
            customerPhone: "6912345678",
            insurerName: "Interamerican",
            policyNumber: "POL-42",
            lineOfBusiness: "motor",
            startDate: "2026-01-01",
            endDate: "2027-01-01",
        },
        resolution: { candidates: [], conflict: false },
    } as any)
})

describe("UploadPolicyModal — a failure on confirm lands on the step that owns the field", () => {
    it("a customer.taxId checksum failure goes back to the customer step with the ΑΦΜ marked", async () => {
        vi.mocked(commitScannedPolicy).mockResolvedValue({
            success: false,
            error: "VALIDATION_ERROR",
            details: [{ path: "customer.taxId", code: "custom", message: "invalid_afm_checksum" }],
        } as any)
        renderModal()
        await reachConfirmAsNewCustomer()
        fireEvent.click(screen.getByText(up.submitCreate))

        // Back on the resolve step…
        await screen.findByText(up.resolveKicker)
        expect(screen.queryByText(up.confirmKicker)).toBeNull()
        // …with the alert localised and the field marked.
        expect(screen.getByRole("alert").textContent).toBe(el.apiErrors.validationError)
        const taxId = screen.getByLabelText(ac.taxId) as HTMLInputElement
        expect(taxId.getAttribute("aria-invalid")).toBe("true")
        expect(document.getElementById(taxId.getAttribute("aria-describedby")!)?.textContent).toBe(el.formErrors.invalidAfmChecksum)
        expect(document.body.textContent).not.toContain("VALIDATION_ERROR")
        expect(document.body.textContent).not.toContain("invalid_afm_checksum")
    })

    it("a policy-field failure stays on confirm and marks that input", async () => {
        vi.mocked(commitScannedPolicy).mockResolvedValue({
            success: false,
            error: "VALIDATION_ERROR",
            details: [{ path: "endDate", code: "custom", message: "end_before_start" }],
        } as any)
        renderModal()
        await reachConfirmAsNewCustomer()
        fireEvent.click(screen.getByText(up.submitCreate))

        await screen.findByRole("alert")
        expect(screen.getByText(up.confirmKicker)).toBeTruthy()
        const endDate = screen.getByLabelText(ac.endDate) as HTMLInputElement
        expect(endDate.getAttribute("aria-invalid")).toBe("true")
        expect(document.getElementById(endDate.getAttribute("aria-describedby")!)?.textContent).toBe(el.formErrors.endBeforeStart)
    })

    it("a non-validation code is localised too, with its numbers", async () => {
        vi.mocked(commitScannedPolicy).mockResolvedValue({
            success: false, error: "POLICY_PER_CUSTOMER_LIMIT", current: 3, limit: 3,
        } as any)
        renderModal()
        await reachConfirmAsNewCustomer()
        fireEvent.click(screen.getByText(up.submitCreate))

        const alert = await screen.findByRole("alert")
        expect(alert.textContent).toContain("3/3")
        expect(alert.textContent).not.toContain("POLICY_PER_CUSTOMER_LIMIT")
    })

    it("a file-level rejection keeps its own reason code", async () => {
        vi.mocked(commitScannedPolicy).mockResolvedValue({
            success: false, error: "File is encrypted", errorCode: "encrypted",
        } as any)
        renderModal()
        await reachConfirmAsNewCustomer()
        fireEvent.click(screen.getByText(up.submitCreate))

        const alert = await screen.findByRole("alert")
        expect(alert.textContent).toBe(el.uploadRejection.encrypted)
    })
})

describe("UploadPolicyModal — the scanned phone travels with the new customer (D3)", () => {
    it("pre-fills the phone field from the extraction and sends it on commit", async () => {
        vi.mocked(commitScannedPolicy).mockResolvedValue({ success: true, policyId: "p", customerId: "c", created: true, analysis: "none" } as any)
        renderModal()
        fireEvent.click(screen.getByLabelText(up.preScanAttestation, { exact: false }))
        dropFile()
        await screen.findByText(up.resolveKicker)
        const phone = screen.getByLabelText(ac.phoneNumber) as HTMLInputElement
        expect(phone.value).toBe("6912345678")
        // No email: ΑΦΜ + phone are enough to continue.
        fireEvent.change(screen.getByLabelText(ac.emailAddress), { target: { value: "" } })
        fireEvent.change(screen.getByLabelText(ac.taxId), { target: { value: "123456783" } })
        const next = screen.getByRole("button", { name: up.createNewOption }) as HTMLButtonElement
        expect(next.disabled).toBe(false)
        fireEvent.click(next)
        await screen.findByText(up.confirmKicker)
        fireEvent.click(screen.getByText(up.submitCreate))
        await screen.findByText(`${up.successTitle} ${up.successAccent}`)

        const decision = vi.mocked(commitScannedPolicy).mock.calls[0]![0] as any
        expect(decision).toMatchObject({ mode: "create_new", customer: { email: "", phone: "6912345678", taxId: "123456783" } })
    })
})
