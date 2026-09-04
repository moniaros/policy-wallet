import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { UploadPolicyModal } from '@/components/agent/UploadPolicyModal'
import { scanPolicyForResolution } from '@/app/(protected)/agent/actions'
import { el } from '@/lib/i18n/translations/el'

/**
 * QA round 4. UploadPolicyModal's `Field` helper rendered a <label> as a
 * SIBLING of the control with no htmlFor, so the label was decorative: clicking
 * it did nothing, and a screen reader announced every field on the confirm step
 * as "edit text, blank" — Insurer, Policy Number, Premium and both dates, on
 * the advisor's main data-entry surface.
 */

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
vi.mock('@/app/(protected)/agent/actions', () => ({
    scanPolicyForResolution: vi.fn(),
    commitScannedPolicy: vi.fn(),
    requestAiConsent: vi.fn(),
}))

function renderModal() {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <UploadPolicyModal isOpen onClose={vi.fn()} />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

describe('UploadPolicyModal — field labelling', () => {
    it('renders the upload step without unlabelled controls', () => {
        renderModal()
        // Every rendered input must resolve to an accessible name via a
        // associated label, aria-label, or wrapping label.
        const inputs = Array.from(document.querySelectorAll('input'))
        for (const input of inputs) {
            const id = input.getAttribute('id')
            const hasFor = id ? document.querySelector(`label[for="${id}"]`) : null
            const hasAria = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')
            const wrapped = input.closest('label')
            // A file input rendered visually hidden behind its own button is
            // reached through that button, not directly.
            const hidden = input.className.includes('hidden') || input.getAttribute('type') === 'file'
            expect(
                Boolean(hasFor || hasAria || wrapped || hidden),
                `input#${id ?? '(no id)'} type=${input.getAttribute('type')} has no accessible name`
            ).toBe(true)
        }
    })

    it('associates a generated id when the caller passes a bare input', () => {
        // Direct exercise of the Field contract: label -> htmlFor -> input id.
        renderModal()
        const labels = Array.from(document.querySelectorAll('label[for]'))
        for (const label of labels) {
            const target = document.getElementById(label.getAttribute('for')!)
            expect(target, `label "${label.textContent}" points at a missing id`).toBeTruthy()
        }
    })

    it('keeps the dialog semantics the modal already had', () => {
        renderModal()
        const dialog = screen.getByRole('dialog')
        expect(dialog.getAttribute('aria-modal')).toBe('true')
        expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    })

    /**
     * The new-customer form on the resolve step had no phone field: the scan
     * showed the extracted phone one card above and then threw it away, and
     * the manual door always had one. It is also half of a no-email
     * customer's identity (D3), so it has to be editable here.
     */
    it('the new-customer form on the resolve step has a labelled phone field', async () => {
        vi.mocked(scanPolicyForResolution).mockResolvedValue({
            success: true,
            extraction: { customerName: 'Μαρία', customerPhone: '6912345678', insurerName: 'X', policyNumber: 'P-1' },
            resolution: { candidates: [], conflict: false },
        } as any)
        renderModal()
        fireEvent.click(screen.getByLabelText(el.agentModals.uploadPolicy.preScanAttestation, { exact: false }))
        const input = document.getElementById('upload-policy-file') as HTMLInputElement
        Object.defineProperty(input, 'files', { value: [new File(['%PDF-1.4'], 'p.pdf', { type: 'application/pdf' })], configurable: true })
        fireEvent.change(input)
        await screen.findByText(el.agentModals.uploadPolicy.resolveKicker)

        const phone = screen.getByLabelText(el.agentModals.addCustomer.phoneNumber) as HTMLInputElement
        expect(phone.tagName).toBe('INPUT')
        expect(phone.type).toBe('tel')
        expect(phone.value).toBe('6912345678')
        // And the email field is no longer mandatory there (D3).
        expect((screen.getByLabelText(el.agentModals.addCustomer.emailAddress) as HTMLInputElement).required).toBe(false)
        // Every control on this step still resolves to a label.
        for (const control of Array.from(document.querySelectorAll('input:not([type="file"]):not([type="radio"]):not([type="checkbox"])'))) {
            const id = control.getAttribute('id')
            expect(id && document.querySelector(`label[for="${id}"]`), `input#${id ?? '(no id)'} has no label`).toBeTruthy()
        }
    })
})
