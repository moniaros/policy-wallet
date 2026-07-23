import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePolling, DEFAULT_POLL_BACKOFF, DEFAULT_POLL_TAIL_MS } from '@/hooks/usePolling'

/**
 * The behaviours worth locking down are the ones the four hand-rolled pollers
 * each got wrong or omitted: hidden-tab polling, restarting the schedule on
 * every re-render, and never backing off.
 */
describe('usePolling', () => {
    let hidden = false

    beforeEach(() => {
        vi.useFakeTimers()
        hidden = false
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: () => hidden,
        })
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('does not poll while disabled', () => {
        const cb = vi.fn()
        renderHook(() => usePolling(cb, { enabled: false }))
        vi.advanceTimersByTime(60_000)
        expect(cb).not.toHaveBeenCalled()
    })

    it('polls on the fast step first', () => {
        const cb = vi.fn()
        renderHook(() => usePolling(cb, { enabled: true }))
        vi.advanceTimersByTime(2_000)
        expect(cb).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(2_000)
        expect(cb).toHaveBeenCalledTimes(2)
    })

    it('backs off as time passes instead of hammering at the fast rate', () => {
        const cb = vi.fn()
        renderHook(() => usePolling(cb, { enabled: true }))

        // First 30s at 2s → 15 calls.
        vi.advanceTimersByTime(30_000)
        const afterFast = cb.mock.calls.length
        expect(afterFast).toBe(15)

        // Next 30s should now be on the 5s step → ~6 more, not another 15.
        vi.advanceTimersByTime(30_000)
        const addedDuringSlow = cb.mock.calls.length - afterFast
        expect(addedDuringSlow).toBeLessThan(afterFast)
        expect(addedDuringSlow).toBeGreaterThan(0)
    })

    it('SKIPS the callback while the tab is hidden — the bug in three of the four pollers', () => {
        const cb = vi.fn()
        renderHook(() => usePolling(cb, { enabled: true }))

        hidden = true
        vi.advanceTimersByTime(20_000)
        expect(cb).not.toHaveBeenCalled()

        hidden = false
        vi.advanceTimersByTime(2_000)
        expect(cb).toHaveBeenCalled()
    })

    it('polls immediately when the tab becomes visible again', () => {
        const cb = vi.fn()
        renderHook(() => usePolling(cb, { enabled: true }))

        hidden = true
        vi.advanceTimersByTime(10_000)
        expect(cb).not.toHaveBeenCalled()

        hidden = false
        document.dispatchEvent(new Event('visibilitychange'))
        expect(cb).toHaveBeenCalledTimes(1)
    })

    it('does not restart the schedule when the callback identity changes', () => {
        // The wallet's callback calls router.refresh(), producing a new function
        // every tick. A naive effect dependency would reset the timer forever and
        // the poll would never actually fire.
        const cb = vi.fn()
        const { rerender } = renderHook(
            ({ fn }) => usePolling(fn, { enabled: true }),
            { initialProps: { fn: cb } }
        )
        vi.advanceTimersByTime(1_500)
        rerender({ fn: vi.fn(cb) })   // new identity, same behaviour
        vi.advanceTimersByTime(600)   // crosses the original 2s boundary
        expect(cb).toHaveBeenCalled()
    })

    it('runs once up-front when immediate is set', () => {
        const cb = vi.fn()
        renderHook(() => usePolling(cb, { enabled: true, immediate: true }))
        expect(cb).toHaveBeenCalledTimes(1)
    })

    it('stops polling on unmount', () => {
        const cb = vi.fn()
        const { unmount } = renderHook(() => usePolling(cb, { enabled: true }))
        vi.advanceTimersByTime(2_000)
        const calls = cb.mock.calls.length
        unmount()
        vi.advanceTimersByTime(30_000)
        expect(cb.mock.calls.length).toBe(calls)
    })

    it('exposes the schedule the wallet established', () => {
        expect(DEFAULT_POLL_BACKOFF[0]).toEqual({ untilMs: 30_000, intervalMs: 2_000 })
        expect(DEFAULT_POLL_TAIL_MS).toBe(10_000)
    })
})
