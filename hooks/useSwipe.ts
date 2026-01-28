"use client"

import { useEffect, useRef, useState } from 'react'

interface SwipeHandlers {
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
    onSwipeUp?: () => void
    onSwipeDown?: () => void
}

interface SwipeConfig {
    minSwipeDistance?: number
    maxSwipeTime?: number
    preventDefaultTouchmoveEvent?: boolean
}

interface TouchPosition {
    x: number
    y: number
    time: number
}

/**
 * Hook for detecting swipe gestures on touch devices
 * Returns ref to attach to swipeable element
 */
export function useSwipe(handlers: SwipeHandlers, config: SwipeConfig = {}) {
    const {
        minSwipeDistance = 50,
        maxSwipeTime = 300,
        preventDefaultTouchmoveEvent = false
    } = config

    const touchStart = useRef<TouchPosition | null>(null)
    const touchEnd = useRef<TouchPosition | null>(null)

    const onTouchStart = (e: TouchEvent) => {
        touchEnd.current = null
        touchStart.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY,
            time: Date.now()
        }
    }

    const onTouchMove = (e: TouchEvent) => {
        if (preventDefaultTouchmoveEvent) {
            e.preventDefault()
        }
        touchEnd.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY,
            time: Date.now()
        }
    }

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return

        const distanceX = touchStart.current.x - touchEnd.current.x
        const distanceY = touchStart.current.y - touchEnd.current.y
        const timeElapsed = touchEnd.current.time - touchStart.current.time

        const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)
        const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX)

        // Check if swipe was fast enough
        if (timeElapsed > maxSwipeTime) return

        // Horizontal swipes
        if (isHorizontalSwipe) {
            if (distanceX > minSwipeDistance) {
                handlers.onSwipeLeft?.()
            } else if (distanceX < -minSwipeDistance) {
                handlers.onSwipeRight?.()
            }
        }

        // Vertical swipes
        if (isVerticalSwipe) {
            if (distanceY > minSwipeDistance) {
                handlers.onSwipeUp?.()
            } else if (distanceY < -minSwipeDistance) {
                handlers.onSwipeDown?.()
            }
        }
    }

    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const element = ref.current
        if (!element) return

        element.addEventListener('touchstart', onTouchStart, { passive: true })
        element.addEventListener('touchmove', onTouchMove, { passive: !preventDefaultTouchmoveEvent })
        element.addEventListener('touchend', onTouchEnd, { passive: true })

        return () => {
            element.removeEventListener('touchstart', onTouchStart)
            element.removeEventListener('touchmove', onTouchMove)
            element.removeEventListener('touchend', onTouchEnd)
        }
    }, [handlers, minSwipeDistance, maxSwipeTime, preventDefaultTouchmoveEvent])

    return ref
}

/**
 * Hook for detecting swipe gestures with velocity tracking
 * More advanced version with swipe velocity and direction
 */
export function useSwipeGesture(
    onSwipe: (direction: 'left' | 'right' | 'up' | 'down', velocity: number) => void,
    config: SwipeConfig = {}
) {
    const {
        minSwipeDistance = 50,
        maxSwipeTime = 300
    } = config

    const touchStart = useRef<TouchPosition | null>(null)
    const touchEnd = useRef<TouchPosition | null>(null)

    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const element = ref.current
        if (!element) return

        const handleTouchStart = (e: TouchEvent) => {
            touchEnd.current = null
            touchStart.current = {
                x: e.targetTouches[0].clientX,
                y: e.targetTouches[0].clientY,
                time: Date.now()
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            touchEnd.current = {
                x: e.targetTouches[0].clientX,
                y: e.targetTouches[0].clientY,
                time: Date.now()
            }
        }

        const handleTouchEnd = () => {
            if (!touchStart.current || !touchEnd.current) return

            const distanceX = touchStart.current.x - touchEnd.current.x
            const distanceY = touchStart.current.y - touchEnd.current.y
            const timeElapsed = touchEnd.current.time - touchStart.current.time

            if (timeElapsed > maxSwipeTime) return

            const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)
            const distance = isHorizontalSwipe ? Math.abs(distanceX) : Math.abs(distanceY)
            const velocity = distance / timeElapsed

            if (distance < minSwipeDistance) return

            if (isHorizontalSwipe) {
                onSwipe(distanceX > 0 ? 'left' : 'right', velocity)
            } else {
                onSwipe(distanceY > 0 ? 'up' : 'down', velocity)
            }
        }

        element.addEventListener('touchstart', handleTouchStart, { passive: true })
        element.addEventListener('touchmove', handleTouchMove, { passive: true })
        element.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            element.removeEventListener('touchstart', handleTouchStart)
            element.removeEventListener('touchmove', handleTouchMove)
            element.removeEventListener('touchend', handleTouchEnd)
        }
    }, [onSwipe, minSwipeDistance, maxSwipeTime])

    return ref
}
