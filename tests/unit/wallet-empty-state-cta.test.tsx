import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { en } from '@/lib/i18n/translations/en'
import { EmptyState } from '@/components/wallet/EmptyState'

/**
 * The zero-policy wallet screen is the new user's first action, and its copy
 * sells uploading ("Upload a PDF and in under 30 seconds the AI extracts coverage,
 * gaps and renewal dates"). Its single primary CTA must therefore open the UPLOAD
 * flow. It used to be wired to onAddManually while onUploadDocument — passed by
 * the parent — was silently dropped, so the button did not call the flow its own
 * copy advertised.
 */
vi.mock('@/contexts/LanguageContext', () => ({
    useLanguage: () => ({ t: en, language: 'en' }),
}))
vi.mock('framer-motion', () => ({
    motion: new Proxy({}, { get: () => (props: any) => {
        const { children, ...rest } = props
        // Drop animation-only props that are not valid DOM attributes.
        const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = rest
        return <div {...domProps}>{children}</div>
    } }),
}))

beforeEach(() => vi.clearAllMocks())

describe('wallet empty-state CTA opens the upload flow it advertises', () => {
    it('the primary CTA calls onUploadDocument, not onAddManually', () => {
        const onAddManually = vi.fn()
        const onUploadDocument = vi.fn()
        render(<EmptyState onAddManually={onAddManually} onUploadDocument={onUploadDocument} />)

        fireEvent.click(screen.getByRole('button', { name: en.wallet.emptyState.ctaPrimary }))

        expect(onUploadDocument).toHaveBeenCalledTimes(1)
        expect(onAddManually).not.toHaveBeenCalled()
    })

    it('falls back to onAddManually only when no upload handler is supplied', () => {
        const onAddManually = vi.fn()
        render(<EmptyState onAddManually={onAddManually} />)

        fireEvent.click(screen.getByRole('button', { name: en.wallet.emptyState.ctaPrimary }))

        expect(onAddManually).toHaveBeenCalledTimes(1)
    })

    it('the benefit copy still advertises uploading (guards the CTA-copy contract)', () => {
        render(<EmptyState onAddManually={() => {}} onUploadDocument={() => {}} />)
        expect(screen.getByText(/upload a pdf/i)).toBeInTheDocument()
    })
})
