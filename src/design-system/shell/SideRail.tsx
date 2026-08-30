"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { isNavActive } from "@/lib/app/navigation"
import { BrandMark } from "./BrandMark"
import { CountBadge } from "./Badge"
import { NAV_ICONS } from "./icons"
import type { ShellLabels, ShellNavItem } from "./types"

/** The tablet rail (§5.2, 768–1099px): 76px, icons only, names on the accessible tree and as tooltips. */
export function SideRail({
    primary,
    updates,
    add,
    badge,
    labels,
    brandHref,
    saturated,
}: {
    primary: ShellNavItem[]
    updates: ShellNavItem
    add: ShellNavItem
    badge: number
    labels: ShellLabels
    brandHref: string
    saturated: string
}) {
    const pathname = usePathname() ?? "/"
    const item = (entry: ShellNavItem, name: string, extra?: React.ReactNode) => {
        const Icon = NAV_ICONS[entry.icon]
        const active = isNavActive(pathname, entry)
        return (
            <li key={entry.id}>
                <Link
                    href={entry.href}
                    aria-label={name}
                    title={name}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                        "g-nav-item g-row-press relative grid size-12 place-items-center rounded-g-control",
                        "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus",
                        active ? "bg-surface-sunken text-fg-brand" : "text-fg-secondary"
                    )}
                >
                    <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                    {extra}
                </Link>
            </li>
        )
    }
    return (
        <nav aria-label={labels.primary} className="fixed inset-y-0 start-0 z-30 hidden w-g-rail flex-col items-center gap-g-2 border-e border-border-hair bg-surface-raised py-g-4 tablet:flex desk:hidden">
            <Link href={brandHref} aria-label={labels.brand} className="mb-g-4 grid size-12 place-items-center rounded-g-control text-fg-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus">
                <BrandMark className="size-7" />
            </Link>
            <ul className="flex flex-col gap-g-2">
                {primary.map((e) => item(e, e.label))}
                {item(updates, labels.updates, <CountBadge count={badge} saturated={saturated} />)}
            </ul>
            <Link
                href={add.href}
                aria-label={add.label}
                title={add.label}
                className="mt-auto grid size-12 place-items-center rounded-g-pill bg-action-primary-bg text-fg-on-brand shadow-g-raised focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
            >
                <NAV_ICONS.plus className="size-6" strokeWidth={2.4} aria-hidden />
            </Link>
        </nav>
    )
}
