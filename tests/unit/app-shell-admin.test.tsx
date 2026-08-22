import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { AppShell } from '@/components/shell/AppShell'

// The shell pulls in navigation/analytics/PWA concerns that jsdom does not need
// for this assertion; stub the leaves so the test is about layout structure.
vi.mock('next/navigation', () => ({
    usePathname: () => '/admin/dashboard',
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))
vi.mock('@/components/pwa/InstallPrompt', () => ({ InstallPrompt: () => null }))
vi.mock('@/app/(protected)/role-actions', () => ({ setActiveRole: vi.fn() }))

const NAV = [
    {
        title: 'Admin',
        items: [
            { label: 'Dashboard', href: '/admin/dashboard' },
            { label: 'Users', href: '/admin/users' },
            { label: 'Policies', href: '/admin/policies' },
        ],
    },
]

function renderShell(role: 'admin' | 'policyholder') {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
            <AppShell
                navigation={NAV}
                currentRole={{ role, label: role }}
                user={{ name: 'Test', email: 't@example.com' }}
            >
                <p>page content</p>
            </AppShell>
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/**
 * Closes the verification gap on the admin shell: `/admin/*` cannot be rendered
 * end-to-end here because the route is gated on a Supabase JWT role claim that
 * would require minting an admin account. The structural guarantees this branch
 * changed are assertable directly against the component.
 */
describe('AppShell — admin', () => {
    it('renders exactly ONE <main> (admin used to nest a second one inside it)', () => {
        const { container } = renderShell('admin')
        expect(container.querySelectorAll('main')).toHaveLength(1)
    })

    it('gives <main> the skip-link target', () => {
        const { container } = renderShell('admin')
        expect(container.querySelector('main')?.id).toBe('main-content')
        const skip = container.querySelector('a[href="#main-content"]')
        expect(skip).toBeTruthy()
    })

    it('does NOT render an empty bottom nav for admin', () => {
        renderShell('admin')
        // Admin has no bottom-nav items; the <nav> used to render anyway as an
        // empty 76px bar, with a pb-24 gutter reserved for it.
        const navs = screen.queryAllByRole('navigation')
        expect(navs).toHaveLength(1)          // the sidebar only
        expect(screen.queryByLabelText('Γρήγορη πλοήγηση')).toBeNull()
    })

    it('does not reserve bottom padding when there is no bottom nav', () => {
        const { container } = renderShell('admin')
        expect(container.querySelector('main')?.className).not.toContain('pw-bottom-nav-reserve')
    })

    it('still renders the bottom nav — and a gutter that TRACKS the safe-area inset — for a policyholder', () => {
        const { container } = renderShell('policyholder')
        expect(screen.getByLabelText('Γρήγορη πλοήγηση')).toBeTruthy()
        expect(container.querySelector('main')?.className).toContain('pw-bottom-nav-reserve')
    })

    it('renders admin nav rows as real links, not buttons', () => {
        renderShell('admin')
        const link = screen.getByRole('link', { name: /Policies/ })
        expect(link.getAttribute('href')).toBe('/admin/policies')
    })

    it('labels the sidebar landmark', () => {
        renderShell('admin')
        expect(screen.getByRole('navigation', { name: 'Κύρια πλοήγηση' })).toBeTruthy()
    })
})
