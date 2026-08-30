"use client"

import { useId, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The tooltip (§5.3) — desktop only. It appears on hover AND keyboard focus,
 * is wired with aria-describedby, and is hidden entirely below the fine-pointer
 * media query (touch has no hover; the content must exist elsewhere on touch).
 */
export function Tooltip({ text, children, className }: { text: string; children: ReactNode; className?: string }) {
    const id = useId()
    const [shown, setShown] = useState(false)
    return (
        <span
            className={cn("relative inline-flex", className)}
            onMouseEnter={() => setShown(true)}
            onMouseLeave={() => setShown(false)}
            onFocusCapture={() => setShown(true)}
            onBlurCapture={() => setShown(false)}
        >
            <span aria-describedby={id} className="contents">{children}</span>
            <span
                role="tooltip"
                id={id}
                className={cn(
                    "pointer-events-none absolute bottom-full left-1/2 z-40 mb-g-2 hidden w-max max-w-[24ch] -translate-x-1/2 rounded-g-control bg-surface-inverse px-g-3 py-g-2 text-g-app-caption text-fg-on-brand shadow-g-overlay",
                    "[@media(hover:hover)_and_(pointer:fine)]:block",
                    shown ? "opacity-100" : "opacity-0"
                )}
            >
                {text}
            </span>
        </span>
    )
}
