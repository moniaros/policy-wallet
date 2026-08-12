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

import { PRIMARY_ACTION_SHORT } from "@/lib/marketing/positioning"

export type NavLabel = { el: string; en: string }

export type PublicNavItem =
    | { key: string; kind: "link"; href: string; label: NavLabel }
    /** Rendered via SolutionsDropdown (desktop) / SolutionsMobileGroup (mobile). */
    | { key: "products"; kind: "dropdown"; label: NavLabel }

export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
    // Was a standalone "Προϊόντα" link beside a "Λύσεις" dropdown whose first
    // item pointed at the SAME page — two nav entries, one destination. The
    // dropdown absorbed the link and took its name: what the site sells is
    // branches of insurance, so "Προϊόντα" is what a visitor is looking for.
    { key: "products", kind: "dropdown", label: { el: "Προϊόντα", en: "Products" } },
    // A tool, not a page. Every other entry here explains PolicyWallet; this
    // one does something for the visitor before they have decided anything,
    // which is why it sits in the primary nav rather than the footer.
    { key: "needs", kind: "link", href: "/needs", label: { el: "Έλεγχος αναγκών", en: "Needs check" } },
    { key: "guides", kind: "link", href: "/guides", label: { el: "Οδηγοί", en: "Guides" } },
    // "Τιμολόγηση" is the accountant's word for it. "Τιμές" is the word a
    // person uses when they want to know what something costs.
    { key: "pricing", kind: "link", href: "/pricing", label: { el: "Τιμές", en: "Pricing" } },
]

/**
 * The one primary CTA used across every public page.
 *
 * Deliberately SHORTER than the in-page CTA, for the measured reason recorded
 * with PRIMARY_ACTION_SHORT: with the full wording here, at 1024px the logo
 * overlapped the first nav item and the button wrapped out of the bar.
 *
 * The wording is no longer written here. Both sanctioned forms of this one
 * action live together in lib/marketing/positioning.ts so they cannot drift
 * apart, which is exactly what happened when this module owned its own copy.
 */
export const PRIMARY_CTA = {
    href: "/auth/signup?role=policyholder",
    label: PRIMARY_ACTION_SHORT satisfies NavLabel,
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
