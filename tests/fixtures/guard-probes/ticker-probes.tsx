"use client"

/**
 * PROBE COMPONENTS for tests/unit/ticker-a11y.test.tsx — each one commits
 * exactly one of the violations the guard exists to catch. They are rendered
 * by the guard and MUST be flagged; a matcher that passes any of them is
 * broken. They live under tests/fixtures so no product surface can import
 * them, and every runtime-source guard excludes tests/.
 *
 * (These are deliberately BAD rotators. Do not copy anything out of this
 * file; the good one is components/growth/HookTicker.tsx.)
 */

import { useEffect, useState } from "react"

const ITEMS = ["Probe item one", "Probe item two", "Probe item three"]

/** Violation: auto-advances with NO pause control at all (WCAG 2.2.2). */
export function NoPauseTicker() {
    const [index, setIndex] = useState(0)
    useEffect(() => {
        const timer = window.setInterval(() => setIndex((i) => (i + 1) % ITEMS.length), 7000)
        return () => window.clearInterval(timer)
    }, [])
    return (
        <div data-growth="probe-ticker">
            {ITEMS.map((item, i) => (
                <p key={item} aria-hidden={i !== index}>
                    {item}
                </p>
            ))}
        </div>
    )
}

/** Violation: never consults prefers-reduced-motion — it rotates regardless. */
export function MotionIgnoringTicker() {
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)
    useEffect(() => {
        if (paused) return
        const timer = window.setInterval(() => setIndex((i) => (i + 1) % ITEMS.length), 7000)
        return () => window.clearInterval(timer)
    }, [paused])
    return (
        <div data-growth="probe-ticker">
            {ITEMS.map((item, i) => (
                <p key={item} aria-hidden={i !== index}>
                    {item}
                </p>
            ))}
            <button type="button" onClick={() => setPaused((p) => !p)}>
                Pause
            </button>
        </div>
    )
}

/** Violation: inactive items are REMOVED from the DOM — assistive tech and
 *  crawlers see one line where three exist. */
export function HidingTicker() {
    const [index, setIndex] = useState(0)
    useEffect(() => {
        const timer = window.setInterval(() => setIndex((i) => (i + 1) % ITEMS.length), 7000)
        return () => window.clearInterval(timer)
    }, [])
    return (
        <div data-growth="probe-ticker">
            <p>{ITEMS[index]}</p>
            <button type="button">Pause</button>
        </div>
    )
}

export const PROBE_ITEMS = ITEMS
