"use client"

import { useEffect, useRef, useState } from "react"

/**
 * THE rotation + accessibility machinery for anything on the marketing surface
 * that advances by itself. Extracted verbatim from `HeroSlides.tsx` (D-G05:
 * "extend by extraction") so `HookTicker` and the hero share ONE definition of
 * how auto-advancing content behaves, instead of re-solving six accessibility
 * problems a second time and silently getting one wrong.
 *
 * What this hook owns, and why (the reasoning lives here now because the
 * consumers no longer carry the code):
 *
 *  - WCAG 2.2.2 (Level A): content that auto-updates for more than five
 *    seconds needs a pause mechanism. Consumers MUST render a visible,
 *    labelled pause/play control wired to `togglePaused` — not a hover-only
 *    affordance. `ticker-a11y` and the hero regression guard both assert it.
 *  - `prefers-reduced-motion` disables auto-advance ENTIRELY rather than
 *    shortening the fade: someone who asked for no motion did not ask for
 *    faster motion. Consumers should also drop the pause control when
 *    `reducedMotion` is true — a dead control is worse than no control.
 *  - Auto-advance holds while the pointer hovers OR keyboard focus is inside
 *    (spread `rootPauseProps` on the rotator's root element).
 *  - The live region is `off` while the rotator advances by itself and
 *    `polite` once a person takes control, per the ARIA carousel pattern:
 *    announcing every automatic change would talk over whatever the user is
 *    actually doing. Render `liveRegion` as the container's `aria-live`.
 *  - Inactive items stay IN the DOM (assistive tech and crawlers count what
 *    is in the DOM) but leave the a11y tree and tab order: spread
 *    `itemPresence(active)` — `aria-hidden` + React 19's boolean `inert`.
 *
 * What this hook does NOT own: layout. Consumers must still stack items in
 * one grid cell so the container is always as tall as the longest item and
 * nothing below it moves on a timer — the homepage's fixed P0.
 */
export interface RotationOptions {
    /** How many items rotate. */
    count: number
    /** Milliseconds between automatic advances. */
    intervalMs: number
    /**
     * false = this render site never auto-advances (a static stack). The hook
     * is still called — hooks are unconditional — but no timer ever runs.
     */
    enabled?: boolean
}

export interface Rotation {
    index: number
    paused: boolean
    tookControl: boolean
    reducedMotion: boolean
    /** True while the timer is actually running. */
    autoplaying: boolean
    /** Direct navigation (dots): marks that a person took control. */
    goTo: (next: number) => void
    /** The visible pause/play control's handler. */
    togglePaused: () => void
    /** Spread on the rotator's root: pause on hover AND keyboard focus. */
    rootPauseProps: {
        onMouseEnter: () => void
        onMouseLeave: () => void
        onFocusCapture: () => void
        onBlurCapture: () => void
    }
    /** The container's aria-live value: silent until a person takes control. */
    liveRegion: "off" | "polite"
    /** Presence attributes for each item: in the DOM, out of the a11y tree. */
    itemPresence: (active: boolean) => { "aria-hidden": boolean; inert: boolean }
}

export function useRotation({ count, intervalMs, enabled = true }: RotationOptions): Rotation {
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)
    const [tookControl, setTookControl] = useState(false)
    const [reducedMotion, setReducedMotion] = useState(false)
    const hovering = useRef(false)
    const focused = useRef(false)

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)")
        const apply = () => setReducedMotion(query.matches)
        apply()
        query.addEventListener("change", apply)
        return () => query.removeEventListener("change", apply)
    }, [])

    const autoplaying = enabled && !paused && !reducedMotion

    useEffect(() => {
        if (!autoplaying) return
        const timer = window.setInterval(() => {
            if (hovering.current || focused.current) return
            setIndex((i) => (i + 1) % count)
        }, intervalMs)
        return () => window.clearInterval(timer)
    }, [autoplaying, count, intervalMs])

    const goTo = (next: number) => {
        setTookControl(true)
        setIndex(next)
    }

    return {
        index,
        paused,
        tookControl,
        reducedMotion,
        autoplaying,
        goTo,
        togglePaused: () => setPaused((p) => !p),
        rootPauseProps: {
            onMouseEnter: () => {
                hovering.current = true
            },
            onMouseLeave: () => {
                hovering.current = false
            },
            onFocusCapture: () => {
                focused.current = true
            },
            onBlurCapture: () => {
                focused.current = false
            },
        },
        liveRegion: autoplaying && !tookControl ? "off" : "polite",
        itemPresence: (active: boolean) => ({ "aria-hidden": !active, inert: !active }),
    }
}
