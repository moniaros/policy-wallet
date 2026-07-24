"use client"

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'
import { RoleSwitcher } from './RoleSwitcher'
import { ThemeToggle } from '../ThemeToggle'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { InstallPrompt } from "@/components/pwa/InstallPrompt"
import { Users, Lightbulb, LayoutDashboard, MoreHorizontal, Wallet, Shield, Settings, TrendingUp, Bell } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDialog } from '@/hooks/useDialog'
import { toast } from 'sonner'
import { setActiveRole } from '@/app/(protected)/role-actions'
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

/** The two locales, as the mobile footer toggle renders them. "GR"/"EN" are
 *  locale codes shown verbatim in both languages, not translatable copy. */
const LANGUAGE_OPTIONS = [
    { value: 'el' as const, label: 'GR' },
    { value: 'en' as const, label: 'EN' },
]

interface BottomNavItem {
    href: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    label: string
    id: string
    /** Show the unread-notification count on this tab. */
    showsNotificationBadge?: boolean
}

// Bottom navigation items based on role
const getBottomNavItems = (role: UserRole['role'], t: any): BottomNavItem[] => {
    if (role === 'policyholder') {
        return [
            { href: '/dashboard', icon: LayoutDashboard, label: t.nav.home, id: 'home' },
            { href: '/wallet', icon: Wallet, label: t.nav.wallet, id: 'wallet' },
            { href: '/coverage-insights', icon: Shield, label: t.nav.insightsShort, id: 'analysis' },
            { href: '/agent', icon: Users, label: t.nav.agentShort, id: 'agent' },
            // The unread badge used to be hardcoded to `item.id === 'notifications'`,
            // an id NO bottom-nav item has — so on mobile the badge could never
            // render for any role. It now rides on whichever tab owns notifications;
            // /account is where the policyholder reaches them.
            { href: '/account', icon: Settings, label: t.userMenu.settings, id: 'settings', showsNotificationBadge: true }
        ]
    } else if (role === 'agent') {
        const translations = {
            dashboard: t.nav.dashboard,
            customers: t.nav.customers,
            opportunities: t.nav.opportunities,
            insights: t.nav.insights,
            more: t.common.actions
        }
        return [
            { href: '/dashboard/agent', icon: LayoutDashboard, label: translations.dashboard, id: 'dashboard' },
            { href: '/customers', icon: Users, label: translations.customers, id: 'customers' },
            { href: '/opportunities', icon: TrendingUp, label: translations.opportunities, id: 'opportunities' },
            { href: '/insights', icon: Lightbulb, label: translations.insights, id: 'insights' },
            { href: '/account', icon: MoreHorizontal, label: translations.more, id: 'more', showsNotificationBadge: true }
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
    const { t, language, setLanguage } = useLanguage()
    const roleCopy = getRoleCopy(language)
    const pathname = usePathname()
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    // Focus trap + Escape + focus-return for the mobile drawer.
    const drawerRef = useDialog<HTMLElement>(() => setSidebarOpen(false), sidebarOpen)
    const [, startRoleSwitch] = useTransition()

    /**
     * Side effects that accompany a navigation. Nav items are real <Link>s now
     * (middle-click, open-in-new-tab and screen-reader link semantics all work),
     * so this no longer performs the navigation itself — it only fires analytics
     * and closes the mobile drawer. Non-route hrefs ('#logout') still route
     * through here as buttons.
     */
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
        onNavigate?.(href)
        setSidebarOpen(false)
    }

    const hasMultipleRoles = availableRoles.length > 1
    const roleHomeHref = currentRole.role === 'policyholder'
        ? '/dashboard'
        : currentRole.role === 'admin'
            ? '/admin/dashboard'
            : '/dashboard/agent'

    /**
     * This used to call an `onRoleSwitch` prop that the protected layout never
     * passed, then show a "viewing as X" toast anyway — the switcher reported a
     * change that never happened. It now persists the active role server-side
     * (validated against the roles the user actually holds) and lands on that
     * role's home, so the shell's navigation genuinely changes.
     */
    const handleRoleSwitch = (role: UserRole) => {
        onRoleSwitch?.(role)
        startRoleSwitch(async () => {
            const result = await setActiveRole(role.role)
            if ('error' in result) {
                toast.error(t.errors.somethingWentWrong)
                return
            }
            toast.success(roleCopy.shell.roleViewingAs(role.label))
            router.push(
                role.role === 'policyholder' ? '/dashboard'
                    : role.role === 'admin' ? '/admin/dashboard'
                        : '/dashboard/agent'
            )
        })
    }

    const bottomNavItems = getBottomNavItems(currentRole.role, t)
    const hasBottomNav = bottomNavItems.length > 0

    return (
        <>
            <div className="min-h-screen pw-app-canvas font-sans text-[var(--pw-text-primary-light)] dark:text-[var(--pw-text-primary-dark)]">
                {/* Skip link — first focusable element in the authenticated app, so a
                    keyboard/SR user can jump the sidebar instead of tabbing ~14 items
                    on every page. Visually hidden until focused. */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-primary focus:text-white dark:focus:text-[#1A2420] focus:text-sm focus:font-semibold focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    {t.nav.skipToContent}
                </a>

                {/* Mobile Top Header */}
                <header className="lg:hidden sticky top-0 z-40 w-full h-16 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-black/10 dark:border-white/10 px-4 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        aria-label={t.nav.primaryNavigation}
                        aria-expanded={sidebarOpen}
                        aria-controls="app-sidebar"
                        className="p-2 -ml-2 text-black/60 hover:text-black dark:text-white/70 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <Link
                        href={roleHomeHref}
                        onClick={() => handleNavigate(roleHomeHref)}
                        className="flex h-11 items-center rounded-lg px-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <PolicyWalletLogo size="sm" language={user.preferred_language || 'el'} />
                    </Link>

                    {/* Notifications. This was an empty 40px spacer "kept balanced for
                        now" — dead space on the most valuable strip of a phone screen,
                        while the unread count was reachable only by opening the drawer.
                        A 44px target (the iOS/Android minimum) keeps the logo optically
                        centred and gives the badge somewhere to live. */}
                    <Link
                        href="/notifications"
                        onClick={() => handleNavigate('/notifications')}
                        aria-label={notificationCount > 0
                            ? `${t.nav.notifications} (${notificationCount})`
                            : t.nav.notifications}
                        className="relative -mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-black/60 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-white/70 dark:hover:text-white"
                    >
                        <Bell className="h-6 w-6" strokeWidth={2} />
                        {notificationCount > 0 && (
                            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.5625rem] font-bold leading-none text-white dark:text-[#1A2420]">
                                {notificationCount > 9 ? '9+' : notificationCount}
                            </span>
                        )}
                    </Link>
                </header>


                {/* Sidebar — a static landmark at lg+, a modal drawer below it.
                    The drawer had no focus trap, no dialog semantics and no Escape:
                    opening it on a phone left focus behind it on the page. useDialog
                    supplies all three (and returns focus to the hamburger on close);
                    the dialog role is applied only while it is actually behaving as
                    an overlay, i.e. when open below lg. */}
                <aside
                    id="app-sidebar"
                    ref={drawerRef}
                    {...(sidebarOpen
                        ? { role: 'dialog' as const, 'aria-modal': true, 'aria-label': t.nav.primaryNavigation, tabIndex: -1 }
                        : {})}
                    className={`
          fixed top-0 left-0 z-50 h-full w-[17rem] lg:w-64 xl:w-72 bg-white/95 dark:bg-black/95 border-r border-black/10 dark:border-white/10
          transform transition-transform duration-300 ease-in-out shadow-xl
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
                >
                    <div className="flex flex-col h-full">
                        {/* Enhanced Logo Section */}
                        <div className="flex flex-col border-b border-black/10 dark:border-white/10 bg-gradient-to-br from-white to-black/5 dark:from-black dark:to-[#111111]">
                            <div className="flex items-center justify-between px-6 h-16">
                                <Link href={roleHomeHref} onClick={() => handleNavigate(roleHomeHref)} className="hover:opacity-80 transition-opacity">
                                    <PolicyWalletLogo size="md" language={user.preferred_language || 'el'} />
                                </Link>
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
                                    {/* Language — this was a DEAD control: it called
                                        onNavigate?.('/?lang=el'), and the protected layout
                                        never passes onNavigate, so tapping it did nothing.
                                        (Even wired, it would have navigated the user away to
                                        `/`.) setLanguage from the context is the real
                                        mechanism — it persists to localStorage AND
                                        POST /api/user/language. Active state now reads the
                                        live context value rather than the server-rendered
                                        prop, which could disagree with it. */}
                                    <div className="flex bg-black/5 dark:bg-white/10 rounded-lg p-0.5" role="group" aria-label={t.userMenu.language}>
                                        {LANGUAGE_OPTIONS.map(({ value, label }) => {
                                            const isActive = language === value
                                            return (
                                                <button
                                                    key={value}
                                                    onClick={() => setLanguage(value)}
                                                    aria-pressed={isActive}
                                                    className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isActive ? 'bg-white dark:bg-black shadow-sm text-black dark:text-mint' : 'text-black/60 dark:text-white/60'}`}
                                                >
                                                    {label}
                                                </button>
                                            )
                                        })}
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

                {/* Main content — pb-24 only clears a bottom bar that actually renders. */}
                <main id="main-content" className={`lg:pl-64 xl:pl-72 lg:pb-0 ${hasBottomNav ? 'pb-24' : ''}`}>
                    <div className="min-h-screen">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation — admins have no bottom-nav items, and an
                    empty 76px bar was still rendering (plus its pb-24 gutter) on every
                    admin page. Render the landmark only when it has content. */}
                {hasBottomNav && (
                    <nav
                        aria-label={t.nav.bottomNavigation}
                        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-black/95 border-t border-black/10 dark:border-white/10 safe-area-inset-bottom shadow-xl backdrop-blur-xl"
                    >
                        <div
                            className="grid gap-1.5 px-2 py-2 min-h-[76px]"
                            style={{ gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))` }}
                        >
                            {bottomNavItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={() => handleNavigate(item.href, 'mobile_nav', item.id)}
                                        className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isActive
                                            ? 'text-primary dark:text-mint bg-primary/15 dark:bg-primary/15'
                                            : 'text-black/55 dark:text-white/60 hover:text-black dark:hover:text-white'
                                            }`}
                                        /* The badge is purely visual, so fold the count into
                                           the accessible name — otherwise a screen-reader
                                           user never learns there are unread items. */
                                        aria-label={item.showsNotificationBadge && notificationCount > 0
                                            ? `${item.label} (${notificationCount} ${t.nav.notifications})`
                                            : item.label}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <div className="relative">
                                            <Icon
                                                className="w-6 h-6"
                                                strokeWidth={2.5}
                                            />
                                            {item.showsNotificationBadge && notificationCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white dark:text-[#1A2420] text-kicker font-bold rounded-full flex items-center justify-center shadow-lg">
                                                    {notificationCount > 9 ? '9+' : notificationCount}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-kicker font-medium whitespace-nowrap">
                                            {item.label}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    </nav>
                )}
            </div>
            <InstallPrompt />
        </>
    )
}


