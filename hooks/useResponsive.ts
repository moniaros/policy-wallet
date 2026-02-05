"use client"

import { useState, useEffect } from 'react'

/**
 * Hook to detect mobile viewport
 * Returns true if viewport width is less than 768px (tablet breakpoint)
 */
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        // Check on mount
        checkMobile()

        // Add event listener
        window.addEventListener('resize', checkMobile)

        // Cleanup
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return isMobile
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
