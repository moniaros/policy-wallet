"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Building2, ChevronRight, CreditCard, Gift, History, Lock, ShieldCheck, User, type LucideIcon } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { activeSectionFor, settingsSectionsFor, type SettingsSectionId } from "@/lib/settings/sections"

const ICONS: Record<SettingsSectionId, LucideIcon> = {
    profile: User,
    plan: CreditCard,
    security: ShieldCheck,
    notifications: Bell,
    privacy: Lock,
    history: History,
    benefits: Gift,
    agency: Building2,
}

interface SettingsNavProps {
    /** Comma-separated `User.roles`. */
    roles: string
    /**
     * Whether ≥1 partner offer is live — decides the benefits entry (§4.2:
     * it lives here, not as a tab). Resolved server-side by the caller.
     */
    hasLiveOffers: boolean
    /**
     * "rail" is the desktop sidebar; "index" is the mobile landing list. Same
     * array, same labels, two presentations — chosen in CSS by the caller, never
     * by measuring the viewport in JS.
     */
    variant: "rail" | "index"
}

export function SettingsNav({ roles, hasLiveOffers, variant }: SettingsNavProps) {
    const { t } = useLanguage()
    const pathname = usePathname()
    const active = activeSectionFor(pathname)
    const sections = settingsSectionsFor(roles, { hasLiveOffers })
    const copy = t.settings.nav

    if (variant === "index") {
        return (
            <nav aria-label={t.settings.pageTitle}>
                <ul className="pw-card divide-y divide-border">
                    {sections.map((section) => {
                        const Icon = ICONS[section.id]
                        return (
                            <li key={section.id}>
                                <Link
                                    href={section.href}
                                    className="flex min-h-11 items-center gap-3 px-4 py-3.5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="pw-card-chip"
                                    >
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-foreground">
                                            {copy[section.labelKey].label}
                                        </span>
                                        <span className="mt-0.5 block text-caption leading-snug text-muted-foreground">
                                            {copy[section.labelKey].description}
                                        </span>
                                    </span>
                                    <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        )
    }

    return (
        <nav aria-label={t.settings.pageTitle} className="sticky top-6 self-start">
            <ul className="space-y-0.5">
                {sections.map((section) => {
                    const Icon = ICONS[section.id]
                    const isActive = active === section.id
                    return (
                        <li key={section.id}>
                            {/* Active state is a left bar + a weight change + aria-current,
                                never colour on its own. */}
                            <Link
                                href={section.href}
                                aria-current={isActive ? "page" : undefined}
                                className={`relative flex min-h-11 items-start gap-3 rounded-xl py-2.5 pl-4 pr-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    isActive
                                        ? "bg-primary/8 dark:bg-primary/15"
                                        : "hover:bg-muted"
                                }`}
                            >
                                {isActive && (
                                    <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-primary" />
                                )}
                                <Icon
                                    aria-hidden="true"
                                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                                        isActive ? "text-primary dark:text-mint" : "text-muted-foreground"
                                    }`}
                                />
                                <span className="min-w-0">
                                    <span
                                        className={`block text-sm ${
                                            isActive
                                                ? "font-semibold text-foreground"
                                                : "font-medium text-foreground/80"
                                        }`}
                                    >
                                        {copy[section.labelKey].label}
                                    </span>
                                    <span className="mt-0.5 block text-caption leading-snug text-muted-foreground">
                                        {copy[section.labelKey].description}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
