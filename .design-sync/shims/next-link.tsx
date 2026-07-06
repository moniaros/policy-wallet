// next/link shim for design-sync bundles: outside a Next.js runtime the right
// behavior for Link is a plain anchor. Next-only props are dropped so they
// never land on the DOM element.
import * as React from "react"

type AnyProps = Record<string, unknown>

export default function Link(props: AnyProps) {
    const {
        href,
        prefetch, replace, scroll, shallow, locale, legacyBehavior, passHref, onNavigate,
        children,
        ...rest
    } = props
    void prefetch; void replace; void scroll; void shallow; void locale; void legacyBehavior; void passHref; void onNavigate
    const url = typeof href === "string" ? href : String(href ?? "#")
    return React.createElement("a", { href: url, ...rest }, children as React.ReactNode)
}
