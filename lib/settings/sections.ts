/**
 * The settings map — one array, so the rail, the mobile index and the tests
 * cannot disagree about which sections exist.
 *
 * Settings used to be three tabs inside `/account` with the panel choice held in
 * React state, which meant a section could not be linked to, could not have its
 * own loading boundary, and loaded every other section's data on arrival. Each
 * entry here is a real route.
 *
 * `requiresRole` is the only conditional: an advisor's agency profile is a
 * settings section for them and does not exist for a policyholder. Everything
 * else is shown to everyone, because hiding a control the user has is worse than
 * showing one that says why it is unavailable.
 */

export type SettingsSectionId =
    | "profile"
    | "plan"
    | "security"
    | "notifications"
    | "privacy"
    | "history"
    | "agency"

export interface SettingsSectionDef {
    id: SettingsSectionId
    href: string
    /** Key under `t.settings.nav` — label + description live in the dictionary. */
    labelKey: SettingsSectionId
    /** Only rendered for users holding this role. */
    requiresRole?: "agent"
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
    { id: "profile", href: "/account/profile", labelKey: "profile" },
    { id: "plan", href: "/account/plan", labelKey: "plan" },
    { id: "security", href: "/account/security", labelKey: "security" },
    { id: "notifications", href: "/account/notifications", labelKey: "notifications" },
    { id: "privacy", href: "/account/privacy", labelKey: "privacy" },
    // The relocated timeline (V2-P2-02, ledger T-01): activity history is a
    // thing you consult about your account, not a destination — it lives here
    // rather than holding a menu slot.
    { id: "history", href: "/account/history", labelKey: "history" },
    // Lives on its own route because the agent shell links straight to it and
    // the onboarding checklist deep-links two of its fields.
    { id: "agency", href: "/agent/settings", labelKey: "agency", requiresRole: "agent" },
]

/** The sections a user with these roles can actually reach. */
export function settingsSectionsFor(roles: string): SettingsSectionDef[] {
    const isAgent = roles.includes("agent")
    return SETTINGS_SECTIONS.filter((s) => !s.requiresRole || (s.requiresRole === "agent" && isAgent))
}

/**
 * `/account` is the settings index. On a wide screen it renders Profile rather
 * than a menu that duplicates the rail beside it, so both paths mark Profile
 * active.
 */
export function activeSectionFor(pathname: string): SettingsSectionId | null {
    if (pathname === "/account" || pathname === "/account/") return "profile"
    const match = SETTINGS_SECTIONS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`))
    return match?.id ?? null
}

/**
 * Where the old in-page tabs pointed. Every email footer ships
 * `/account?tab=settings` meaning "manage your notification preferences", and
 * those links live in inboxes for years.
 */
export const LEGACY_TAB_REDIRECTS: Record<string, string> = {
    settings: "/account/notifications",
    billing: "/account/plan",
    overview: "/account",
    referrals: "/account/plan",
}
