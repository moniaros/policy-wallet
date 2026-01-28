"use client"

import { useState, useEffect, useRef, ReactNode } from 'react'

interface PullToRefreshProps {
    onRefresh: () => Promise<void>
    children: ReactNode
    pullDownThreshold?: number
    maxPullDown?: number
    refreshingContent?: ReactNode
    pullingContent?: ReactNode
    className?: string
}

export function PullToRefresh({
    onRefresh,
    children,
    pullDownThreshold = 80,
    maxPullDown = 150,
    refreshingContent,
    pullingContent,
    className = ''
}: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isPulling, setIsPulling] = useState(false)

    const touchStart = useRef<number>(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleTouchStart = (e: TouchEvent) => {
        // Only allow pull-to-refresh when scrolled to top
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            touchStart.current = e.touches[0].clientY
            setIsPulling(true)
        }
    }

    const handleTouchMove = (e: TouchEvent) => {
        if (!isPulling || isRefreshing) return

        const touchY = e.touches[0].clientY
        const distance = touchY - touchStart.current

        // Only pull down, not up
        if (distance > 0) {
            // Prevent default scrolling when pulling
            e.preventDefault()

            // Apply resistance to pull distance
            const resistanceFactor = 0.5
            const adjustedDistance = Math.min(distance * resistanceFactor, maxPullDown)
            setPullDistance(adjustedDistance)
        }
    }

    const handleTouchEnd = async () => {
        setIsPulling(false)

        if (pullDistance >= pullDownThreshold && !isRefreshing) {
            setIsRefreshing(true)
            setPullDistance(pullDownThreshold)

            try {
                await onRefresh()
            } catch (error) {
                console.error('Refresh failed:', error)
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
    }, [isPulling, pullDistance, isRefreshing])

    const pullProgress = Math.min(pullDistance / pullDownThreshold, 1)
    const rotation = pullProgress * 360

    return (
        <div ref={containerRef} className={`relative overflow-auto ${className}`}>
            {/* Pull indicator */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out"
                style={{
                    height: `${pullDistance}px`,
                    opacity: pullDistance > 0 ? 1 : 0
                }}
            >
                {isRefreshing ? (
                    refreshingContent || (
                        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                            <svg
                                className="w-6 h-6 animate-spin"
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
                            <span className="text-sm font-bold">Refreshing...</span>
                        </div>
                    )
                ) : (
                    pullingContent || (
                        <div className="flex flex-col items-center gap-1">
                            <svg
                                className="w-6 h-6 text-teal-600 dark:text-teal-400 transition-transform"
                                style={{ transform: `rotate(${rotation}deg)` }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                                {pullDistance >= pullDownThreshold ? 'Release to refresh' : 'Pull to refresh'}
                            </span>
                        </div>
                    )
                )}
            </div>

            {/* Content */}
            <div
                className="transition-transform duration-200 ease-out"
                style={{
                    transform: `translateY(${pullDistance}px)`
                }}
            >
                {children}
            </div>
        </div>
    )
}

/**
 * Hook for programmatic pull-to-refresh
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
    const [isRefreshing, setIsRefreshing] = useState(false)

    const refresh = async () => {
        if (isRefreshing) return

        setIsRefreshing(true)
        try {
            await onRefresh()
        } finally {
            setIsRefreshing(false)
        }
    }

    return { isRefreshing, refresh }
}
