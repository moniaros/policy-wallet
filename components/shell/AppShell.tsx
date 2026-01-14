"use client"

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'
import { RoleSwitcher } from './RoleSwitcher'
import { ThemeToggle } from '../ThemeToggle'

export interface NavigationItem {
    label: string
    href: string
    icon?: React.ReactNode
    isActive?: boolean
    badge?: number
}

export interface NavigationGroup {
    title?: string
    items: NavigationItem[]
}

export interface UserRole {
    role: 'policyholder' | 'agent' | 'admin'
    label: string
}

export interface AppShellProps {
    children: React.ReactNode
    navigation: NavigationGroup[]
    currentRole: UserRole
    availableRoles?: UserRole[]
    user: {
        name: string
        email?: string
        avatarUrl?: string
        preferred_language?: 'el' | 'en'
    }
    language?: 'el' | 'en'
    notificationCount?: number
    onNavigate?: (href: string) => void
    onRoleSwitch?: (role: UserRole) => void
    onLogout?: () => void
}

export function AppShell({
    children,
    navigation,
    currentRole,
    availableRoles = [],
    user,
    notificationCount = 0,
    onNavigate,
    onRoleSwitch,
    onLogout,
}: AppShellProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [roleChangeToast, setRoleChangeToast] = useState<string | null>(null)

    const handleNavigate = (href: string) => {
        if (onNavigate) {
            onNavigate(href)
        } else {
            router.push(href)
        }
        setSidebarOpen(false)
    }

    const hasMultipleRoles = availableRoles.length > 1

    const handleRoleSwitch = (role: UserRole) => {
        onRoleSwitch?.(role)
        setRoleChangeToast(`You're now viewing PolicyWallet as ${role.label}`)
        setTimeout(() => setRoleChangeToast(null), 3000)
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            {/* Role change confirmation toast */}
            {roleChangeToast && (
                <div className="fixed top-4 right-4 z-50 bg-teal-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{roleChangeToast}</span>
                </div>
            )}

            {/* Mobile header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                <div className="flex items-center justify-between px-4 h-16">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div className="font-semibold text-stone-900 dark:text-stone-100">
                        PolicyWallet
                    </div>

                    <UserMenu
                        user={user}
                        notificationCount={notificationCount}
                        onLogout={onLogout}
                        compact
                    />
                </div>
            </div>

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-stone-800 border-r border-stone-200 dark:border-stone-700
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between px-6 h-16 border-b border-stone-200 dark:border-stone-700">
                        <div className="font-semibold text-lg text-stone-900 dark:text-stone-100">
                            PolicyWallet
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500"
                            aria-label="Close menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Role switcher */}
                    {hasMultipleRoles && (
                        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-700">
                            <RoleSwitcher
                                currentRole={currentRole}
                                availableRoles={availableRoles}
                                onRoleSwitch={handleRoleSwitch}
                            />
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-4">
                        <MainNav
                            navigation={navigation.map(group => ({
                                ...group,
                                items: group.items.map(item => ({
                                    ...item,
                                    isActive: pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                                }))
                            }))}
                            onNavigate={handleNavigate}
                        />
                    </div>

                    {/* Mobile Footer (Sign Out & Theme) */}
                    <div className="lg:hidden p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-stone-600 dark:text-stone-400">Settings</span>
                            <div className="flex items-center gap-3">
                                {/* Language */}
                                <div className="flex bg-stone-200 dark:bg-stone-800 rounded-lg p-0.5">
                                    <button
                                        onClick={() => user.preferred_language !== 'el' && onNavigate?.('/?lang=el')}
                                        className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${user.preferred_language === 'el' ? 'bg-white dark:bg-stone-600 shadow-sm' : 'text-stone-500'}`}
                                    >
                                        GR
                                    </button>
                                    <button
                                        onClick={() => user.preferred_language !== 'en' && onNavigate?.('/?lang=en')}
                                        className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${user.preferred_language === 'en' ? 'bg-white dark:bg-stone-600 shadow-sm' : 'text-stone-500'}`}
                                    >
                                        EN
                                    </button>
                                </div>
                                <ThemeToggle />
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                        </button>
                    </div>

                    {/* User menu (desktop) */}
                    <div className="hidden lg:block border-t border-stone-200 dark:border-stone-700 p-4">
                        <UserMenu
                            user={user}
                            notificationCount={notificationCount}
                            onLogout={onLogout}
                        />
                    </div>
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-stone-900/50"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <main className="lg:pl-64 pt-16 lg:pt-0">
                <div className="min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    )
}
