"use client"

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'
import { RoleSwitcher } from './RoleSwitcher'
import { ThemeToggle } from '../ThemeToggle'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { InstallPrompt } from "@/components/pwa/InstallPrompt"
import { Users, Lightbulb, LayoutDashboard, MoreHorizontal, Wallet, Shield, Settings } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getRoleCopy } from '@/lib/i18n/role-copy'
import { track } from '@vercel/analytics'

export interface NavigationItem {
    label: string
    href: string
    icon?: React.ReactNode
    isActive?: boolean
    badge?: number
    variant?: 'default' | 'pro' | 'plus'
    isLocked?: boolean
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
        const isGreek = (t.common?.locale || '').startsWith('el')
        return [
            { href: '/home', icon: LayoutDashboard, label: isGreek ? 'Αρχική' : 'Home', id: 'home' },
            { href: '/wallet', icon: Wallet, label: t.nav.wallet, id: 'wallet' },
            { href: '/coverage-insights', icon: Shield, label: isGreek ? 'AI Insights' : 'AI Insights', id: 'analysis' },
            { href: '/agent', icon: Users, label: isGreek ? 'Σύμβουλος' : 'My Agent', id: 'agent' },
            { href: '/account', icon: Settings, label: t.userMenu.settings, id: 'settings' }
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
    const roleCopy = getRoleCopy(language)
    const pathname = usePathname()
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [roleChangeToast, setRoleChangeToast] = useState<string | null>(null)

    const handleNavigate = (href: string, source: 'default' | 'mobile_nav' = 'default', navId?: string) => {
        if (href === '#logout') {
            onLogout?.()
            return
        }
        if (source === 'mobile_nav') {
            track('mobile_nav_click', {
                destination: href,
                tab_id: navId || 'unknown',
                role: currentRole.role,
            })
        }
        if (onNavigate) {
            onNavigate(href)
        } else {
            router.push(href)
        }
        setSidebarOpen(false)
    }

    const hasMultipleRoles = availableRoles.length > 1
    const roleHomeHref = currentRole.role === 'policyholder'
        ? '/home'
        : currentRole.role === 'admin'
            ? '/admin/dashboard'
            : '/dashboard'

    const handleRoleSwitch = (role: UserRole) => {
        onRoleSwitch?.(role)
        setRoleChangeToast(roleCopy.shell.roleViewingAs(role.label))
        setTimeout(() => setRoleChangeToast(null), 3000)
    }

    const bottomNavItems = getBottomNavItems(currentRole.role, t)

    return (
        <>
            <div className="min-h-screen pw-app-canvas font-sans text-[var(--pw-text-primary-light)] dark:text-[var(--pw-text-primary-dark)]">
                {/* Mobile Top Header */}
                <header className="lg:hidden sticky top-0 z-40 w-full h-16 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-black/10 dark:border-white/10 px-4 flex items-center justify-between">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-black/60 hover:text-black dark:text-white/70 dark:hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <button onClick={() => handleNavigate(roleHomeHref)} className="hover:opacity-80 transition-opacity">
                        <PolicyWalletLogo size="sm" language={user.preferred_language || 'el'} />
                    </button>

                    <div className="w-10 h-10 flex items-center justify-center">
                        {/* Placeholder for future specific actions like search, but kept balanced for now */}
                    </div>
                </header>

                {/* Role change confirmation toast */}
                {roleChangeToast && (
                    <div className="fixed top-4 right-4 z-50 bg-[#1FDC86] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold">{roleChangeToast}</span>
                    </div>
                )}

                {/* Desktop Sidebar */}
                <aside
                    className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-white/95 dark:bg-black/95 border-r border-black/10 dark:border-white/10
          transform transition-transform duration-300 ease-in-out shadow-xl
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
                >
                    <div className="flex flex-col h-full">
                        {/* Enhanced Logo Section */}
                        <div className="flex flex-col border-b border-black/10 dark:border-white/10 bg-gradient-to-br from-white to-black/5 dark:from-black dark:to-[#111111]">
                            <div className="flex items-center justify-between px-6 h-16">
                                <button onClick={() => handleNavigate(roleHomeHref)} className="hover:opacity-80 transition-opacity">
                                    <PolicyWalletLogo size="md" language={user.preferred_language || 'el'} />
                                </button>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="lg:hidden p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/70 transition-colors"
                                    aria-label={roleCopy.shell.closeMenu}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {/* Context Indicator */}

                        </div>

                        {/* Role switcher */}
                        {hasMultipleRoles && (
                            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
                                <RoleSwitcher
                                    currentRole={currentRole}
                                    availableRoles={availableRoles}
                                    onRoleSwitch={handleRoleSwitch}
                                />
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex-1 overflow-y-auto py-6 px-3">
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
                        <div className="lg:hidden p-4 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-[#111111]/70 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-black/70 dark:text-white/70">{t.userMenu.settings}</span>
                                <div className="flex items-center gap-3">
                                    {/* Language */}
                                    <div className="flex bg-black/5 dark:bg-white/10 rounded-lg p-0.5">
                                        <button
                                            onClick={() => user.preferred_language !== 'el' && onNavigate?.('/?lang=el')}
                                            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${user.preferred_language === 'el' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-[#1FDC86]' : 'text-black/50 dark:text-white/60'}`}
                                        >
                                            GR
                                        </button>
                                        <button
                                            onClick={() => user.preferred_language !== 'en' && onNavigate?.('/?lang=en')}
                                            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${user.preferred_language === 'en' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-[#1FDC86]' : 'text-black/50 dark:text-white/60'}`}
                                        >
                                            EN
                                        </button>
                                    </div>
                                    <ThemeToggle />
                                </div>
                            </div>
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200/70 dark:border-red-400/30 bg-red-50/90 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold text-sm hover:bg-red-100/90 dark:hover:bg-red-950/50 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                {t.userMenu.logout}
                            </button>
                        </div>

                        {/* User menu (desktop) */}
                        <div className="hidden lg:block border-t border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-[#111111]/80">
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
                        className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content */}
                <main className="lg:pl-72 pb-24 lg:pb-0">
                    <div className="min-h-screen">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-black/95 border-t border-black/10 dark:border-white/10 safe-area-inset-bottom shadow-xl backdrop-blur-xl">
                    <div
                        className="grid gap-1.5 px-2 py-2 min-h-[76px]"
                        style={{ gridTemplateColumns: `repeat(${Math.max(bottomNavItems.length, 1)}, minmax(0, 1fr))` }}
                    >
                        {bottomNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigate(item.href, 'mobile_nav', item.id)}
                                    className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FDC86] focus-visible:ring-offset-2 ${isActive
                                        ? 'text-black dark:text-[#1FDC86] bg-[#1FDC86]/25 dark:bg-[#1FDC86]/15'
                                        : 'text-black/55 dark:text-white/60 hover:text-black dark:hover:text-white'
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
                                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1FDC86] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
                                                {notificationCount > 9 ? '9+' : notificationCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-medium whitespace-nowrap">
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


