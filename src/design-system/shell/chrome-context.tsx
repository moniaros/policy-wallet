"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { ShellLabels, ShellNavItem } from "./types"

/**
 * What the phone header needs from the shell.
 *
 * The tab bar carries the five primary destinations, but `SECONDARY_NAV`
 * (Ενημερώσεις, Σύμβουλος) lived only on the rail and the sidebar — both
 * `tablet:`/`desk:` only — so on a phone there was no route to either at all.
 * The header menu closes that hole, and it needs the badge count and the
 * resolved labels the server layout already computed for the other two chromes.
 *
 * A context rather than props because the header is rendered by each SCREEN
 * (LargeTitleNav), not by the shell: threading four values through every screen
 * to reach one button would touch a dozen files for nothing.
 *
 * `useChrome()` returns null outside the Grafí shell. LargeTitleNav is also used
 * by screens that render without it (welcome, adviser help), and those must keep
 * working — they simply get no menu.
 */
export interface ChromeValue {
    /** Ενημερώσεις, Σύμβουλος — the destinations the tab bar has no room for. */
    secondary: ShellNavItem[]
    /** Unread protection updates; drives the badge on the bell and the trigger. */
    badge: number
    labels: ShellLabels
    brandHref: string
    /** «9+» — the saturated badge form. */
    saturated: string
    /** Sheet dismissal label, resolved server-side. */
    closeLabel: string
    /** Accessible name of the menu's navigation landmark. NEVER labels.primary:
     *  the shell guard asserts exactly three landmarks carry that name. */
    menuLabel: string
    /** The trigger's accessible name, already pluralised with the badge count —
     *  a badge nobody can hear is not a notification. */
    menuBadgeLabel: string
}

const ChromeContext = createContext<ChromeValue | null>(null)

export function ChromeProvider({ value, children }: { value: ChromeValue | null; children: ReactNode }) {
    return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>
}

export function useChrome(): ChromeValue | null {
    return useContext(ChromeContext)
}
