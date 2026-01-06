"use client"

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'
import { RoleSwitcher } from './RoleSwitcher'

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
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [roleChangeToast, setRoleChangeToast] = useState<string | null>(null)

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
                            onNavigate={(href) => {
                                onNavigate?.(href)
                                setSidebarOpen(false)
                            }}
                        />
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
