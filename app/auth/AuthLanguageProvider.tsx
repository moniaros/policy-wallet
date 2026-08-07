"use client"

import { Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"

/**
 * Pins the auth tree to the language the visitor was already reading.
 *
 * The auth pages sit outside both locale trees: there is no /en/auth mirror,
 * and the /en marketing pages get their locale from StaticLanguageProvider,
 * which is scoped to that subtree. So an English visitor clicking the hero CTA
 * fell through to the GLOBAL provider, whose default is Greek, and met an
 * account-creation form in a language they had not chosen — at the highest-
 * intent moment on the page. `?lang=en` (emitted by `authHref`) carries it.
 *
 * Why not persist the language instead: the global provider stamps <html lang>
 * and feeds every useLanguage() consumer, and the GREEK tree has no
 * StaticLanguageProvider of its own — it relies on that default. Writing "en"
 * into shared state would therefore turn Greek marketing pages English on the
 * next visit. The URL is the only signal that stays where it is put.
 */
function AuthLanguagePin({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const requested = useSearchParams().get("lang")
    const language = requested === "en" ? "en" : "el"

    // Switching language stays on this page rather than leaving the flow —
    // the counterpart is the same route with the other marker.
    const counterpart = `${pathname}${language === "en" ? "" : "?lang=en"}`

    return (
        <StaticLanguageProvider language={language} counterpartPath={counterpart}>
            {children}
        </StaticLanguageProvider>
    )
}

export function AuthLanguageProvider({ children }: { children: React.ReactNode }) {
    // useSearchParams() opts a route out of static rendering unless it sits
    // under a boundary; the fallback renders the same tree in the Greek
    // default, which is what these pages did before.
    return (
        <Suspense fallback={<>{children}</>}>
            <AuthLanguagePin>{children}</AuthLanguagePin>
        </Suspense>
    )
}
