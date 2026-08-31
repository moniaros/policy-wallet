"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { LocaleToggle } from "@/components/ui/LocaleToggle"
import { DesktopOnly } from "@/components/auth/DesktopOnly"
import { localizeHref } from "@/lib/seo/locale-links"
import { useLanguage } from "@/contexts/LanguageContext"

/**
 * The one auth shell (brief §2.1) — every auth screen renders inside it, so
 * the per-page card/font/header drift the audit found (§9) cannot recur.
 *
 *  - <1024px: the form only. Full-bleed, 16px gutters, no card chrome; a light
 *    sticky header with logo, back link and language switch; safe-area padding.
 *  - ≥1024px: two columns. Left (60%, then 55% from 1280) carries the form in
 *    a 400px column, vertically centred, logo top-left. Right (brand fill) is
 *    the trust panel — its CONTENT is omitted from the tree below 1024
 *    (DesktopOnly), while the column itself is plain CSS so desktop first
 *    paint shows the fill with no shift.
 *
 * The panel is decorative-plus-informational: never required to complete
 * signup, never a second H1 (pages own their single H1), never a form field.
 */
export function AuthShell({
    panel,
    children,
}: {
    /** Right-column content (a TrustPanel); omit for utility screens. */
    panel?: ReactNode
    children: ReactNode
}) {
    const { language } = useLanguage()
    const locale: "el" | "en" = language === "en" ? "en" : "el"
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    return (
        <div className="pw-clear-consent min-h-dvh bg-surface-base text-fg-primary lg:grid lg:grid-cols-[60fr_40fr] xl:grid-cols-[55fr_45fr]">
            <div className="flex min-h-dvh flex-col">
                <header className="sticky top-0 z-10 flex items-center justify-between gap-g-4 border-b border-border-subtle bg-surface-base/90 px-4 py-g-3 backdrop-blur lg:static lg:border-b-0 lg:bg-transparent lg:px-g-10 lg:py-g-6 lg:backdrop-blur-none">
                    <PolicyWalletLogo size="md" language={locale} />
                    <div className="flex items-center gap-g-4">
                        <Link
                            href={localizeHref("/", locale)}
                            className="inline-flex min-h-11 items-center gap-g-1 text-g-body-sm font-medium text-fg-secondary hover:text-fg-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                        >
                            <span aria-hidden="true">←</span> {t("Αρχική", "Home")}
                        </Link>
                        <LocaleToggle variant="plain" ariaLabel={t("Αλλαγή γλώσσας", "Change language")} />
                    </div>
                </header>
                <main className="flex flex-1 justify-center px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-g-6 lg:items-center lg:px-g-10 lg:pt-g-4">
                    <div className="w-full max-w-[400px]">{children}</div>
                </main>
            </div>
            {panel && (
                <aside
                    aria-label={t("Τι κάνει το PolicyWallet", "What PolicyWallet does")}
                    className="hidden bg-action-primary-bg lg:flex lg:min-h-dvh lg:items-center lg:justify-center lg:p-g-10"
                >
                    <DesktopOnly>{panel}</DesktopOnly>
                </aside>
            )}
        </div>
    )
}
