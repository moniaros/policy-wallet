"use client"

import { useSyncExternalStore, type ReactNode } from "react"

/**
 * Renders children only when the viewport is ≥1024px — by OMITTING them from
 * the tree, not hiding them with CSS (brief §2.1: below 1024 the trust panel
 * "is not rendered at all … so nothing loads"). The server snapshot is false,
 * so a phone never receives the subtree; on desktop it mounts at hydration
 * inside the already-painted brand column, so nothing shifts.
 */
const QUERY = "(min-width: 1024px)"

function subscribe(onChange: () => void): () => void {
    const mql = window.matchMedia(QUERY)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
}

export function DesktopOnly({ children }: { children: ReactNode }) {
    const isDesktop = useSyncExternalStore(
        subscribe,
        () => window.matchMedia(QUERY).matches,
        () => false,
    )
    return isDesktop ? <>{children}</> : null
}
