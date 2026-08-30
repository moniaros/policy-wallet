"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { isNavActive } from "@/lib/app/navigation"
import { NAV_ICONS } from "./icons"
import type { ShellNavItem } from "./types"

/**
 * The phone's five tabs (§5.2, < 768px). Translucent with a solid fallback
 * (`.g-chrome`), safe-area aware, every target ≥ 44pt, the current tab
 * announced with aria-current. Whole tab is the link.
 */
export function TabBar({ items, label }: { items: ShellNavItem[]; label: string }) {
    const pathname = usePathname() ?? "/"
    return (
        <nav aria-label={label} className="g-chrome fixed inset-x-0 bottom-0 z-40 border-t border-border-hair tablet:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <ul className="grid grid-cols-5">
                {items.map((item) => {
                    const Icon = NAV_ICONS[item.icon]
                    const active = isNavActive(pathname, item)
                    return (
                        <li key={item.id}>
                            <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "g-row-press flex min-h-g-tabbar flex-col items-center justify-center gap-0.5 px-g-1 text-g-app-label font-medium",
                                    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus",
                                    active ? "text-fg-brand" : "text-fg-secondary"
                                )}
                            >
                                <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
