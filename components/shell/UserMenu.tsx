"use client"

import React, { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { ThemeToggle } from '../ThemeToggle'
import { NotificationBell } from '../notifications/NotificationBell'
import { getRoleCopy } from '@/lib/i18n/role-copy'

export interface UserMenuProps {
    user: {
        name: string
        email?: string
        avatarUrl?: string
        preferred_language?: 'el' | 'en'
    }
    notificationCount?: number
    onLogout?: () => void
    compact?: boolean
}

export function UserMenu({
    user,
    notificationCount = 0,
    onLogout,
    compact = false,
}: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
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

    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {/* Notifications - Interactive Bell */}
                <NotificationBell
                    initialUnreadCount={notificationCount}
                />

                {/* Avatar */}
                <button className="w-8 h-8 rounded-full bg-primary text-white dark:text-[#1A2420] text-sm font-medium flex items-center justify-center">
                    {initials}
                </button>
            </div>
        )
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
                <div className="w-10 h-10 rounded-full bg-primary text-white dark:text-[#1A2420] text-sm font-medium flex items-center justify-center flex-shrink-0">
                    {initials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                        {user.name}
                    </div>
                    {user.email && (
                        <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                            {user.email}
                        </div>
                    )}
                </div>
                <svg
                    className={`w-4 h-4 text-stone-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
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
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 right-0 mb-3 z-20 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-stone-200/50 dark:border-stone-700/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
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
                            <ThemeToggle />
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            disabled={isPending}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-stone-50 dark:hover:bg-stone-700 border-t border-stone-200 dark:border-stone-700 disabled:opacity-50"
                        >
                            {isPending ? t.common.loading : t.userMenu.logout}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
