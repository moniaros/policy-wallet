"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Sheet } from "../sheet"
import { BrandMark } from "./BrandMark"
import { CountBadge } from "./Badge"
import { NAV_ICONS } from "./icons"
import { useChrome } from "./chrome-context"

/**
 * The phone's menu — the wireframe's leading hamburger, doing real work.
 *
 * Ενημερώσεις and Σύμβουλος are `SECONDARY_NAV`: they live on the rail (768+)
 * and the sidebar (1100+), and the five-slot tab bar has no room for them. On a
 * phone that meant there was no route to either at all — a genuine hole this
 * closes.
 *
 * Deliberately NOT here:
 *   - add-policy. The FAB already owns it on the phone, and the shell guard
 *     asserts exactly three links named `nav.add` (FAB, rail, sidebar).
 *   - the five primary destinations. They are one tap away in the tab bar;
 *     repeating them would answer a question the user has already been given.
 *
 * The landmark is named `menuLabel`, never `labels.primary` — the shell guard
 * asserts exactly three navigations carry that name.
 */
export function MobileMenu() {
    const chrome = useChrome()
    const [open, setOpen] = useState(false)
    if (!chrome) return null

    const { secondary, badge, labels, brandHref, saturated, closeLabel, menuLabel, menuBadgeLabel } = chrome

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={menuBadgeLabel}
                aria-haspopup="dialog"
                aria-expanded={open}
                className="g-row-press relative grid size-11 place-items-center rounded-g-control bg-surface-sunken text-fg-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus"
            >
                <Menu className="size-6" aria-hidden />
                {/* The badge rides the trigger too: the reason to open the menu
                    should be visible without opening it. CountBadge positions
                    itself against this relative button — wrapping it in another
                    absolute box pushed it out through the top of the bar. */}
                <CountBadge count={badge} saturated={saturated} />
            </button>

            <Sheet open={open} onClose={() => setOpen(false)} title={menuLabel} closeLabel={closeLabel}>
                <div className="px-g-4 pb-g-4">
                    <Link
                        href={brandHref}
                        aria-label={labels.brand}
                        onClick={() => setOpen(false)}
                        className="mb-g-3 grid size-11 place-items-center rounded-g-control text-fg-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus"
                    >
                        <BrandMark className="size-7" />
                    </Link>
                    <nav aria-label={menuLabel}>
                        <ul className="overflow-hidden rounded-g-card border border-border-hair bg-surface-raised [&>li+li]:border-t [&>li+li]:border-border-hair [&>li+li]:[border-top-width:0.5px]">
                            {secondary.map((e) => {
                                const Icon = NAV_ICONS[e.icon]
                                const isUpdates = e.icon === "bell"
                                return (
                                    <li key={e.id}>
                                        <Link
                                            href={e.href}
                                            aria-label={isUpdates && badge > 0 ? labels.updates : undefined}
                                            onClick={() => setOpen(false)}
                                            className="g-row-press flex min-h-14 w-full items-center gap-g-3 px-g-4 py-g-3 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus"
                                        >
                                            <span className="relative grid size-10 shrink-0 place-items-center rounded-g-control bg-surface-sunken text-fg-secondary">
                                                <Icon className="size-5" aria-hidden />
                                                {isUpdates && <CountBadge count={badge} saturated={saturated} />}
                                            </span>
                                            <span className="min-w-0 flex-1 text-g-row text-fg-primary">{e.label}</span>
                                            <span aria-hidden className="text-fg-faint">
                                                ›
                                            </span>
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </nav>
                </div>
            </Sheet>
        </>
    )
}
