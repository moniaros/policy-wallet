import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { AppShell } from '@/components/shell/AppShell'

/**
 * The agent's mobile bottom bar has five slots. The fifth carries the "more"
 * icon and is labelled «Ενέργειες» / "Actions", but it navigated straight to
 * /account — so the one slot that looked like it led to the rest of the product
 * led to settings, and renewals, tasks, commissions, questionnaires, team and
 * activity were reachable on a phone ONLY through the hamburger. Renewals and
 * tasks are daily advisor work.
 *
 * It now opens the nav drawer, which is what its icon and label promise.
 */

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/agent',
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))
vi.mock('@/components/pwa/InstallPrompt', () => ({ InstallPrompt: () => null }))
vi.mock('@/app/(protected)/role-actions', () => ({ setActiveRole: vi.fn() }))

const NAV = [
    {
        title: 'Agent',
        items: [
            { label: 'Dashboard', href: '/dashboard/agent' },
            { label: 'Renewals', href: '/renewals' },
            { label: 'Tasks', href: '/tasks' },
        ],
    },
]

function renderAgentShell() {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <AppShell
                    navigation={NAV}
                    currentRole={{ role: 'agent', label: 'agent' }}
                    user={{ name: 'Test Advisor', email: 'a@example.com' }}
                >
                    <p>page content</p>
                </AppShell>
            </TranslationsProvider>
        </LanguageProvider>
    )
}

function bottomNav() {
    // Named landmark, so this does not depend on class names.
    return screen.getAllByRole('navigation').find((n) => n.className.includes('fixed bottom-0'))!
}

describe('agent mobile bottom nav — the "more" slot', () => {
    it('renders five slots for an agent', () => {
        renderAgentShell()
        const nav = bottomNav()
        expect(nav).toBeTruthy()
        const slots = within(nav).getAllByRole('button').length + within(nav).getAllByRole('link').length
        expect(slots).toBe(5)
    })

    it('exposes the drawer trigger as a BUTTON, not a link', () => {
        // A link would announce a destination to screen readers that it never
        // navigates to.
        renderAgentShell()
        const nav = bottomNav()
        const buttons = within(nav).getAllByRole('button')
        expect(buttons).toHaveLength(1)
        expect(buttons[0].getAttribute('aria-controls')).toBe('app-sidebar')
    })

    it('does not navigate to /account from the more slot', () => {
        renderAgentShell()
        const nav = bottomNav()
        const hrefs = within(nav)
            .getAllByRole('link')
            .map((a) => a.getAttribute('href'))
        expect(hrefs).not.toContain('/account')
    })

    it('opens the drawer when the more slot is pressed', () => {
        renderAgentShell()
        const nav = bottomNav()
        const trigger = within(nav).getAllByRole('button')[0]

        expect(trigger.getAttribute('aria-expanded')).toBe('false')
        fireEvent.click(trigger)
        expect(trigger.getAttribute('aria-expanded')).toBe('true')

        // aria-controls must resolve to a real element or the relationship is
        // a lie to assistive tech.
        expect(document.getElementById('app-sidebar')).toBeTruthy()
    })

    it('reaches renewals and tasks once the drawer is open', () => {
        renderAgentShell()
        fireEvent.click(within(bottomNav()).getAllByRole('button')[0])

        const sidebar = document.getElementById('app-sidebar')!
        const hrefs = within(sidebar as HTMLElement)
            .getAllByRole('link')
            .map((a) => a.getAttribute('href'))
        expect(hrefs).toContain('/renewals')
        expect(hrefs).toContain('/tasks')
    })

    it('keeps the policyholder bar as links only', () => {
        // The policyholder bar has no drawer slot; nothing here should change it.
        render(
            <LanguageProvider>
                <TranslationsProvider>
                    <AppShell
                        navigation={NAV}
                        currentRole={{ role: 'policyholder', label: 'policyholder' }}
                        user={{ name: 'Test', email: 'p@example.com' }}
                    >
                        <p>page content</p>
                    </AppShell>
                </TranslationsProvider>
            </LanguageProvider>
        )
        const nav = screen.getAllByRole('navigation').find((n) => n.className.includes('fixed bottom-0'))!
        expect(within(nav).queryAllByRole('button')).toHaveLength(0)
    })
})
