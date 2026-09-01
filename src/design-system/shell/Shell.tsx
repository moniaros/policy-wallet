import type { ReactNode } from "react"
import { SideRail } from "./SideRail"
import { Sidebar } from "./Sidebar"
import { TabBar } from "./TabBar"
import { Fab } from "./Fab"
import { ChromeProvider } from "./chrome-context"
import type { ShellLabels, ShellNavItem, ShellUser } from "./types"

/**
 * The application shell (§5.2): one component tree, three chromes.
 *   < 768px   — the tab bar and the FAB; the page's LargeTitleNav is the header
 *   768–1099  — the 76px icon rail; a single content column up to 720px
 *   ≥ 1100    — the 248px labelled sidebar; content up to 760px (the home
 *               screen lays its own two columns inside)
 * Server component: labels arrive resolved; the active state lives in the
 * client leaves (they read the pathname).
 */
export function Shell({
    primary,
    sidebar,
    updates,
    secondary,
    add,
    badge,
    labels,
    closeLabel,
    menuLabel,
    menuBadgeLabel,
    user,
    userMenu,
    brandHref,
    saturated,
    children,
}: {
    primary: ShellNavItem[]
    sidebar: ShellNavItem[]
    updates: ShellNavItem
    /** Ενημερώσεις + Σύμβουλος — the phone reaches these only through the
     *  header menu; the rail and sidebar have their own room for them. Omit it
     *  and no menu is offered: the header keeps the brand mark. */
    secondary?: ShellNavItem[]
    add: ShellNavItem
    badge: number
    labels: ShellLabels
    /** Sheet dismissal label for the header menu. */
    closeLabel?: string
    /** Accessible name of the menu landmark — never labels.primary. */
    menuLabel?: string
    /** The trigger's accessible name, already pluralised with the badge count. */
    menuBadgeLabel?: string
    user: ShellUser
    /** The account menu (the original UserMenu) — rendered by the layout so it
     * sits inside the language provider; when absent the plain card renders. */
    userMenu?: ReactNode
    brandHref: string
    saturated: string
    children: ReactNode
}) {
    return (
        <ChromeProvider
            value={
                secondary && secondary.length > 0 && closeLabel && menuLabel
                    ? { secondary, badge, labels, brandHref, saturated, closeLabel, menuLabel, menuBadgeLabel: menuBadgeLabel ?? menuLabel }
                    : null
            }
        >
        <div className="min-h-screen bg-surface-base text-fg-primary [font-size:var(--text-g-app-base)]">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:start-g-4 focus:top-g-4 focus:z-50 focus:rounded-g-control focus:bg-surface-raised focus:px-g-4 focus:py-g-3 focus:text-fg-primary focus:outline focus:outline-[3px] focus:outline-border-focus"
            >
                {labels.skip}
            </a>
            <SideRail primary={primary} updates={updates} add={add} badge={badge} labels={labels} brandHref={brandHref} saturated={saturated} />
            <Sidebar items={sidebar} add={add} badge={badge} labels={labels} user={user} userMenu={userMenu} brandHref={brandHref} saturated={saturated} />
            <main
                id="main-content"
                className="mx-auto w-full max-w-[720px] tablet:ps-g-rail desk:max-w-[calc(760px+var(--spacing-g-sidebar))] desk:has-[[data-wide]]:max-w-[calc(1100px+var(--spacing-g-sidebar))] desk:ps-g-sidebar"
                style={{ paddingBottom: "calc(var(--spacing-g-tabbar) + env(safe-area-inset-bottom) + var(--spacing-g-6))" }}
            >
                <div className="min-h-screen pb-g-8 tablet:px-g-6 desk:px-g-8">{children}</div>
                <Fab add={add} />
            </main>
            <TabBar items={primary} label={labels.primary} />
        </div>
        </ChromeProvider>
    )
}
