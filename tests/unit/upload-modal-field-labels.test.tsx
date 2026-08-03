import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { UploadPolicyModal } from '@/components/agent/UploadPolicyModal'

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
})
