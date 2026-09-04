import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { AddCustomerModal } from "@/components/agent/AddCustomerModal"
import { addCustomerManually } from "@/app/(protected)/agent/actions"
import { el } from "@/lib/i18n/translations/el"

vi.mock("@/app/(protected)/agent/actions", () => ({ addCustomerManually: vi.fn() }))

/**
 * The manual door rendered `result.error` raw — a code, in a Greek product.
 * A failure is now the dictionary line as the alert, and each Zod issue lands
 * beside the input that owns it, marked aria-invalid and described by it.
 */
const ac = el.agentModals.addCustomer

function renderModal() {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <AddCustomerModal isOpen onClose={vi.fn()} />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

function openManualAndFill() {
    fireEvent.click(screen.getByText(ac.manualTitle))
    fireEvent.change(screen.getByLabelText(ac.firstName), { target: { value: "Νίκος" } })
    fireEvent.change(screen.getByLabelText(ac.lastName), { target: { value: "Ιωάννου" } })
    fireEvent.change(screen.getByLabelText(ac.taxId), { target: { value: "123456789" } })
}

function submit(container: HTMLElement) {
    fireEvent.submit(container.querySelector("form")!)
}

beforeEach(() => vi.clearAllMocks())

describe("AddCustomerModal — a validation failure lands on the field, in Greek", () => {
    it("marks the ΑΦΜ input invalid with the checksum message beside it, and never shows the code", async () => {
        vi.mocked(addCustomerManually).mockResolvedValue({
            success: false,
            error: "VALIDATION_ERROR",
            details: [{ path: "taxId", code: "custom", message: "invalid_afm_checksum" }],
        } as any)
        const { container } = renderModal()
        openManualAndFill()
        submit(container)

        const alert = await screen.findByRole("alert")
        expect(alert.textContent).toBe(el.apiErrors.validationError)

        const taxId = screen.getByLabelText(ac.taxId) as HTMLInputElement
        expect(taxId.getAttribute("aria-invalid")).toBe("true")
        const describedBy = taxId.getAttribute("aria-describedby")
        expect(describedBy).toBeTruthy()
        expect(document.getElementById(describedBy!)?.textContent).toBe(el.formErrors.invalidAfmChecksum)

        // The other inputs are untouched.
        expect((screen.getByLabelText(ac.firstName) as HTMLInputElement).getAttribute("aria-invalid")).toBeNull()
        expect(document.body.textContent).not.toContain("VALIDATION_ERROR")
        expect(document.body.textContent).not.toContain("invalid_afm_checksum")
    })

    it("localises a limit code with its numbers", async () => {
        vi.mocked(addCustomerManually).mockResolvedValue({
            success: false, error: "CUSTOMER_LIMIT_REACHED", current: 5, limit: 5,
        } as any)
        const { container } = renderModal()
        openManualAndFill()
        submit(container)

        const alert = await screen.findByRole("alert")
        expect(alert.textContent).toContain("5/5")
        expect(alert.textContent).not.toContain("CUSTOMER_LIMIT_REACHED")
    })

    it("a policy-field issue opens the policy block and marks that input", async () => {
        vi.mocked(addCustomerManually).mockResolvedValue({
            success: false,
            error: "VALIDATION_ERROR",
            details: [{ path: "policy.endDate", code: "custom", message: "end_before_start" }],
        } as any)
        const { container } = renderModal()
        openManualAndFill()
        submit(container)

        await screen.findByRole("alert")
        await waitFor(() => {
            const endDate = screen.getByLabelText(ac.endDate) as HTMLInputElement
            expect(endDate.getAttribute("aria-invalid")).toBe("true")
            expect(document.getElementById(endDate.getAttribute("aria-describedby")!)?.textContent).toBe(el.formErrors.endBeforeStart)
        })
    })

    it("clears the field marks on the next attempt", async () => {
        vi.mocked(addCustomerManually)
            .mockResolvedValueOnce({
                success: false, error: "VALIDATION_ERROR",
                details: [{ path: "taxId", code: "custom", message: "invalid_afm_checksum" }],
            } as any)
            .mockResolvedValueOnce({ success: true, customerId: "c1" } as any)
        const { container } = renderModal()
        openManualAndFill()
        submit(container)
        await screen.findByRole("alert")
        submit(container)
        await screen.findByText(`${ac.successTitle} ${ac.successAccent}`)
        expect(screen.queryByRole("alert")).toBeNull()
    })
})

describe("AddCustomerModal — email is optional (D3)", () => {
    it("does not require the email input and explains what stands in for it", () => {
        renderModal()
        fireEvent.click(screen.getByText(ac.manualTitle))
        const email = screen.getByLabelText(ac.emailAddress) as HTMLInputElement
        expect(email.required).toBe(false)
        expect(document.getElementById(email.getAttribute("aria-describedby")!)?.textContent).toBe(ac.emailOptionalHint)
    })

    it("sends the ΑΦΜ + phone through when no email is typed", async () => {
        vi.mocked(addCustomerManually).mockResolvedValue({ success: true, customerId: "c1" } as any)
        const { container } = renderModal()
        openManualAndFill()
        fireEvent.change(screen.getByLabelText(ac.phoneNumber), { target: { value: "6912345678" } })
        submit(container)
        await screen.findByText(`${ac.successTitle} ${ac.successAccent}`)
        expect(vi.mocked(addCustomerManually).mock.calls[0]![0]).toMatchObject({ email: "", phone: "6912345678", taxId: "123456789" })
    })
})
