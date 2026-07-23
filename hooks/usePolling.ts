"use client"

import { useEffect, useRef } from "react"

/**
 * Visibility-aware polling with backoff.
 *
 * The app grew four independent pollers — the wallet list, the policy-detail
 * AnalysisCard, the upload review step and NotificationWatcher — each
 * re-implementing the same setTimeout/setInterval loop. Only one of them paused
 * while the tab was hidden, so a backgrounded phone kept hitting the server (and
 * `router.refresh()`, which re-runs the whole server tree) indefinitely.
 *
 * This centralises three behaviours worth getting right once:
 *   • **Backoff** — poll fast while the user is likely watching, then slow down.
 *   • **Visibility** — never poll a hidden tab, and poll immediately on return
 *     so the user sees fresh state the moment they look.
 *   • **Fresh callback** — the caller's function is read from a ref, so a
 *     re-render does not restart the timer or capture stale state. This matters
 *     here: the wallet's callback calls router.refresh(), which yields new props
 *     every tick and would otherwise reset the schedule forever.
 */

/** The schedule the wallet established and the others copied: 2s → 5s → 10s. */
export const DEFAULT_POLL_BACKOFF = [
    { untilMs: 30_000, intervalMs: 2_000 },
    { untilMs: 120_000, intervalMs: 5_000 },
] as const
export const DEFAULT_POLL_TAIL_MS = 10_000

export interface UsePollingOptions {
    /** Poll only while true. Flipping to false clears the timer and resets backoff. */
    enabled: boolean
    /** Backoff steps, earliest first. Defaults to 2s/5s/10s. */
    backoff?: ReadonlyArray<{ untilMs: number; intervalMs: number }>
    /** Interval once every backoff step has elapsed. */
    tailIntervalMs?: number
    /** Run one poll immediately when enabled, before the first delay. */
    immediate?: boolean
}

export function usePolling(
    callback: () => void | Promise<void>,
    {
        enabled,
        backoff = DEFAULT_POLL_BACKOFF,
        tailIntervalMs = DEFAULT_POLL_TAIL_MS,
        immediate = false,
    }: UsePollingOptions
) {
    const callbackRef = useRef(callback)
    // Synced in an effect, not during render — writing a ref during render is a
    // React rule violation the repo's lint enforces. useRef's initial value
    // already holds the first callback, so the timer never reads a stale one.
    useEffect(() => {
        callbackRef.current = callback
    })

    const startedAtRef = useRef(0)

    useEffect(() => {
        if (!enabled) {
            startedAtRef.current = 0
            return
        }
        if (startedAtRef.current === 0) startedAtRef.current = Date.now()

        let timeout: ReturnType<typeof setTimeout> | undefined
        let cancelled = false

        const nextDelay = () => {
            const elapsed = Date.now() - startedAtRef.current
            for (const step of backoff) {
                if (elapsed < step.untilMs) return step.intervalMs
            }
            return tailIntervalMs
        }

        const tick = () => {
            if (cancelled) return
            // A hidden tab burns battery and quota for output nobody can see.
            if (typeof document === "undefined" || !document.hidden) {
                void callbackRef.current()
            }
            timeout = setTimeout(tick, nextDelay())
        }

        if (immediate && (typeof document === "undefined" || !document.hidden)) {
            void callbackRef.current()
        }
        timeout = setTimeout(tick, nextDelay())

        const onVisibilityChange = () => {
            if (!document.hidden && !cancelled) void callbackRef.current()
        }
        document.addEventListener("visibilitychange", onVisibilityChange)

        return () => {
            cancelled = true
            if (timeout) clearTimeout(timeout)
            document.removeEventListener("visibilitychange", onVisibilityChange)
        }
        // `callback` is deliberately absent — it lives in a ref so that a caller
        // re-render (which router.refresh() causes on every tick) does not
        // restart the schedule.
    }, [enabled, backoff, tailIntervalMs, immediate])
}
