"use client"

import Link from "next/link"
import Image from "next/image"
import type { ReactNode } from "react"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { LocaleToggle } from "@/components/ui/LocaleToggle"
import { DesktopOnly } from "@/components/auth/DesktopOnly"
import { localizeHref } from "@/lib/seo/locale-links"
import { useLanguage } from "@/contexts/LanguageContext"

/** Shared form-first auth shell. Utility screens use the full width; desktop signup/signin adds a branded photo panel. */
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
        <div className={`pw-auth pw-clear-consent min-h-dvh text-fg-primary ${panel ? "pw-auth-split" : ""}`}>
            <div className="pw-auth-form-column flex min-h-dvh flex-col">
                <header className="pw-auth-header flex items-center justify-between gap-g-4 px-4 py-g-3 lg:px-g-10 lg:py-g-6">
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
                    <div className="pw-auth-form w-full max-w-[440px]">{children}</div>
                </main>
            </div>
            {panel && (
                <aside
                    aria-label={t("Τι κάνει το PolicyWallet", "What PolicyWallet does")}
                    className="pw-auth-aside hidden lg:flex"
                >
                    <div className="pw-auth-photo relative min-h-64 flex-1">
                        <Image src="/images/presentation/policy-review.webp" alt="" fill sizes="45vw" className="object-cover object-[65%_center]" />
                    </div>
                    <div className="pw-auth-panel"><DesktopOnly>{panel}</DesktopOnly></div>
                </aside>
            )}
        </div>
    )
}
