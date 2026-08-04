import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { NotificationBell } from '@/components/notifications/NotificationBell'

/**
 * The badge count came from the server, but the LIST only ever rendered
 * `initialNotifications` — and the sole caller (UserMenu) passes just the count.
 * So the bell showed "3" and the dropdown said "No notifications yet": the one
 * place an advisor goes to find out what happened told them nothing had.
 */

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const NOTIFICATION = {
    id: 'n1',
    eventType: 'gap_detected',
    title: 'Coverage gap found',
    message: 'Motor policy is missing own-damage cover',
    relatedObjectType: 'policy',
    relatedObjectId: 'pol-1',
    isRead: false,
    createdAt: new Date('2026-08-01T10:00:00Z').toISOString(),
}

function renderBell(unread = 3) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <NotificationBell initialUnreadCount={unread} />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

const openBell = () => fireEvent.click(screen.getAllByRole('button')[0])

beforeEach(() => {
    vi.restoreAllMocks()
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('NotificationBell — list fetching', () => {
    it('does NOT fetch before the dropdown is opened', () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        renderBell()

        // It is a dropdown most sessions never touch; paying for it on every
        // page load is waste.
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('fetches once on first open and renders what comes back', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ notifications: [NOTIFICATION], unreadCount: 1 }),
        })
        vi.stubGlobal('fetch', fetchMock)

        renderBell()
        openBell()

        await waitFor(() => {
            expect(screen.getByText('Coverage gap found')).toBeTruthy()
        })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(String(fetchMock.mock.calls[0][0])).toContain('/api/notifications')
    })

    it('does not refetch on a second open', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ notifications: [NOTIFICATION], unreadCount: 1 }),
        })
        vi.stubGlobal('fetch', fetchMock)

        renderBell()
        openBell()
        await waitFor(() => expect(screen.getByText('Coverage gap found')).toBeTruthy())
        openBell() // close
        openBell() // reopen

        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('shows a busy state rather than claiming there are no notifications', async () => {
        let resolve: (v: any) => void = () => {}
        const pending = new Promise((r) => { resolve = r })
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))

        renderBell()
        openBell()

        // "No notifications yet" while loading is a claim, and it was wrong.
        expect(screen.queryByText(/no notifications yet/i)).toBeNull()
        const busy = document.querySelector('[aria-busy="true"]')
        expect(busy).toBeTruthy()

        resolve({ ok: true, json: async () => ({ notifications: [], unreadCount: 0 }) })
        await waitFor(() => {
            expect(document.querySelector('[aria-busy="true"]')).toBeNull()
        })
    })

    it('reports a failure instead of showing an empty list', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

        renderBell()
        openBell()

        await waitFor(() => {
            expect(screen.queryByText(/no notifications yet/i)).toBeNull()
        })
    })

    it('retries on the next open after a failure', async () => {
        const fetchMock = vi.fn()
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ notifications: [NOTIFICATION], unreadCount: 1 }),
            })
        vi.stubGlobal('fetch', fetchMock)

        renderBell()
        openBell()
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

        openBell() // close
        openBell() // reopen — a cached failure would strand the advisor
        await waitFor(() => expect(screen.getByText('Coverage gap found')).toBeTruthy())
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('reconciles the badge with the fetched count', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ notifications: [], unreadCount: 0 }),
        }))

        renderBell(3)
        expect(screen.getByText('3')).toBeTruthy()
        openBell()

        // A stale server-rendered badge must not outlive fresh data.
        await waitFor(() => expect(screen.queryByText('3')).toBeNull())
    })
})
