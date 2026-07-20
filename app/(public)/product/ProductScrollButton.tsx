"use client"

import React from "react"

/**
 * The only interactive part of the product page's static sections: scrolls to
 * a section and moves focus onto its heading. Targets are addressed by DOM id
 * rather than a ref so the headings themselves can stay server-rendered.
 */
export function ProductScrollButton({
    targetId,
    headingId,
    className,
    children,
}: {
    targetId: string
    headingId: string
    className?: string
    children: React.ReactNode
}) {
    const onClick = () => {
        const section = document.getElementById(targetId)
        if (!section) return

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        section.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start",
        })

        window.setTimeout(
            () => {
                const heading = document.getElementById(headingId)
                heading?.focus({ preventScroll: true })
            },
            prefersReducedMotion ? 0 : 450
        )
    }

    return (
        <button type="button" aria-controls={targetId} onClick={onClick} className={className}>
            {children}
        </button>
    )
}
