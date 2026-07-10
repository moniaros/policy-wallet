"use client"

import { useState, useRef, useEffect, ReactNode } from 'react'

export interface SwipeAction {
    id: string
    label: string
    icon: ReactNode
    color: 'red' | 'blue' | 'green' | 'amber' | 'slate'
    onAction: () => void
}

interface SwipeableCardProps {
    children: ReactNode
    leftActions?: SwipeAction[]
    rightActions?: SwipeAction[]
    threshold?: number
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
    className?: string
}

export function SwipeableCard({
    children,
    leftActions = [],
    rightActions = [],
    threshold = 80,
    onSwipeLeft,
    onSwipeRight,
    className = ''
}: SwipeableCardProps) {
    const [swipeDistance, setSwipeDistance] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)

    const touchStartX = useRef(0)
    const touchStartY = useRef(0)
    const cardRef = useRef<HTMLDivElement>(null)
    const isVerticalScroll = useRef(false)

    const getActionColor = (color: SwipeAction['color']) => {
        switch (color) {
            case 'red':
                return 'bg-red-500 text-white'
            case 'blue':
                return 'bg-mint text-[#1A2420]'
            case 'green':
                return 'bg-primary text-white dark:text-[#1A2420]'
            case 'amber':
                return 'bg-amber-500 text-white'
            case 'slate':
                return 'bg-slate-500 text-white'
        }
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
        setIsSwiping(true)
        isVerticalScroll.current = false
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping || isAnimating) return

        const touchX = e.touches[0].clientX
        const touchY = e.touches[0].clientY
        const deltaX = touchX - touchStartX.current
        const deltaY = touchY - touchStartY.current

        // Detect if this is a vertical scroll
        if (!isVerticalScroll.current && Math.abs(deltaY) > Math.abs(deltaX)) {
            isVerticalScroll.current = true
            setIsSwiping(false)
            return
        }

        // Prevent vertical scroll if horizontal swipe
        if (Math.abs(deltaX) > 10 && !isVerticalScroll.current) {
            e.preventDefault()
        }

        // Only allow swipe if there are actions in that direction
        if (deltaX > 0 && leftActions.length === 0) return
        if (deltaX < 0 && rightActions.length === 0) return

        // Apply resistance curve
        const maxSwipe = 200
        const resistanceFactor = 0.6
        const adjustedDistance = Math.max(
            Math.min(deltaX * resistanceFactor, maxSwipe),
            -maxSwipe
        )

        setSwipeDistance(adjustedDistance)
    }

    const handleTouchEnd = () => {
        if (!isSwiping || isVerticalScroll.current) {
            setIsSwiping(false)
            return
        }

        setIsSwiping(false)

        // Check if swipe threshold was met
        if (Math.abs(swipeDistance) >= threshold) {
            setIsAnimating(true)

            if (swipeDistance > 0) {
                // Swiped right
                onSwipeRight?.()
            } else {
                // Swiped left
                onSwipeLeft?.()
            }

            // Animate back to center
            setTimeout(() => {
                setSwipeDistance(0)
                setIsAnimating(false)
            }, 300)
        } else {
            // Snap back to center
            setSwipeDistance(0)
        }
    }

    const handleActionClick = (action: SwipeAction) => {
        setIsAnimating(true)
        action.onAction()
        setTimeout(() => {
            setSwipeDistance(0)
            setIsAnimating(false)
        }, 300)
    }

    const showLeftActions = swipeDistance > 20
    const showRightActions = swipeDistance < -20

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Left actions */}
            {leftActions.length > 0 && (
                <div
                    className="absolute left-0 top-0 bottom-0 flex items-center gap-2 pl-4"
                    style={{
                        opacity: showLeftActions ? 1 : 0,
                        transform: `translateX(${Math.min(swipeDistance - 80, 0)}px)`,
                        transition: isAnimating || !isSwiping ? 'all 0.3s ease' : 'none'
                    }}
                >
                    {leftActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleActionClick(action)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm shadow-lg ${getActionColor(action.color)}`}
                        >
                            {action.icon}
                            <span className="hidden sm:inline">{action.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Right actions */}
            {rightActions.length > 0 && (
                <div
                    className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-4"
                    style={{
                        opacity: showRightActions ? 1 : 0,
                        transform: `translateX(${Math.max(swipeDistance + 80, 0)}px)`,
                        transition: isAnimating || !isSwiping ? 'all 0.3s ease' : 'none'
                    }}
                >
                    {rightActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleActionClick(action)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm shadow-lg ${getActionColor(action.color)}`}
                        >
                            {action.icon}
                            <span className="hidden sm:inline">{action.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Card content */}
            <div
                ref={cardRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateX(${swipeDistance}px)`,
                    transition: isAnimating || !isSwiping ? 'transform 0.3s ease' : 'none'
                }}
            >
                {children}
            </div>
        </div>
    )
}
