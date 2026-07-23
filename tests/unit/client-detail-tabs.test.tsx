import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientDetailView } from '@/components/agent/ClientDetailView'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
    usePathname: () => '/customers/x',
}))

const CUSTOMER = {
    id: 'c1', name: 'Γιάννης', surname: 'Παπαδόπουλος', email: 'g@example.com',
    phone: '+306900000000', avatar: null, policies: [], opportunities: [], interactions: [],
} as any

function renderView() {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
            <ClientDetailView
                customer={CUSTOMER}
                viewerRole="agent"
                agentTier="free"
                healthScore={0}
                policies={[]}
                opportunities={[]}
                interactions={[]}
            />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/**
 * The client detail tabs were plain <button>s in a <div> — a screen reader
 * announced four unrelated buttons, there was no arrow-key navigation, and on a
 * 375px phone the four-tab row (icon + label each) overflowed with no scroll.
 */
describe('ClientDetailView tabs', () => {
    it('exposes a real tablist with tabs', () => {
        renderView()
        const tablist = screen.getByRole('tablist')
        expect(within(tablist).getAllByRole('tab').length).toBeGreaterThanOrEqual(3)
    })

    it('marks exactly one tab selected and binds it to a panel', () => {
        renderView()
        const selected = screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true')
        expect(selected).toHaveLength(1)
        const panelId = selected[0].getAttribute('aria-controls')
        expect(document.getElementById(panelId!)?.getAttribute('role')).toBe('tabpanel')
    })

    it('uses a roving tabindex — only the active tab is in the tab order', () => {
        renderView()
        const tabs = screen.getAllByRole('tab')
        const focusable = tabs.filter((t) => t.getAttribute('tabindex') === '0')
        expect(focusable).toHaveLength(1)
        expect(tabs.filter((t) => t.getAttribute('tabindex') === '-1').length).toBe(tabs.length - 1)
    })

    it('moves selection with the arrow keys', async () => {
        renderView()
        const tabs = screen.getAllByRole('tab')
        tabs[0].focus()
        await userEvent.keyboard('{ArrowRight}')
        expect(tabs[1].getAttribute('aria-selected')).toBe('true')
        expect(tabs[0].getAttribute('aria-selected')).toBe('false')
        await userEvent.keyboard('{Home}')
        expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    })

    it('lets the tab row scroll instead of overflowing on a phone', () => {
        renderView()
        expect(screen.getByRole('tablist').className).toContain('overflow-x-auto')
    })
})
