import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ReviewWorkspace } from '@/components/agent/ReviewWorkspace'
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('keeps unsaved feedback attached to its revision until saved or explicitly discarded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { revisions: [
        { id: 'r1', body: 'Demo draft', status: 'draft', digest: 'digest', stale: false, createdAt: '2026-09-22T10:00:00Z', feedbackNote: null, reuseApproved: false, privateAdvice: null },
    ] } }) }))
    render(<ReviewWorkspace policyId="p1" reviewHref="/review" />)
    await screen.findByDisplayValue('Demo draft')
    fireEvent.change(screen.getByRole('textbox', { name: 'Reason or correction' }), { target: { value: 'Preserve this correction' } })
    expect(screen.getByRole('button', { name: 'Save a new version' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Prepare with AI' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Draft ·/ })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Customer-facing text' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Accept$/ })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Discard feedback changes' }))
    expect(screen.getByRole('button', { name: /Draft ·/ })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Reason or correction' })).toHaveValue('')
})
