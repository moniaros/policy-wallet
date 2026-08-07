import { marketingPages } from "@/lib/seo/marketing-pages"

/**
 * Marketing paths with a real English mirror at /en<path> — derived from the
 * registry's `en` fields so this helper can never emit a link to a 404.
 * "/" pairs with "/en" (the English home). The full legal set (/privacy,
 * /terms, /cookies, /subprocessors) now has real /en mirrors. Paths WITHOUT a
 * mirror intentionally stay Greek: a Greek page beats a 404.
 */
const EN_MIRRORED_EXACT: ReadonlySet<string> = new Set([
    "/",
    ...Object.values(marketingPages)
        .filter((page) => page.en)
        .map((page) => page.path),
])

/**
 * Mirrored sections whose children are all mirrored too. Guide articles and
 * glossary terms are fully bilingual (lib/guides/content.ts,
 * lib/glossary/content.ts) — every /guides/<slug> and /lexiko/<term> has a live
 * /en/... mirror generated from the same content — so once each index declares
 * an English variant, all its children are safe to prefix with /en.
 */
const EN_MIRRORED_PREFIXES: readonly string[] = [
    ...(marketingPages.guides.en ? ["/guides/"] : []),
    ...(marketingPages.lexiko.en ? ["/lexiko/"] : []),
]

export type MarketingLocale = "el" | "en"

/**
 * Locale-aware href for internal marketing links: prefixes the path with /en
 * when rendering in the English context AND the target has a real English
 * mirror, so EN visitors navigate within the EN tree instead of silently
 * dropping back to Greek. Query strings and fragments are preserved.
 * Everything else (external URLs, in-page anchors, auth/app routes,
 * unmirrored pages) passes through unchanged.
 */
export function localizeHref(href: string, locale: MarketingLocale): string {
    if (locale !== "en") return href
    if (!href.startsWith("/") || href === "/en" || href.startsWith("/en/")) return href

    const splitAt = href.search(/[?#]/)
    const path = splitAt === -1 ? href : href.slice(0, splitAt)
    const suffix = splitAt === -1 ? "" : href.slice(splitAt)

    const hasMirror =
        EN_MIRRORED_EXACT.has(path) ||
        EN_MIRRORED_PREFIXES.some((prefix) => path.startsWith(prefix))
    if (!hasMirror) return href

    return path === "/" ? `/en${suffix}` : `/en${path}${suffix}`
}

/**
 * Locale-aware href for links from the marketing site INTO the auth tree.
 *
 * There is no /en/auth mirror — the auth pages are one tree that renders in
 * whichever language it is told — so `localizeHref` deliberately leaves
 * /auth/* alone. That left a hole: every auth link on the English site dropped
 * the locale, so a visitor reading "We do not sell insurance" in English
 * clicked the hero CTA and landed on an account-creation form entirely in
 * Greek, at the highest-intent moment of the journey. Nothing carried the
 * language across, because the /en tree gets its locale from
 * StaticLanguageProvider, which is scoped to that subtree.
 *
 * `?lang=` is that carrier: app/auth/AuthLanguageProvider reads it and pins the
 * auth tree to the same language. Greek needs no marker — it is the default.
 */
export function authHref(href: string, locale: MarketingLocale): string {
    if (locale !== "en" || !href.startsWith("/auth/")) return href
    return `${href}${href.includes("?") ? "&" : "?"}lang=en`
}
