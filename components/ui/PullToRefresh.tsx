"use client"

import { useState, useRef, useEffect } from 'react'

interface PullToRefreshProps {
    onRefresh: () => Promise<void>
    children: React.ReactNode
    threshold?: number
    maxPullDistance?: number
}

export function PullToRefresh({
    onRefresh,
    children,
    threshold = 80,
    maxPullDistance = 120
}: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [canPull, setCanPull] = useState(false)

    const touchStartY = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleTouchStart = (e: TouchEvent) => {
        // Only allow pull-to-refresh if scrolled to top
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY
            setCanPull(true)
        }
    }

    const handleTouchMove = (e: TouchEvent) => {
        if (!canPull || isRefreshing) return

        const touchY = e.touches[0].clientY
        const distance = touchY - touchStartY.current

        // Only pull down, not up
        if (distance > 0) {
            // Prevent default scroll behavior
            if (containerRef.current && containerRef.current.scrollTop === 0) {
                e.preventDefault()
            }

            // Apply resistance curve (gets harder to pull as you go further)
            const resistanceFactor = 0.5
            const adjustedDistance = Math.min(
                distance * resistanceFactor,
                maxPullDistance
            )
            setPullDistance(adjustedDistance)
        }
    }

    const handleTouchEnd = async () => {
        if (!canPull) return

        setCanPull(false)

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true)
            try {
                await onRefresh()
            } finally {
                setIsRefreshing(false)
                setPullDistance(0)
            }
        } else {
            setPullDistance(0)
        }
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        container.addEventListener('touchstart', handleTouchStart, { passive: true })
        container.addEventListener('touchmove', handleTouchMove, { passive: false })
        container.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            container.removeEventListener('touchstart', handleTouchStart)
            container.removeEventListener('touchmove', handleTouchMove)
            container.removeEventListener('touchend', handleTouchEnd)
        }
    }, [canPull, pullDistance, isRefreshing])

    const rotation = Math.min((pullDistance / threshold) * 360, 360)
    const opacity = Math.min(pullDistance / threshold, 1)
    const scale = Math.min(0.5 + (pullDistance / threshold) * 0.5, 1)

    return (
        <div ref={containerRef} className="relative h-full overflow-y-auto">
            {/* Pull indicator */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50"
                style={{
                    height: pullDistance,
                    opacity: opacity,
                    transition: isRefreshing || pullDistance === 0 ? 'all 0.3s ease' : 'none'
                }}
            >
                <div
                    className="flex items-center justify-center w-10 h-10 bg-primary dark:bg-mint rounded-full shadow-lg"
                    style={{
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        transition: isRefreshing || pullDistance === 0 ? 'all 0.3s ease' : 'none'
                    }}
                >
                    {isRefreshing ? (
                        <svg
                            className="w-5 h-5 text-white dark:text-[#1A2420] animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    ) : (
                        <svg
                            className="w-5 h-5 text-white dark:text-[#1A2420]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                        </svg>
                    )}
                </div>
            </div>

            {/* Content */}
            <div
                style={{
                    transform: `translateY(${pullDistance}px)`,
                    transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none'
                }}
            >
                {children}
            </div>
        </div>
    )
}
