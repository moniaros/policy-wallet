/**
 * Canonical public-site navigation — the single source of truth for every
 * public header (desktop + mobile) and the footer's primary columns.
 *
 * Before this module there were three divergent header implementations
 * (LandingHeader, LoBPageShell, the inline PricingPageClient header) with
 * different item sets and order. Any nav change now happens HERE, once.
 *
 * Pure data (no JSX) so it is importable by server components, client
 * components and unit tests alike. Labels are bilingual; order is fixed and
 * meaningful (product → solutions → resources → company → pricing).
 */

export type NavLabel = { el: string; en: string }

export type PublicNavItem =
    | { key: string; kind: "link"; href: string; label: NavLabel }
    /** Rendered via SolutionsDropdown (desktop) / SolutionsMobileGroup (mobile). */
    | { key: "solutions"; kind: "dropdown"; label: NavLabel }

export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
    { key: "product", kind: "link", href: "/product", label: { el: "Προϊόντα", en: "Products" } },
    { key: "solutions", kind: "dropdown", label: { el: "Λύσεις", en: "Solutions" } },
    { key: "guides", kind: "link", href: "/guides", label: { el: "Οδηγοί", en: "Guides" } },
    { key: "company", kind: "link", href: "/company", label: { el: "Εταιρεία", en: "Company" } },
    { key: "pricing", kind: "link", href: "/pricing", label: { el: "Τιμολόγηση", en: "Pricing" } },
]

/** The one primary CTA used across every public page. */
export const PRIMARY_CTA = {
    href: "/auth/signup?role=policyholder",
    label: { el: "Ξεκινήστε", en: "Get started" } satisfies NavLabel,
}

/** The one secondary CTA (log in) used across every public page. */
export const SECONDARY_CTA = {
    href: "/auth/signin",
    label: { el: "Σύνδεση", en: "Log in" } satisfies NavLabel,
}

/** Skip-link target id — the `<main>` on every public page carries this id. */
export const SKIP_LINK_TARGET_ID = "main-content"

/** Link items only (dropdown excluded) — convenience for active-state + tests. */
export function publicNavLinks(): Array<Extract<PublicNavItem, { kind: "link" }>> {
    return PUBLIC_NAV_ITEMS.filter(
        (item): item is Extract<PublicNavItem, { kind: "link" }> => item.kind === "link"
    )
}
