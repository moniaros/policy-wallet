import Link from "next/link"
import { NAV_ICONS } from "./icons"
import type { ShellNavItem } from "./types"

/** The phone's add-policy action, above the tab bar and the safe area. */
export function Fab({ add }: { add: ShellNavItem }) {
    return (
        <Link
            href={add.href}
            aria-label={add.label}
            className="g-row-press fixed end-g-4 z-40 grid size-14 place-items-center rounded-g-pill bg-action-primary-bg text-fg-on-brand shadow-g-overlay tablet:hidden focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
            style={{ bottom: "calc(var(--spacing-g-tabbar) + env(safe-area-inset-bottom) + var(--spacing-g-3))" }}
        >
            <NAV_ICONS.plus className="size-7" strokeWidth={2.4} aria-hidden />
        </Link>
    )
}
