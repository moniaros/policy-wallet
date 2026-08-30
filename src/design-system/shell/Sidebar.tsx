"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { isNavActive } from "@/lib/app/navigation"
import { BrandMark } from "./BrandMark"
import { CountBadge } from "./Badge"
import { NAV_ICONS } from "./icons"
import type { ShellLabels, ShellNavItem, ShellUser } from "./types"

/** The desktop sidebar (§5.2, ≥ 1100px): 248px, labelled, the user card and add-policy. */
export function Sidebar({
    items,
    add,
    badge,
    labels,
    user,
    brandHref,
    saturated,
}: {
    /** SIDEBAR_NAV order: the five, then Ενημερώσεις, then Σύμβουλος. */
    items: ShellNavItem[]
    add: ShellNavItem
    badge: number
    labels: ShellLabels
    user: ShellUser
    brandHref: string
    saturated: string
}) {
    const pathname = usePathname() ?? "/"
    return (
        <nav aria-label={labels.primary} className="fixed inset-y-0 start-0 z-30 hidden w-g-sidebar flex-col border-e border-border-hair bg-surface-raised desk:flex">
            <Link href={brandHref} aria-label={labels.brand} className="mx-g-3 mt-g-4 flex min-h-11 items-center gap-g-2 rounded-g-control px-g-2 text-fg-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus">
                <BrandMark className="size-7" />
                <span className="font-display text-g-heading tracking-tight">
                    Policy<span className="text-fg-brand">Wallet</span>
                </span>
            </Link>
            <ul className="mt-g-6 flex flex-col gap-g-1 px-g-3">
                {items.map((entry) => {
                    const Icon = NAV_ICONS[entry.icon]
                    const active = isNavActive(pathname, entry)
                    const name = entry.id === "updates" ? labels.updates : entry.label
                    return (
                        <li key={entry.id}>
                            <Link
                                href={entry.href}
                                aria-label={entry.id === "updates" ? name : undefined}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "g-nav-item g-row-press relative flex min-h-11 items-center gap-g-3 rounded-g-control px-g-3 text-g-app-body font-medium",
                                    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus",
                                    active ? "bg-surface-sunken text-fg-brand" : "text-fg-secondary"
                                )}
                            >
                                <span className="relative">
                                    <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                                    {entry.id === "updates" && <CountBadge count={badge} saturated={saturated} />}
                                </span>
                                <span>{entry.label}</span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
            <div className="mt-auto flex flex-col gap-g-3 p-g-3">
                <Link
                    href={add.href}
                    className="g-row-press flex min-h-11 items-center justify-center gap-g-2 rounded-g-pill bg-action-primary-bg px-g-4 text-g-app-body font-semibold text-fg-on-brand hover:bg-action-primary-hover focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                >
                    <NAV_ICONS.plus className="size-5" strokeWidth={2.4} aria-hidden />
                    <span>{add.label}</span>
                </Link>
                <Link
                    href={user.href}
                    className="g-nav-item flex min-h-14 items-center gap-g-3 rounded-g-card border border-border-hair px-g-3 py-g-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus"
                >
                    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-g-pill bg-surface-sunken font-display text-g-heading text-fg-brand">
                        {user.name.trim().charAt(0).toUpperCase() || "•"}
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-g-app-body font-semibold text-fg-primary">{user.name}</span>
                        <span className="block truncate text-g-app-caption text-fg-faint">{user.planLine}</span>
                    </span>
                    <span className="sr-only">{labels.yourAccount}</span>
                </Link>
            </div>
        </nav>
    )
}
