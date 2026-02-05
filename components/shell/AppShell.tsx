"use client"

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'
import { RoleSwitcher } from './RoleSwitcher'
import { ThemeToggle } from '../ThemeToggle'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { InstallPrompt } from "@/components/pwa/InstallPrompt"
import { Home, BarChart3, Bell, Settings, Users, Lightbulb, LayoutDashboard, MoreHorizontal, ListChecks, User, LogOut, Wallet, Shield } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

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

// Bottom navigation items based on role
const getBottomNavItems = (role: UserRole['role'], t: any) => {
    if (role === 'policyholder') {
        return [
            { href: '/wallet', icon: Wallet, label: t.nav.wallet, id: 'wallet' },
            { href: '/tasks', icon: ListChecks, label: 'Tasks', id: 'tasks' },
            { href: '/coverage', icon: Shield, label: 'Coverage', id: 'coverage' },
            { href: '/notifications', icon: Bell, label: t.nav.notifications, id: 'notifications' },
            { href: '/account', icon: User, label: t.userMenu.settings, id: 'account' }
        ]
    } else if (role === 'agent') {
        const translations = {
            dashboard: t.nav.dashboard,
            customers: t.nav.customers,
            opportunities: t.nav.opportunities,
            more: t.common.actions
        }
        return [
            { href: '/dashboard', icon: LayoutDashboard, label: translations.dashboard, id: 'dashboard' },
            { href: '/customers', icon: Users, label: translations.customers, id: 'customers' },
            { href: '/opportunities', icon: Lightbulb, label: translations.opportunities, id: 'opportunities' },
            { href: '/account', icon: MoreHorizontal, label: translations.more, id: 'more' }
        ]
    }
    return []
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
    const { t, language } = useLanguage()
    const pathname = usePathname()
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [roleChangeToast, setRoleChangeToast] = useState<string | null>(null)

    const handleNavigate = (href: string) => {
        if (href === '#logout') {
            onLogout?.()
            return
        }
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
        setRoleChangeToast(`${t.userMenu.viewingAs || "Viewing as"} ${role.label}`)
        setTimeout(() => setRoleChangeToast(null), 3000)
    }

    const bottomNavItems = getBottomNavItems(currentRole.role, t)

    return (
        <>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
                {/* Role change confirmation toast */}
                {roleChangeToast && (
                    <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold">{roleChangeToast}</span>
                    </div>
                )}

                {/* Desktop Sidebar */}
                <aside
                    className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
                >
                    <div className="flex flex-col h-full">
                        {/* Logo */}
                        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200 dark:border-slate-800">
                            <PolicyWalletLogo size="sm" language={user.preferred_language || 'en'} />
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                aria-label="Close menu"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Role switcher */}
                        {hasMultipleRoles && (
                            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
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
                        <div className="lg:hidden p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.userMenu.settings}</span>
                                <div className="flex items-center gap-3">
                                    {/* Language */}
                                    <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5">
                                        <button
                                            onClick={() => user.preferred_language !== 'el' && onNavigate?.('/?lang=el')}
                                            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${user.preferred_language === 'el' ? 'bg-white dark:bg-slate-600 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}
                                        >
                                            GR
                                        </button>
                                        <button
                                            onClick={() => user.preferred_language !== 'en' && onNavigate?.('/?lang=en')}
                                            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${user.preferred_language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}
                                        >
                                            EN
                                        </button>
                                    </div>
                                    <ThemeToggle />
                                </div>
                            </div>
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                {t.userMenu.logout}
                            </button>
                        </div>

                        {/* User menu (desktop) */}
                        <div className="hidden lg:block border-t border-slate-200 dark:border-slate-800 p-4">
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
                        className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content */}
                <main className="lg:pl-64 pb-16 lg:pb-0">
                    <div className="min-h-screen">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 safe-area-inset-bottom shadow-xl">
                    <div className="grid grid-cols-5 h-20">
                        {bottomNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigate(item.href)}
                                    className={`flex flex-col items-center justify-center gap-1.5 transition-all active:scale-90 ${isActive
                                        ? 'text-teal-600 dark:text-teal-400'
                                        : 'text-stone-400 dark:text-stone-500'
                                        }`}
                                    aria-label={item.label}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <div className="relative">
                                        <Icon
                                            className="w-6 h-6"
                                            strokeWidth={2.5}
                                        />
                                        {item.id === 'notifications' && notificationCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-teal-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-teal-600/30">
                                                {notificationCount > 9 ? '9+' : notificationCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                        {item.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </nav>
            </div>
            <InstallPrompt />
        </>
    )
}
