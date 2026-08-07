"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Corrects <html lang> for the English marketing routes (/en/*).
 *
 * The root layout renders one shared <html lang="el"> shell for every route;
 * reading the pathname server-side (headers()) would force the whole tree
 * dynamic and kill static generation of the marketing pages, so SSR keeps the
 * Greek default and this client leaf stamps lang="en" on /en/* right after
 * hydration (WCAG 3.1.1 — screen readers otherwise voice English text with
 * Greek phonology).
 *
 * It only touches lang when entering or leaving /en/*, so the Language
 * providers (which also manage the attribute when the in-app toggle is used)
 * are never fought on other routes. Rendered LAST in <body> so its mount
 * effect runs after the providers' and wins the initial paint on /en/*.
 */
export function HtmlLang() {
    const pathname = usePathname()

    useEffect(() => {
        const isEnglishRoute = pathname === "/en" || pathname.startsWith("/en/")
        const html = document.documentElement

        // A mounted StaticLanguageProvider owns the attribute — stand down.
        // Rendering last is what makes this leaf win the initial paint on
        // /en/*, and it is also what made it clobber the auth tree: leaving
        // /en for /auth/signup?lang=en, the branch below restored the Greek
        // default over the English the auth provider had just pinned. The
        // bookkeeping still has to run, or the next route would think it was
        // never on an English page.
        if (html.dataset.langOwner === "static") {
            html.dataset.htmlLangEnRoute = String(isEnglishRoute)
            return
        }

        if (isEnglishRoute) {
            html.setAttribute("lang", "en")
            html.setAttribute("data-locale", "en-GB")
        } else if (html.dataset.htmlLangEnRoute === "true") {
            // We set "en" for a previous /en/* route — restore the Greek
            // default instead of leaking English onto Greek pages.
            html.setAttribute("lang", "el")
            html.setAttribute("data-locale", "el-GR")
        }
        html.dataset.htmlLangEnRoute = String(isEnglishRoute)
    }, [pathname])

    return null
}
