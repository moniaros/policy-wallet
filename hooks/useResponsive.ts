"use client"

import { useState, useEffect, useSyncExternalStore } from 'react'

/**
 * The single "mobile experience" boundary, in px.
 *
 * It is 1024 because that is where the app chrome switches: AppShell's sidebar
 * appears at `lg:` (1024px) and its mobile header/bottom-bar disappear there.
 * When this hook cut at 768 instead, viewports in 768–1023px got the mobile
 * chrome wrapped around the desktop layout.
 */
export const MOBILE_BREAKPOINT_PX = 1024

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`

function subscribeToMobileQuery(onChange: () => void) {
    const media = window.matchMedia(MOBILE_QUERY)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
}

function getMobileSnapshot() {
    return window.matchMedia(MOBILE_QUERY).matches
}

/**
 * True while the viewport is below the mobile breakpoint.
 *
 * useSyncExternalStore rather than useState+useEffect: the effect version
 * initialised to `false`, so a phone painted the DESKTOP tree first and only
 * swapped to the mobile one after mount — a visible flash on every load of a
 * layout-switching page. This reads the real value during the hydration render.
 * The server snapshot is `false` (desktop-first), which is also what the
 * server-rendered HTML contains.
 */
export function useIsMobile() {
    return useSyncExternalStore(subscribeToMobileQuery, getMobileSnapshot, () => false)
}

/**
 * Hook to detect touch device
 * Returns true if device supports touch events
 */
export function useIsTouchDevice() {
    const [isTouch, setIsTouch] = useState(false)

    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }, [])

    return isTouch
}

/**
 * Hook for responsive breakpoints
 * Returns object with boolean flags for different breakpoints
 *
 * NOTE: unused at present, and it still carries the post-mount-update pattern
 * that useIsMobile was moved off. Port it to useSyncExternalStore before
 * adopting it anywhere.
 */
export function useBreakpoint() {
    const [breakpoint, setBreakpoint] = useState({
        isMobile: false,
        isTablet: false,
        isDesktop: false,
    })

    useEffect(() => {
        const checkBreakpoint = () => {
            const width = window.innerWidth
            setBreakpoint({
                isMobile: width < 768,
                isTablet: width >= 768 && width < 1024,
                isDesktop: width >= 1024,
            })
        }

        checkBreakpoint()
        window.addEventListener('resize', checkBreakpoint)
        return () => window.removeEventListener('resize', checkBreakpoint)
    }, [])

    return breakpoint
}

/**
 * Hook to match a media query
 * Returns true if the query matches
 */
export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        const media = window.matchMedia(query)
        if (media.matches !== matches) {
            setMatches(media.matches)
        }

        const listener = () => setMatches(media.matches)
        media.addEventListener('change', listener)

        return () => media.removeEventListener('change', listener)
    }, [matches, query])

    return matches
}
