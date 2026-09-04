import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { CustomerList, customerActivationPill } from '@/components/agent/CustomerList'

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
 * uses: cards are the presentation below `xl`, and `viewMode` decides only what
 * wide desktop shows.
 *
 * The boundary is `xl`, not `lg`: at 1024 the shell's sidebar leaves ~736px, and
 * the table's actions column clipped there. Both B2C and B2B use the same rule.
 */
describe('CustomerList — responsive presentation', () => {
    it('renders the dense table only from xl up', () => {
        const { container } = renderList()
        const tableWrapper = container.querySelector('table')?.closest('div.hidden')
        expect(tableWrapper, 'table is not inside a desktop-only wrapper').toBeTruthy()
        expect(tableWrapper?.className).toContain('xl:block')
    })

    it('always renders the card grid, and hides it at xl when the table shows', () => {
        const { container } = renderList()
        const grid = container.querySelector('div[class*="grid-cols-1"][class*="lg:grid-cols-3"]')
        expect(grid, 'card grid missing').toBeTruthy()
        // Default viewMode is "table", so on desktop the cards step aside.
        expect(grid?.className).toContain('xl:hidden')
    })

    it('does not offer the view toggle below xl, where it would be a no-op', () => {
        const { container } = renderList()
        // The toggle sits on the `.pw-segmented` recipe since batch B (2026-09-03).
        const toggle = container.querySelector('div[class*="xl:flex"][class*="pw-segmented"]')
        expect(toggle, 'view toggle missing').toBeTruthy()
        expect(toggle?.className).toContain('hidden')
    })

    it('shows the customer in both presentations, so nothing is lost on mobile', () => {
        renderList()
        // Name appears in the table row and in the card.
        expect(screen.getAllByText(/Παπαδόπουλος/).length).toBeGreaterThanOrEqual(2)
    })
})

/**
 * S6 — the activation pill. The legacy `activationStatus` derives from the
 * relationship's `status` alone, and `pending_activation` is the DEFAULT, so a
 * customer the agent merely added wore «Προσκεκλημένοι» though no invitation
 * ever left. The pill now derives from the relationship's `activation_status`
 * and a never-invited customer gets the one action they need on the row.
 */
describe('CustomerList — activation pill derives from activation_status', () => {
    const base = {
        email: 'x@example.com',
        phone: '',
        policyCount: 0,
        lastInteractionDate: new Date().toISOString(),
        openGapsCount: 0,
    }
    const renderWith = (customers: any[], onInvite?: (id: string) => void) =>
        render(
            <LanguageProvider>
                <TranslationsProvider>
                    <CustomerList customers={customers} onCustomerClick={vi.fn()} onInvite={onInvite} />
                </TranslationsProvider>
            </LanguageProvider>
        )

    it('a merely-added customer is «Χωρίς πρόσκληση», never «Προσκεκλημένοι»', () => {
        renderWith([{
            ...base, id: 'c1', name: 'Μαρία', surname: 'Παπαδοπούλου',
            activationStatus: 'invited', relationshipStatus: 'pending_activation', relationshipActivationStatus: 'not_invited',
        }])
        const pills = screen.getAllByTestId('customer-activation-pill')
        expect(pills.length).toBeGreaterThanOrEqual(2) // table row + card
        for (const pill of pills) {
            expect(pill.getAttribute('data-activation')).toBe('not_invited')
            expect(pill.textContent).toBe('Χωρίς πρόσκληση')
        }
        expect(screen.queryByText('Προσκεκλημένοι', { selector: '[data-testid="customer-activation-pill"]' })).toBeNull()
    })

    it("the column's default (no_policies) reads the same way: nobody invited them either", () => {
        renderWith([{
            ...base, id: 'c1', name: 'Μαρία', surname: 'Παπαδοπούλου',
            activationStatus: 'invited', relationshipStatus: 'pending_activation', relationshipActivationStatus: 'no_policies',
        }])
        for (const pill of screen.getAllByTestId('customer-activation-pill')) {
            expect(pill.getAttribute('data-activation')).toBe('not_invited')
        }
    })

    it('an invited customer still reads «Προσκεκλημένοι», and an activated one «Ενεργοί»', () => {
        renderWith([
            { ...base, id: 'c1', name: 'Α', surname: 'Β', activationStatus: 'invited', relationshipStatus: 'pending_activation', relationshipActivationStatus: 'invited' },
            { ...base, id: 'c2', name: 'Γ', surname: 'Δ', activationStatus: 'activated', relationshipStatus: 'active', relationshipActivationStatus: 'activated' },
        ])
        const values = screen.getAllByTestId('customer-activation-pill').map((p) => p.getAttribute('data-activation'))
        expect(values.filter((v) => v === 'invited')).toHaveLength(2)
        expect(values.filter((v) => v === 'activated')).toHaveLength(2)
        expect(screen.getAllByText('Προσκεκλημένοι').length).toBeGreaterThanOrEqual(2)
    })

    it('an ended relationship is «Ανενεργοί» whatever the activation column says', () => {
        renderWith([{
            ...base, id: 'c1', name: 'Α', surname: 'Β',
            activationStatus: 'inactive', relationshipStatus: 'inactive', relationshipActivationStatus: 'not_invited',
        }])
        for (const pill of screen.getAllByTestId('customer-activation-pill')) {
            expect(pill.getAttribute('data-activation')).toBe('inactive')
        }
        expect(screen.queryByTestId('customer-send-invite')).toBeNull()
    })

    it('offers «Αποστολή πρόσκλησης» only to a never-invited customer, and calls back with the id', () => {
        const onInvite = vi.fn()
        renderWith([
            { ...base, id: 'never', name: 'Α', surname: 'Β', activationStatus: 'invited', relationshipStatus: 'pending_activation', relationshipActivationStatus: 'not_invited' },
            { ...base, id: 'already', name: 'Γ', surname: 'Δ', activationStatus: 'invited', relationshipStatus: 'pending_activation', relationshipActivationStatus: 'invited' },
        ], onInvite)
        const buttons = screen.getAllByTestId('customer-send-invite')
        expect(buttons.length).toBeGreaterThanOrEqual(1)
        for (const b of buttons) {
            expect(b.textContent).toContain('Αποστολή πρόσκλησης')
            expect(b.className).toContain('pw-soft-button')
        }
        fireEvent.click(buttons[0])
        expect(onInvite).toHaveBeenCalledWith('never')
        expect(onInvite).not.toHaveBeenCalledWith('already')
    })

    it('falls back to the legacy field for a DTO that lacks the raw columns', () => {
        expect(customerActivationPill({ activationStatus: 'activated' } as any)).toBe('activated')
        expect(customerActivationPill({ activationStatus: 'invited' } as any)).toBe('invited')
    })

    it('the status filter has a «Χωρίς πρόσκληση» segment whose count matches the pill', () => {
        renderWith([
            { ...base, id: 'c1', name: 'Α', surname: 'Β', activationStatus: 'invited', relationshipStatus: 'pending_activation', relationshipActivationStatus: 'not_invited' },
            { ...base, id: 'c2', name: 'Γ', surname: 'Δ', activationStatus: 'invited', relationshipStatus: 'pending_activation', relationshipActivationStatus: 'invited' },
        ])
        const segment = screen.getByRole('button', { name: /Χωρίς πρόσκληση\s*1/ })
        expect(segment).toBeTruthy()
        expect(screen.getByRole('button', { name: /Προσκεκλημένοι\s*1/ })).toBeTruthy()
    })
})
