"use client"

import { useState, ReactNode } from 'react'
import { Plus, X } from 'lucide-react'

export interface FABAction {
    id: string
    label: string
    icon: ReactNode
    color?: 'sky' | 'emerald' | 'amber' | 'red' | 'purple'
    onClick: () => void
}

interface FloatingActionButtonProps {
    actions?: FABAction[]
    mainIcon?: ReactNode
    mainLabel?: string
    onMainClick?: () => void
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
    size?: 'sm' | 'md' | 'lg'
}

export function FloatingActionButton({
    actions = [],
    mainIcon = <Plus className="w-6 h-6" strokeWidth={2.5} />,
    mainLabel = 'Add',
    onMainClick,
    position = 'bottom-right',
    size = 'lg'
}: FloatingActionButtonProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const getPositionClasses = () => {
        switch (position) {
            case 'bottom-right':
                return 'bottom-6 right-6'
            case 'bottom-left':
                return 'bottom-6 left-6'
            case 'bottom-center':
                return 'bottom-6 left-1/2 -translate-x-1/2'
        }
    }

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'w-12 h-12'
            case 'md':
                return 'w-14 h-14'
            case 'lg':
                return 'w-16 h-16'
        }
    }

    const getActionColor = (color: FABAction['color'] = 'sky') => {
        switch (color) {
            case 'sky':
                return 'bg-sky-600 hover:bg-sky-700 text-white'
            case 'emerald':
                return 'bg-emerald-600 hover:bg-emerald-700 text-white'
            case 'amber':
                return 'bg-amber-600 hover:bg-amber-700 text-white'
            case 'red':
                return 'bg-red-600 hover:bg-red-700 text-white'
            case 'purple':
                return 'bg-purple-600 hover:bg-purple-700 text-white'
        }
    }

    const handleMainClick = () => {
        if (actions.length > 0) {
            setIsExpanded(!isExpanded)
        } else if (onMainClick) {
            onMainClick()
        }
    }

    const handleActionClick = (action: FABAction) => {
        action.onClick()
        setIsExpanded(false)
    }

    return (
        <>
            {/* Backdrop */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            {/* FAB Container */}
            <div className={`fixed ${getPositionClasses()} z-50`}>
                {/* Action Menu */}
                {actions.length > 0 && isExpanded && (
                    <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-200">
                        {actions.map((action, index) => (
                            <div
                                key={action.id}
                                className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in"
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                    animationFillMode: 'backwards'
                                }}
                            >
                                {/* Label */}
                                <span className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-xl shadow-lg whitespace-nowrap border border-slate-200 dark:border-slate-700">
                                    {action.label}
                                </span>

                                {/* Action Button */}
                                <button
                                    onClick={() => handleActionClick(action)}
                                    className={`flex items-center justify-center w-12 h-12 rounded-full shadow-xl transition-all hover:scale-110 active:scale-95 ${getActionColor(action.color)}`}
                                    aria-label={action.label}
                                >
                                    {action.icon}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main FAB */}
                <button
                    onClick={handleMainClick}
                    className={`${getSizeClasses()} flex items-center justify-center bg-gradient-to-br from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white rounded-full shadow-2xl shadow-sky-500/40 transition-all hover:scale-110 active:scale-95 ${isExpanded ? 'rotate-45' : 'rotate-0'
                        }`}
                    aria-label={isExpanded ? 'Close menu' : mainLabel}
                >
                    {isExpanded && actions.length > 0 ? (
                        <X className="w-6 h-6" strokeWidth={2.5} />
                    ) : (
                        mainIcon
                    )}
                </button>

                {/* Ripple effect on tap */}
                <div className="absolute inset-0 rounded-full bg-white opacity-0 pointer-events-none animate-ping" />
            </div>
        </>
    )
}
