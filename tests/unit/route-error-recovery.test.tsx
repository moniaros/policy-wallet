import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RouteError } from '@/components/ui/RouteError'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

const renderError = (error: Error & { digest?: string }, reset = vi.fn()) => {
    render(
        <LanguageProvider>
            {/* RouteError reads `t`, and the dictionary is mounted by
                TranslationsProvider — which the (protected) layout provides in
                real use. Every RouteError consumer lives under (protected);
                public failures fall back to app/error.tsx, which deliberately
                hardcodes bilingual text for exactly this reason. */}
            <TranslationsProvider>
                <RouteError error={error} reset={reset} />
            </TranslationsProvider>
        </LanguageProvider>
    )
    return reset
}

/**
 * RouteError backs 19 route boundaries; app/error.tsx backs the root one.
 * The root already showed Next's `digest` as an incident id, and RouteError
 * accepted it in its props type but never rendered it — so WHICH boundary
 * happened to fire decided whether a policyholder ringing their advisor had a
 * reference to quote, and whether support could tie the report to the Sentry
 * event RouteError itself captures.
 */
describe('route error recovery', () => {
    it('shows the incident id so a failure can be traced to its Sentry event', () => {
        renderError(Object.assign(new Error('boom'), { digest: 'abc123def' }))
        expect(screen.getByText(/abc123def/)).toBeTruthy()
    })

    it('omits the line entirely when there is no digest', () => {
        renderError(new Error('boom'))
        expect(screen.queryByText(/Κωδικός συμβάντος/)).toBeNull()
    })

    it('offers a retry that actually calls reset', () => {
        const reset = renderError(new Error('boom'))
        fireEvent.click(screen.getByRole('button'))
        expect(reset).toHaveBeenCalledOnce()
    })

    it('offers a way out that is not the retry', () => {
        // If the failure is persistent, retrying forever is not recovery.
        renderError(new Error('boom'))
        expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard')
    })

    it('reports the error rather than swallowing it', async () => {
        const Sentry = await import('@sentry/nextjs')
        renderError(new Error('boom'))
        expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('never shows the raw message or stack to the user', () => {
        renderError(Object.assign(new Error('DB connection string leaked'), { digest: 'x1' }))
        expect(screen.queryByText(/DB connection string leaked/)).toBeNull()
    })
})
