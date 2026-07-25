import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LicenseVerificationStep } from '@/components/onboarding/agent/LicenseVerificationStep'

/**
 * The agent onboarding "licence" step had two insurance-trust defects:
 *
 *  1. It claimed uploading the licence "unlocked Verified Agent status and premium
 *     features". It does neither — the file is SUBMITTED for review and the profile
 *     stays verificationStatus "pending" until an admin approves it. Awarding a
 *     checked-credentials badge for an unverified upload is exactly the trust
 *     signal a compliance officer flags.
 *  2. It ignored the upload action's result and advanced even when the submit
 *     FAILED (the action returns { success: false } on a rejected file / storage
 *     error rather than throwing) — silently dropping a compliance document while
 *     telling the agent nothing.
 */

const uploadAgentAsset = vi.fn()
vi.mock('@/app/onboarding/agent/actions', () => ({
    uploadAgentAsset: (...a: any[]) => uploadAgentAsset(...a),
}))
vi.mock('@/hooks/useSupabaseUser', () => ({
    useSupabaseUser: () => ({ user: { id: 'agent-1' } }),
}))
vi.mock('@/contexts/LanguageContext', () => ({
    useLanguage: () => ({ language: 'en' }),
}))

function selectLicence() {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'licence.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => vi.clearAllMocks())

describe('agent licence step — honest about what the upload does', () => {
    it('frames the upload as a submission for review, not an instant badge unlock', () => {
        render(<LicenseVerificationStep onNext={() => {}} onBack={() => {}} />)
        expect(screen.getByText(/submit your licence for review/i)).toBeInTheDocument()
        expect(screen.getByText(/once approved/i)).toBeInTheDocument()
        expect(screen.getByText(/your status stays pending/i)).toBeInTheDocument()
        // The overpromise must be gone.
        expect(screen.queryByText(/unlock verified agent status/i)).toBeNull()
        expect(screen.queryByText(/premium features/i)).toBeNull()
    })
})

describe('agent licence step — a failed submit is never silently dropped', () => {
    it('does not advance and surfaces the error when the submit fails', async () => {
        uploadAgentAsset.mockResolvedValue({ success: false, error: 'Rejected: wrong file type' })
        const onNext = vi.fn()
        render(<LicenseVerificationStep onNext={onNext} onBack={() => {}} />)
        selectLicence()
        fireEvent.click(screen.getByRole('button', { name: /continue/i }))

        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
        expect(uploadAgentAsset).toHaveBeenCalledTimes(1)
        expect(onNext).not.toHaveBeenCalled() // the whole point — no silent advance
        expect(screen.getByRole('alert').textContent).toMatch(/wrong file type/i)
    })

    it('advances when the submit succeeds', async () => {
        uploadAgentAsset.mockResolvedValue({ success: true, url: 'https://x/licence.pdf' })
        const onNext = vi.fn()
        render(<LicenseVerificationStep onNext={onNext} onBack={() => {}} />)
        selectLicence()
        fireEvent.click(screen.getByRole('button', { name: /continue/i }))

        await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1))
        expect(screen.queryByRole('alert')).toBeNull()
    })

    it('advances on an upload exception without dropping the agent into a dead end', async () => {
        uploadAgentAsset.mockRejectedValue(new Error('network'))
        const onNext = vi.fn()
        render(<LicenseVerificationStep onNext={onNext} onBack={() => {}} />)
        selectLicence()
        fireEvent.click(screen.getByRole('button', { name: /continue/i }))

        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
        expect(onNext).not.toHaveBeenCalled()
    })

    it('“Skip for now” advances without requiring or uploading a licence', () => {
        const onNext = vi.fn()
        render(<LicenseVerificationStep onNext={onNext} onBack={() => {}} />)
        fireEvent.click(screen.getByRole('button', { name: /skip for now/i }))
        expect(onNext).toHaveBeenCalledTimes(1)
        expect(uploadAgentAsset).not.toHaveBeenCalled()
    })
})
