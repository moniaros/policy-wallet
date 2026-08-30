"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Building2, CreditCard, Gift, History, Lock, Palette, ShieldCheck, User, Users, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { GroupedList, Row } from "@/src/design-system/app-layout"
import { activeSectionFor, settingsSectionsFor, type SettingsSectionId } from "@/lib/settings/sections"

const ICONS: Record<SettingsSectionId, LucideIcon> = {
    profile: User,
    household: Users,
    appearance: Palette,
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
    // The registry maps the index to "profile" (its historic desktop content);
    // the rail must not claim a section is current when you are on the index.
    const isIndex = pathname === "/me" || pathname === "/me/"
    const active = isIndex ? null : activeSectionFor(pathname)
    const sections = settingsSectionsFor(roles, { hasLiveOffers })
    const copy = t.settings.nav

    if (variant === "index") {
        return (
            <nav aria-label={t.settings.pageTitle}>
                <GroupedList>
                    {sections.map((section) => {
                        const Icon = ICONS[section.id]
                        return (
                            <Row
                                key={section.id}
                                href={section.href}
                                icon={<Icon className="h-4 w-4" />}
                                primary={copy[section.labelKey].label}
                                secondary={copy[section.labelKey].description}
                            />
                        )
                    })}
                </GroupedList>
            </nav>
        )
    }

    return (
        <nav aria-label={t.settings.pageTitle} className="sticky top-g-4 self-start">
            <ul className="space-y-1">
                {sections.map((section) => {
                    const Icon = ICONS[section.id]
                    const isActive = active === section.id
                    return (
                        <li key={section.id}>
                            {/* Active state is a raised pill + a weight change + aria-current,
                                never colour on its own. */}
                            <Link
                                href={section.href}
                                aria-current={isActive ? "page" : undefined}
                                className={cn(
                                    "flex min-h-11 items-start gap-g-3 rounded-g-control px-g-3 py-g-2 transition-colors duration-200 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus",
                                    isActive ? "bg-surface-raised shadow-g-raised" : "hover:bg-surface-sunken"
                                )}
                            >
                                <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", isActive ? "text-fg-brand" : "text-fg-secondary")} />
                                <span className="min-w-0">
                                    <span className={cn("block text-g-app-body-sm text-fg-primary", isActive ? "font-semibold" : "font-medium")}>
                                        {copy[section.labelKey].label}
                                    </span>
                                    <span className="mt-0.5 block text-g-app-caption leading-snug text-fg-secondary">
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
