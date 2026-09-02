"use client"

import React, { useId, useRef, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { ThemeToggle } from '../ThemeToggle'
import { getRoleCopy } from '@/lib/i18n/role-copy'
import { displayPersonName } from '@/lib/wallet/policy-identity'

export interface UserMenuProps {
    user: {
        name: string
        email?: string
        avatarUrl?: string
        preferred_language?: 'el' | 'en'
    }
    notificationCount?: number
    onLogout?: () => void
    /**
     * `compact` renders avatar + name only (the top bar); the default keeps the
     * email line (the sidebar foot it grew up in). `placement` says which way
     * the menu opens — up from a footer, down from a top bar.
     */
    compact?: boolean
    placement?: 'up' | 'down'
}

export function UserMenu({
    user,
    notificationCount = 0,
    onLogout,
    compact = false,
    placement = 'up',
}: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuTriggerRef = useRef<HTMLButtonElement>(null)
    const menuId = useId()

    // The dropdown had no keyboard exit: Escape did nothing and focus never came
    // back to the trigger. (A menu wants menu semantics, not a dialog trap.)
    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            setIsOpen(false)
            menuTriggerRef.current?.focus()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen])
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const { language, setLanguage, t } = useLanguage()
    const roleCopy = getRoleCopy(language)

    const handleLanguageChange = (lang: 'el' | 'en') => {
        startTransition(() => {
            setLanguage(lang)
            setIsOpen(false)
            router.refresh()
        })
    }

    const handleLogout = () => {
        startTransition(async () => {
            if (onLogout) {
                await onLogout()
            }
            setIsOpen(false)
        })
    }

    // A synthetic stored name ("E2E Policyholder", "Agent User") must not
    // render as the person — the account's email is the honest identifier.
    const displayName = displayPersonName(user.name) || user.email || roleCopy.defaults.userName
    const initials = displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    // A `compact` branch used to render a NotificationBell + avatar here, but
    // the shell's single call site (AppShell, desktop sidebar) never passed
    // `compact` — the branch had never executed. Deleted rather than kept as
    // plausible-looking dead code; the header's inline <Bell> is the only
    // notification bell the shell renders.
    return (
        <div className="relative">
            <button
                ref={menuTriggerRef}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => setIsOpen(!isOpen)}
                className={`${compact ? 'min-h-11' : 'w-full'} flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            >
                <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint text-sm font-semibold flex items-center justify-center flex-shrink-0">
                    {initials}
                </div>
                <div className={`flex-1 min-w-0 text-left ${compact ? 'hidden xl:block max-w-[12rem]' : ''}`}>
                    <div className="text-sm font-semibold text-foreground truncate">
                        {displayName}
                    </div>
                    {user.email && user.email !== displayName && (
                        <div className={`text-xs text-muted-foreground truncate ${compact ? 'hidden' : ''}`}>
                            {user.email}
                        </div>
                    )}
                </div>
                <svg
                    className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        aria-hidden="true"
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        id={menuId}
                        role="menu"
                        className={`absolute z-20 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in duration-200 ${
                            placement === 'down'
                                ? 'top-full right-0 mt-2 w-64 slide-in-from-top-2'
                                : 'bottom-full left-0 right-0 mb-3 slide-in-from-bottom-2'
                        }`}
                    >
                        {/* Notifications */}
                        <button
                            className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 flex items-center justify-between"
                            onClick={() => {
                                setIsOpen(false)
                                router.push('/notifications')
                            }}
                        >
                            <span>{t.userMenu.notifications}</span>
                            {notificationCount > 0 && (
                                /* The one UNsaturated render of the unread count
                                   (the shell badges cap at «9+»); desktop-only,
                                   so it never co-renders with a saturated badge. */
                                <span data-count="notification.unreadCount" className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                    {notificationCount}
                                </span>
                            )}
                        </button>

                        {/* Language switcher */}
                        <div className="px-4 py-2 border-t border-stone-200 dark:border-stone-700">
                            <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">{t.userMenu.language}</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleLanguageChange('el')}
                                    disabled={isPending}
                                    className={`
                    flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors
                    ${language === 'el'
                                            ? 'bg-primary text-white dark:text-[#1A2420]'
                                            : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
                                        }
                    ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                                >
                                    {t.userMenu.greek}
                                </button>
                                <button
                                    onClick={() => handleLanguageChange('en')}
                                    disabled={isPending}
                                    className={`
                    flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors
                    ${language === 'en'
                                            ? 'bg-primary text-white dark:text-[#1A2420]'
                                            : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
                                        }
                    ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                                >
                                    {t.userMenu.english}
                                </button>
                            </div>
                        </div>

                        {/* Settings */}
                        <button
                            className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 border-t border-stone-200 dark:border-stone-700 font-medium"
                            onClick={() => {
                                setIsOpen(false)
                                router.push('/account')
                            }}
                        >
                            {t.userMenu.settings}
                        </button>

                        <div className="flex items-center justify-between px-4 py-2 border-t border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700">
                            <span className="text-sm text-stone-700 dark:text-stone-300">{roleCopy.shell.theme}</span>
                            <ThemeToggle ariaLabel={t.userMenu.toggleTheme} />
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            disabled={isPending}
                            className="w-full px-4 py-2 text-left text-sm text-red-700 dark:text-red-400 hover:bg-stone-50 dark:hover:bg-stone-700 border-t border-stone-200 dark:border-stone-700 disabled:opacity-50"
                        >
                            {isPending ? t.common.loading : t.userMenu.logout}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
