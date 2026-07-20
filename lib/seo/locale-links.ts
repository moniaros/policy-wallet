import { marketingPages } from "@/lib/seo/marketing-pages"

/**
 * Marketing paths with a real English mirror at /en<path> — derived from the
 * registry's `en` fields so this helper can never emit a link to a 404.
 * "/" pairs with "/en" (the English home). Paths WITHOUT a mirror (/privacy
 * and /terms, until real /en routes exist for them) intentionally stay Greek:
 * a Greek page beats a 404.
 */
const EN_MIRRORED_EXACT: ReadonlySet<string> = new Set([
    "/",
    ...Object.values(marketingPages)
        .filter((page) => page.en)
        .map((page) => page.path),
])

/**
 * Mirrored sections whose children are all mirrored too. Guide articles are
 * fully bilingual in lib/guides/content.ts, so once the guides index declares
 * an English variant every /guides/<slug> has a live /en/guides/<slug>.
 */
const EN_MIRRORED_PREFIXES: readonly string[] = marketingPages.guides.en ? ["/guides/"] : []

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
