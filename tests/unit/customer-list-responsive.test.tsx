import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { CustomerList } from '@/components/agent/CustomerList'

vi.mock('next/navigation', () => ({
    usePathname: () => '/customers',
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const CUSTOMERS = [
    {
        id: 'c1',
        name: 'Γιάννης',
        surname: 'Παπαδόπουλος',
        email: 'g@example.com',
        phone: '+306900000000',
        policyCount: 2,
        activationStatus: 'activated',
        lastInteractionDate: new Date().toISOString(),
        openGapsCount: 1,
    },
] as any

function renderList() {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <CustomerList customers={CUSTOMERS} onCustomerClick={vi.fn()} />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/**
 * The agent's customer list defaulted to a dense table at every width, relying on
 * horizontal scroll on a phone. It already had a card grid — it was just behind a
 * desktop-only toggle. Presentation is now CSS-first, the same shape the wallet
 * uses: cards are always the sub-`lg` presentation, and `viewMode` decides only
 * what desktop shows.
 */
describe('CustomerList — responsive presentation', () => {
    it('renders the dense table only from lg up', () => {
        const { container } = renderList()
        const tableWrapper = container.querySelector('table')?.closest('div.hidden')
        expect(tableWrapper, 'table is not inside a desktop-only wrapper').toBeTruthy()
        expect(tableWrapper?.className).toContain('lg:block')
    })

    it('always renders the card grid, and hides it at lg when the table shows', () => {
        const { container } = renderList()
        const grid = container.querySelector('div[class*="grid-cols-1"][class*="lg:grid-cols-3"]')
        expect(grid, 'card grid missing').toBeTruthy()
        // Default viewMode is "table", so on desktop the cards step aside.
        expect(grid?.className).toContain('lg:hidden')
    })

    it('does not offer the view toggle below lg, where it would be a no-op', () => {
        const { container } = renderList()
        const toggle = container.querySelector('div[class*="lg:flex"][class*="rounded-xl"]')
        expect(toggle?.className).toContain('hidden')
    })

    it('shows the customer in both presentations, so nothing is lost on mobile', () => {
        renderList()
        // Name appears in the table row and in the card.
        expect(screen.getAllByText(/Παπαδόπουλος/).length).toBeGreaterThanOrEqual(2)
    })
})
