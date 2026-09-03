"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { SettingsNav } from "./SettingsNav"
import { activeSectionFor } from "@/lib/settings/sections"

interface SettingsShellProps {
    /** Comma-separated `User.roles` — decides whether the agency section shows. */
    roles: string
    /** Whether ≥1 partner offer is live — decides the benefits entry. */
    hasLiveOffers: boolean
    children: ReactNode
}

/**
 * The frame every settings route renders inside.
 *
 * Layout follows the dashboard rebuild (`PolicyholderHome`) rather than the
 * shared `PageHeader`: that header is `sticky top-0 z-40` and the app shell
 * already pins its own mobile header there, so using it stacked two sticky bars
 * and ate a third of a phone screen before any content.
 *
 * Mobile and desktop headers are both rendered and toggled in CSS — on a phone
 * the section name is the h1 with a back link above it (you arrived by drilling
 * in, so the section is the page), while on a wide screen "Settings" is the h1
 * and the rail beside it says where you are.
 */
export function SettingsShell({ roles, hasLiveOffers, children }: SettingsShellProps) {
    const { t } = useLanguage()
    const pathname = usePathname()
    const active = activeSectionFor(pathname)
    const isIndex = pathname === "/account" || pathname === "/account/"
    const copy = t.settings.nav

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
                {/* Mobile header */}
                <header className="mb-4 lg:hidden">
                    {!isIndex && (
                        <Link
                            href="/account"
                            className="pw-inline-action -ml-1 mb-2 inline-flex min-h-11 items-center gap-1 pr-2 text-caption font-semibold text-primary hover:underline dark:text-mint"
                        >
                            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                            {t.settings.pageTitle}
                        </Link>
                    )}
                    <h1 className="text-title font-semibold tracking-tight text-foreground">
                        {isIndex || !active ? t.settings.pageTitle : copy[active].label}
                    </h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {isIndex || !active ? t.settings.pageSubtitle : copy[active].description}
                    </p>
                </header>

                {/* Desktop header */}
                <header className="mb-6 hidden lg:block">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">
                        {t.settings.pageTitle}
                    </h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.settings.pageSubtitle}</p>
                </header>

                <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
                    <div className="hidden lg:block">
                        <SettingsNav roles={roles} hasLiveOffers={hasLiveOffers} variant="rail" />
                    </div>
                    <main className="min-w-0 space-y-4">{children}</main>
                </div>
            </div>
        </div>
    )
}
