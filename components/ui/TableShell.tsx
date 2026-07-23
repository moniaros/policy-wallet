"use client"

import type { ReactNode } from "react"

interface TableShellProps {
    /** Names the scrollable region for screen readers, e.g. "Renewals". */
    label: string
    children: ReactNode
    className?: string
}

/**
 * Scroll container for wide tables.
 *
 * The app has 36 `overflow-x-auto` wrappers and **none** of them was focusable.
 * A container that scrolls but cannot receive focus is unreachable by keyboard:
 * there is no way to see the columns past the viewport edge without a pointer
 * (WCAG 2.1.1). Making the region focusable and naming it fixes that for every
 * adopter, and gives screen-reader users a landmark they can jump to.
 *
 * This deliberately does NOT attempt a card fallback. Choosing which columns
 * survive on a phone is a per-table product decision, not something a generic
 * wrapper can infer — that work is tracked separately in the audit map.
 */
export function TableShell({ label, children, className = "" }: TableShellProps) {
    return (
        <div
            role="region"
            aria-label={label}
            tabIndex={0}
            className={`overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl ${className}`}
        >
            {children}
        </div>
    )
}
