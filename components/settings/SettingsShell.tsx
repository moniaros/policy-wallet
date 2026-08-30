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
 * The frame every settings route renders inside — Grafí tokens on GrafiShell's
 * own ground, container and tab-bar clearance included, so this adds no page
 * shell of its own (the old pw-page-shell here doubled both).
 *
 * ONE header at every width: on a sub-page the section name is the h1 (you
 * arrived by drilling in, so the section is the page) with a back link below
 * the desk breakpoint; on the index the page title is. Desktop (≥1100) adds
 * the rail beside the content — the index's own list stays for narrower
 * widths, so neither duplicates the other.
 */
export function SettingsShell({ roles, hasLiveOffers, children }: SettingsShellProps) {
    const { t } = useLanguage()
    const pathname = usePathname()
    const active = activeSectionFor(pathname)
    const isIndex = pathname === "/me" || pathname === "/me/"
    const copy = t.settings.nav

    return (
        <div className="pt-g-2">
            <header className="mb-g-4 px-g-4 tablet:px-0">
                {!isIndex && (
                    <Link
                        href="/me"
                        className="-ml-1 mb-g-1 inline-flex min-h-11 items-center gap-1 pr-g-2 text-g-app-body-sm font-semibold text-fg-brand hover:underline desk:hidden"
                    >
                        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                        {t.settings.pageTitle}
                    </Link>
                )}
                <h1 className="text-g-title text-fg-primary">
                    {isIndex || !active ? t.settings.pageTitle : copy[active].label}
                </h1>
                <p className="mt-1 text-g-app-body-sm leading-relaxed text-fg-secondary">
                    {isIndex || !active ? t.settings.pageSubtitle : copy[active].description}
                </p>
            </header>

            <div className="desk:grid desk:grid-cols-[250px_minmax(0,1fr)] desk:gap-g-6">
                <div className="hidden desk:block">
                    <SettingsNav roles={roles} hasLiveOffers={hasLiveOffers} variant="rail" />
                </div>
                <div className="min-w-0 space-y-g-4">{children}</div>
            </div>
        </div>
    )
}
