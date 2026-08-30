/**
 * The application's navigation — ONE registry (§7).
 *
 * Five tabs on the phone, the same five on the rail and the sidebar, plus the
 * two the sidebar adds (Ενημερώσεις, Σύμβουλος) and the add-policy action.
 * Icons are NAMES here so this module stays pure; the shell maps them.
 *
 * `href` is where the tab goes TODAY. Each screen's rebuild goal flips it to
 * `successor` when the new route lands (G7 `/`, G8 `/see` + `/policies`,
 * G9 `/updates`, G10 `/adviser`, G11 `/me`, G12 `/add`) — the dead-link guard
 * resolves every href against the filesystem, so a tab never points at a
 * route that does not exist yet. `aliases` keep the active state honest while
 * a legacy path serves the screen.
 */
export type NavIcon = "shield" | "eye" | "folder" | "coins" | "user" | "bell" | "users" | "plus"

export interface NavEntry {
    id: "protection" | "see" | "policies" | "money" | "me" | "updates" | "adviser" | "add"
    /** Key under `t.app.nav`. */
    labelKey: "protection" | "see" | "policies" | "money" | "me" | "updates" | "adviser" | "add"
    href: string
    /** Where this entry moves when its rebuilt route lands. */
    successor: string
    /** Paths that count as "here" (legacy routes still serving the screen). */
    aliases: readonly string[]
    icon: NavIcon
}

export const PRIMARY_NAV: readonly NavEntry[] = [
    { id: "protection", labelKey: "protection", href: "/dashboard", successor: "/", aliases: ["/", "/home"], icon: "shield" },
    { id: "see", labelKey: "see", href: "/protection", successor: "/see", aliases: ["/see"], icon: "eye" },
    { id: "policies", labelKey: "policies", href: "/wallet", successor: "/policies", aliases: ["/policies"], icon: "folder" },
    { id: "money", labelKey: "money", href: "/money", successor: "/money", aliases: [], icon: "coins" },
    { id: "me", labelKey: "me", href: "/account", successor: "/me", aliases: ["/me"], icon: "user" },
] as const

export const SECONDARY_NAV: readonly NavEntry[] = [
    { id: "updates", labelKey: "updates", href: "/notifications", successor: "/updates", aliases: ["/updates"], icon: "bell" },
    { id: "adviser", labelKey: "adviser", href: "/agent", successor: "/adviser", aliases: ["/adviser"], icon: "users" },
] as const

export const ADD_POLICY: NavEntry = { id: "add", labelKey: "add", href: "/wallet/add", successor: "/add", aliases: ["/add"], icon: "plus" }

/** The desktop sidebar order (§7): the five, then Ενημερώσεις, then Σύμβουλος. */
export const SIDEBAR_NAV: readonly NavEntry[] = [...PRIMARY_NAV.slice(0, 4), SECONDARY_NAV[0], SECONDARY_NAV[1], PRIMARY_NAV[4]]

function startsWithPath(pathname: string, base: string): boolean {
    if (base === "/") return pathname === "/"
    return pathname === base || pathname.startsWith(`${base}/`)
}

/** Whether `pathname` belongs to an entry — its href, its successor, or an alias. */
export function isNavActive(pathname: string, entry: NavEntry): boolean {
    const bases = [entry.href, entry.successor, ...entry.aliases]
    // `/agent/settings` and `/agent/pricing` are the adviser's own tools, not the customer's adviser view.
    if (entry.id === "adviser" && /^\/agent\/(settings|pricing)/.test(pathname)) return false
    return bases.some((b) => startsWithPath(pathname, b))
}

/** The one active primary tab for a path, or null (a sub-screen outside the five). */
export function activePrimary(pathname: string): NavEntry["id"] | null {
    const hit = PRIMARY_NAV.find((e) => isNavActive(pathname, e))
    return hit?.id ?? null
}
