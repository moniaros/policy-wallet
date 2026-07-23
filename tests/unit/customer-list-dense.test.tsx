import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { CustomerList } from '@/components/agent/CustomerList'

vi.mock('next/navigation', () => ({
    usePathname: () => '/customers',
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

function makeCustomers(n: number) {
    return Array.from({ length: n }, (_, i) => ({
        id: `c${i}`,
        name: `Πελάτης${i}`,
        surname: `Επώνυμο${i}`,
        email: `client${i}@example.com`,
        phone: `+3069000${String(i).padStart(5, '0')}`,
        policyCount: i % 5,
        activationStatus: i % 2 ? 'activated' : 'invited',
        lastInteractionDate: new Date().toISOString(),
        openGapsCount: i % 3,
        intelligence: { healthScore: i % 100, recommendedAction: 'check_in', nextRenewalDate: null, consentStatus: 'granted' },
    })) as any
}

/**
 * The agent customer list renders every filtered row (no pagination or
 * virtualization) — twice, since the table and the card grid both sit in the DOM
 * behind responsive `hidden`. This documents that a large book still renders in a
 * reasonable time, so criterion "dense operational screens remain efficient" has
 * a number behind it rather than an assumption. If someone later introduces an
 * O(n²) render, this catches it.
 */
describe('CustomerList — dense data', () => {
    it('renders 500 clients without falling over', () => {
        const t0 = performance.now()
        const { container } = render(
            <LanguageProvider>
                <TranslationsProvider>
                    <CustomerList customers={makeCustomers(500)} onCustomerClick={vi.fn()} />
                </TranslationsProvider>
            </LanguageProvider>
        )
        const ms = performance.now() - t0
        // jsdom is much slower than a real browser; this is a generous ceiling
        // whose job is to catch a pathological regression, not to benchmark.
        expect(ms, `render of 500 clients took ${Math.round(ms)}ms`).toBeLessThan(5000)
        // Both presentations are in the DOM; the count should scale linearly.
        expect(container.querySelectorAll('tr, [class*="pw-card"]').length).toBeGreaterThan(400)
        console.log(`[dense] 500 clients rendered in ${Math.round(ms)}ms`)
    })
})
