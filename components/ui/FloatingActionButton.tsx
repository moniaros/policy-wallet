"use client"

import { useState, useEffect, useRef, useId, ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

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
    /** Localized accessible name for the trigger. Defaults to t.common.actions. */
    mainLabel?: string
    /** Localized accessible name while the menu is open. Defaults to t.common.close. */
    closeLabel?: string
    onMainClick?: () => void
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
    size?: 'sm' | 'md' | 'lg'
}

export function FloatingActionButton({
    actions = [],
    mainIcon = <Plus className="w-6 h-6" strokeWidth={2.5} />,
    mainLabel,
    closeLabel,
    onMainClick,
    position = 'bottom-right',
    size = 'lg'
}: FloatingActionButtonProps) {
    const { t } = useLanguage()
    const [isExpanded, setIsExpanded] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuId = useId()

    // Escape must close the speed-dial and hand focus back to the trigger —
    // otherwise the only way out of the expanded menu is a pointer.
    useEffect(() => {
        if (!isExpanded) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation()
                setIsExpanded(false)
                triggerRef.current?.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isExpanded])

    // Below lg the shell's floating tab bar owns the bottom of the screen
    // (--pw-bottom-nav-h plus the safe area), so the button sits just above
    // it; from lg there is no bar and the classic corner offset returns.
    const phoneBottom = 'bottom-[calc(var(--pw-bottom-nav-h)+env(safe-area-inset-bottom,0px)+0.5rem)] lg:bottom-6'
    const getPositionClasses = () => {
        switch (position) {
            case 'bottom-right':
                return `${phoneBottom} right-6`
            case 'bottom-left':
                return `${phoneBottom} left-6`
            case 'bottom-center':
                return `${phoneBottom} left-1/2 -translate-x-1/2`
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
                return 'bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420]'
            case 'emerald':
                return 'bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420]'
            case 'amber':
                return 'bg-amber-600 hover:bg-amber-700 text-white'
            case 'red':
                return 'bg-red-600 hover:bg-red-700 text-white'
            case 'purple':
                return 'bg-secondary hover:bg-primary-hover text-white'
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
                    aria-hidden="true"
                    className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            {/* FAB Container.
                `--pw-bottom-obstruction` is published by whatever is currently
                occupying the bottom of the screen — today the cookie consent
                banner, which is `fixed inset-x-0 bottom-0 z-[120]` and was
                covering this button entirely. A first-time customer with an
                empty wallet could not press the one control that adds a policy,
                which is the product's whole job.

                Raising z-index instead would have put this button on top of the
                consent text; sitting clear of it keeps both usable. Defaults to
                0px, so nothing changes once consent is given. */}
            <div className={`fixed ${getPositionClasses()} z-50`}>
                {/* Action Menu */}
                {actions.length > 0 && isExpanded && (
                    <div id={menuId} role="menu" aria-label={mainLabel ?? t.common.actions} className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-200">
                        {actions.map((action, index) => (
                            <div
                                key={action.id}
                                className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in"
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                    animationFillMode: 'backwards'
                                }}
                            >
                                {/* Label — aria-hidden because the button already carries it as its
                                    accessible name; announcing it twice is noise. */}
                                <span aria-hidden="true" className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-xl shadow-lg whitespace-nowrap border border-slate-200 dark:border-slate-700">
                                    {action.label}
                                </span>

                                {/* Action Button */}
                                <button
                                    role="menuitem"
                                    onClick={() => handleActionClick(action)}
                                    className={`flex items-center justify-center w-12 h-12 rounded-full shadow-xl transition-all hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${getActionColor(action.color)}`}
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
                    ref={triggerRef}
                    onClick={handleMainClick}
                    className={`${getSizeClasses()} flex items-center justify-center bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] rounded-full shadow-2xl shadow-primary/40 transition-all hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isExpanded ? 'rotate-45' : 'rotate-0'
                        }`}
                    aria-label={isExpanded ? (closeLabel ?? t.common.close) : (mainLabel ?? t.common.actions)}
                    {...(actions.length > 0 && {
                        'aria-haspopup': 'menu' as const,
                        'aria-expanded': isExpanded,
                        'aria-controls': isExpanded ? menuId : undefined,
                    })}
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
