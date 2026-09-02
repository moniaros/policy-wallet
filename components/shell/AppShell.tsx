"use client"

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'
import { RoleSwitcher } from './RoleSwitcher'
import { CommandSearch, type CommandSearchItem, type CommandSearchLabels } from './CommandSearch'
import { ThemeToggle } from '../ThemeToggle'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { InstallPrompt } from "@/components/pwa/InstallPrompt"
import { Users, Lightbulb, LayoutDashboard, MoreHorizontal, Wallet, Shield, Settings, TrendingUp, Bell } from 'lucide-react'
import { LocaleToggle } from "@/components/ui/LocaleToggle"
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
    /**
     * The desktop top bar's search — the account's own policies, already
     * loaded by the layout. Absent (agents, admins) the bar renders without
     * the field.
     */
    searchItems?: CommandSearchItem[]
    searchLabels?: CommandSearchLabels
    onNavigate?: (href: string) => void
    onRoleSwitch?: (role: UserRole) => void
    onLogout?: () => void
}

interface BottomNavItemBase {
    /** Opens the nav drawer instead of navigating. */
    opensDrawer?: boolean
}

interface BottomNavItem extends BottomNavItemBase {
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
        // §4.2: the same five tabs as the sidebar — /protection absorbed
        // /branches, /insights/risk-profile and /coverage-insights. The bell
        // (→ /notifications, with the unread badge) lives in the mobile top
        // header, so the badge no longer rides on a tab here.
        return [
            { href: '/dashboard', icon: LayoutDashboard, label: t.nav.home, id: 'home' },
            { href: '/wallet', icon: Wallet, label: t.nav.walletShort, id: 'wallet' },
            { href: '/protection', icon: Shield, label: t.nav.protectionShort, id: 'protection' },
            { href: '/agent', icon: Users, label: t.nav.agentShort, id: 'agent' },
            { href: '/account', icon: Settings, label: t.userMenu.settings, id: 'settings' }
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
            // Opens the drawer rather than navigating. It carries the "more"
            // icon and is labelled «Ενέργειες»/"Actions", but it used to go
            // straight to /account — so the one slot that looked like it led to
            // the rest of the product led to settings, and renewals, tasks,
            // commissions, questionnaires, team and activity were reachable on
            // mobile ONLY through the hamburger. Renewals and tasks are daily
            // advisor work; they should not be two taps behind a drawer the
            // bottom bar never points at.
            { href: '/account', icon: MoreHorizontal, label: translations.more, id: 'more', showsNotificationBadge: true, opensDrawer: true }
        ]
    }
    return []
}

/**
 * The authenticated app's chrome. Direction A (2026-09-03): a flat cool-slate
 * canvas, a white sidebar with grouped navigation and a bar for the active
 * row, a desktop top bar carrying search · bell · account (the user menu moved
 * up from the sidebar's foot), and a phone tab bar whose active tab is a mark
 * and a weight change rather than a filled pill. Light is the default theme;
 * dark stays a real second theme through the same tokens.
 */
export function AppShell({
    children,
    navigation,
    currentRole,
    availableRoles = [],
    user,
    notificationCount = 0,
    searchItems,
    searchLabels,
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
    // The policyholder nav carries sign-out as a row (Γενικά → Αποσύνδεση); the
    // drawer footer's red button then says the same thing twice on one screen.
    // Roles whose nav has no such row (agent, admin) keep the footer button.
    const navHasLogout = navigation.some((group) => group.items.some((item) => item.href === '#logout'))
    const bellLabel = notificationCount > 0
        ? `${t.nav.notifications} (${notificationCount})`
        : t.nav.notifications

    return (
        <>
            <div className="min-h-screen pw-app-canvas font-sans text-foreground">
                {/* Skip link — first focusable element in the authenticated app, so a
                    keyboard/SR user can jump the sidebar instead of tabbing ~14 items
                    on every page. Visually hidden until focused. */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-semibold focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    {t.nav.skipToContent}
                </a>

                {/* Mobile Top Header. `inert` while the drawer is open: the drawer
                    declares aria-modal, and the scrim only covers pointers — inert is
                    what actually removes these controls from focus and the
                    accessibility tree while the modal claims they are unreachable. */}
                <header inert={sidebarOpen || undefined} className="lg:hidden sticky top-0 z-40 w-full h-16 bg-card/95 backdrop-blur-xl border-b border-border px-4 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        aria-label={t.nav.primaryNavigation}
                        aria-expanded={sidebarOpen}
                        aria-controls="app-sidebar"
                        // 40x44 before: `p-2` on a 24px icon gives 40 wide, which
                        // is under the 44px floor on the axis a thumb misses on.
                        className="grid h-11 w-11 -ml-2 place-items-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
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
                        aria-label={bellLabel}
                        className="relative -mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <Bell className="h-6 w-6" strokeWidth={2} />
                        {notificationCount > 0 && (
                            /* data-count: the badge is a render of the unread
                               count (saturated at «9+», which the collector
                               reads as 9 — keep the threshold identical on
                               every badge site, see count-keys.ts). */
                            <span data-count="notification.unreadCount" className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-kicker font-bold leading-none text-primary-foreground">
                                {notificationCount > 9 ? '9+' : notificationCount}
                            </span>
                        )}
                    </Link>
                </header>

                {/* Desktop top bar — the reference's one command surface: search,
                    the bell, the account. Sticky under the viewport top, offset by
                    the sidebar's width so it never slides beneath it. `hidden
                    lg:block` on the wrapper: below 1024px the mobile header owns
                    these controls, and the drawer's inert/scrim contract is
                    measured against that header, not this one. */}
                <div className="hidden lg:block sticky top-0 z-30 lg:pl-64 xl:pl-72" inert={sidebarOpen || undefined}>
                    <div className="flex h-16 items-center gap-4 border-b border-border bg-card/95 px-6 backdrop-blur-xl xl:px-8">
                        {searchItems && searchLabels ? (
                            <CommandSearch items={searchItems} labels={searchLabels} className="w-full max-w-xl" />
                        ) : (
                            <span className="flex-1" />
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            <Link
                                href="/notifications"
                                onClick={() => handleNavigate('/notifications')}
                                aria-label={bellLabel}
                                className="relative flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <Bell className="h-5 w-5" strokeWidth={1.75} />
                                {notificationCount > 0 && (
                                    /* Same fact, same key, same «9+» saturation as the
                                       mobile header and the sidebar row — two renders of
                                       one count on one screen must never disagree. */
                                    <span data-count="notification.unreadCount" className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-kicker font-bold leading-none text-primary-foreground">
                                        {notificationCount > 9 ? '9+' : notificationCount}
                                    </span>
                                )}
                            </Link>
                            <div className="h-6 w-px bg-border" aria-hidden="true" />
                            <UserMenu
                                user={user}
                                notificationCount={notificationCount}
                                onLogout={onLogout}
                                compact
                                placement="down"
                            />
                        </div>
                    </div>
                </div>

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
          fixed top-0 left-0 z-50 h-full w-[17rem] lg:w-64 xl:w-72 bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
                >
                    <div className="flex flex-col h-full">
                        {/* Wordmark */}
                        <div className="flex items-center justify-between px-6 h-16 border-b border-border lg:border-b-0">
                            {/* h-11 wrapper for the same reason the top-header logo
                                link has one: the md wordmark is 40px tall on its own. */}
                            <Link href={roleHomeHref} onClick={() => handleNavigate(roleHomeHref)} className="flex h-11 items-center rounded-lg hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                <PolicyWalletLogo size="md" language={user.preferred_language || 'el'} />
                            </Link>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                // 36x36 before: p-2 around a 20px icon. -mr-2 keeps the
                                // icon optically where it was inside the px-6 gutter.
                                className="lg:hidden grid h-11 w-11 -mr-2 place-items-center rounded-xl hover:bg-muted text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={roleCopy.shell.closeMenu}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Role switcher */}
                        {hasMultipleRoles && (
                            <div className="px-4 py-3 border-b border-border">
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
                        <div className="lg:hidden p-4 border-t border-border bg-muted/60 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-foreground/80">{t.nav.preferences}</span>
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
                                    <LocaleToggle variant="group" ariaLabel={t.userMenu.language} />
                                    <ThemeToggle ariaLabel={t.userMenu.toggleTheme} />
                                </div>
                            </div>
                            {!navHasLogout && (
                            <button
                                onClick={onLogout}
                                className="w-full min-h-11 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-status-danger-edge bg-status-danger-tint text-status-danger font-semibold text-sm transition-colors hover:opacity-90"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                {t.userMenu.logout}
                            </button>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Mobile sidebar overlay. z-[45], not z-40: every fixed element in
                    the shell shares one stacking context, so at z-40 the bottom nav
                    and the InstallPrompt — both z-40 but LATER in the DOM — painted
                    over the scrim, leaving live, undimmed controls inside a surface
                    the drawer declares aria-modal over. 45 sits above all z-40 chrome
                    and below the drawer's own z-50.
                    tests/unit/shell-chrome-invariants.test.tsx guards the ordering. */}
                {sidebarOpen && (
                    <div
                        aria-hidden="true"
                        className="lg:hidden fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content — pb-24 only clears a bottom bar that actually renders. */}
                {/* `pw-bottom-nav-reserve`, not `pb-24`: the reservation has to include
                    env(safe-area-inset-bottom) or the bar covers the last 15px of
                    every page on a notched iPhone. See app/globals.css. */}
                <main id="main-content" className={`lg:pl-64 xl:pl-72 lg:pb-0 ${hasBottomNav ? 'pw-bottom-nav-reserve lg:!pb-0' : ''}`}>
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
                        // inert while the drawer is open — see the header's comment.
                        inert={sidebarOpen || undefined}
                        className="pw-above-consent lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border safe-area-inset-bottom backdrop-blur-xl"
                    >
                        <div
                            className="grid gap-1 px-2 py-1.5 min-h-[76px]"
                            style={{ gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))` }}
                        >
                            {bottomNavItems.map((item) => {
                                const Icon = item.icon
                                const isActive = !item.opensDrawer && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
                                // A drawer trigger is a button, not a link: it
                                // performs no navigation, so rendering it as an
                                // anchor would announce a destination to screen
                                // readers that it never goes to.
                                const Tag: any = item.opensDrawer ? 'button' : Link
                                const tagProps = item.opensDrawer
                                    ? {
                                        type: 'button' as const,
                                        onClick: () => setSidebarOpen(true),
                                        'aria-expanded': sidebarOpen,
                                        // The real drawer element, so the
                                        // relationship actually resolves.
                                        'aria-controls': 'app-sidebar',
                                    }
                                    : {
                                        href: item.href,
                                        onClick: () => handleNavigate(item.href, 'mobile_nav', item.id),
                                    }

                                return (
                                    <Tag
                                        key={item.id}
                                        {...tagProps}
                                        /* The active tab is a MARK (the bar at the top of the
                                           slot) plus a weight and colour change — never a filled
                                           pill, which read as a button on a bar of buttons. */
                                        className={`relative min-h-[44px] w-full rounded-xl flex flex-col items-center justify-center gap-1 pt-1.5 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isActive
                                            ? 'text-primary dark:text-mint'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        /* The badge is purely visual, so fold the count into
                                           the accessible name — otherwise a screen-reader
                                           user never learns there are unread items. */
                                        aria-label={item.showsNotificationBadge && notificationCount > 0
                                            ? `${item.label} (${notificationCount} ${t.nav.notifications})`
                                            : item.label}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        {isActive && (
                                            <span aria-hidden="true" className="absolute top-0 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-b-full bg-primary dark:bg-mint" />
                                        )}
                                        <div className="relative">
                                            <Icon
                                                className="w-6 h-6"
                                                strokeWidth={isActive ? 2.25 : 1.75}
                                            />
                                            {item.showsNotificationBadge && notificationCount > 0 && (
                                                /* Same fact as the header bell badge —
                                                   same key, same «9+» saturation. */
                                                <span data-count="notification.unreadCount" className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground text-kicker font-bold rounded-full flex items-center justify-center">
                                                    {notificationCount > 9 ? '9+' : notificationCount}
                                                </span>
                                            )}
                                        </div>
                                        {/* 12px — the functional floor. Tab labels are read to
                                            navigate; 10px was decorative-size copy doing a
                                            functional job. */}
                                        <span className={`text-caption whitespace-nowrap ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                            {item.label}
                                        </span>
                                    </Tag>
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
