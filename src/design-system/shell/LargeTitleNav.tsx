"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BrandMark } from "./BrandMark"
import { ChevronLeft } from "./icons"
import { MobileMenu } from "./MobileMenu"
import { useChrome } from "./chrome-context"

/**
 * The iOS large title (§5.2). On the phone: a translucent bar carrying the menu
 * trigger (or, on a sub-screen, a back control in its place) and a centred
 * small title that fades in as the large title scrolls under it. From tablet
 * up the bar disappears and the title is simply the page's H1 — the rail or
 * sidebar carries the brand. The page has exactly ONE <h1>: this one.
 *
 * Inside the Grafí shell the leading slot holds the MENU, because a mark that
 * links to the screen you are already on was the least useful control on the
 * phone, while Ενημερώσεις and Σύμβουλος had no route at all below 768px. The
 * brand moved inside the menu sheet, where it still links home. Outside the
 * shell (welcome, adviser help) there is no chrome context and the brand mark
 * remains the leading control — those screens have no menu to open.
 */
export function LargeTitleNav({
    title,
    back,
    trailing,
    brand,
    subtitle,
}: {
    title: string
    /** Sub-screens: the back control replaces the brand mark on the phone. */
    back?: { href: string; label: string }
    /** Right-hand control on the phone bar (the bell, an action). */
    trailing?: ReactNode
    brand: { href: string; label: string }
    subtitle?: string
}) {
    const chrome = useChrome()
    const [collapsed, setCollapsed] = useState(false)
    useEffect(() => {
        const onScroll = () => setCollapsed(window.scrollY > 44)
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <>
            <header className="g-chrome sticky top-0 z-30 border-b border-border-hair tablet:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
                <div className="grid h-g-bar grid-cols-[minmax(44px,1fr)_auto_minmax(44px,1fr)] items-center px-g-2">
                    {back ? (
                        <Link
                            href={back.href}
                            className="g-row-press flex min-h-11 w-fit items-center gap-g-1 rounded-g-control pe-g-3 ps-g-1 text-g-app-body text-fg-brand focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus"
                        >
                            <ChevronLeft className="size-6" aria-hidden />
                            <span>{back.label}</span>
                        </Link>
                    ) : chrome ? (
                        <MobileMenu />
                    ) : (
                        <Link
                            href={brand.href}
                            aria-label={brand.label}
                            className="grid size-11 place-items-center rounded-g-control text-fg-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus"
                        >
                            <BrandMark className="size-7" />
                        </Link>
                    )}
                    <span
                        aria-hidden
                        className={cn(
                            "truncate text-center text-g-heading transition-opacity duration-[var(--dur-fast)] ease-g-out",
                            collapsed ? "opacity-100" : "opacity-0"
                        )}
                    >
                        {title}
                    </span>
                    <div className="flex justify-end">{trailing}</div>
                </div>
            </header>
            <div className="px-g-4 pt-g-3 tablet:px-0 tablet:pt-g-2">
                <h1 className="font-display text-g-title-lg text-fg-primary">{title}</h1>
                {subtitle && <p className="mt-g-1 text-g-app-body text-fg-secondary">{subtitle}</p>}
            </div>
        </>
    )
}
