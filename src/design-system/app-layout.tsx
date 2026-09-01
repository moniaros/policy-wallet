import Link from "next/link"
import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Application layout (§5.3). `AppSection` owns the section gap (26px on the
 * phone, 32px from tablet — one token); `GroupedList` owns the hairline logic
 * (0.5px separators indented past the 70px icon column); `Row` is the whole-
 * row target: icon · text · trailing, ≥ 64px, and the row itself is the link
 * or the button — never a small icon inside it.
 */
export function AppSection({
    id,
    title,
    titleId,
    trailing,
    children,
    className,
    as,
}: {
    /** The `section[id]` landmark the measure harness counts. */
    id: string
    title?: ReactNode
    titleId?: string
    trailing?: ReactNode
    children: ReactNode
    className?: string
    as?: ElementType
}) {
    const Tag: ElementType = as ?? "section"
    const headingId = titleId ?? `${id}-title`
    return (
        <Tag id={id} aria-labelledby={title ? headingId : undefined} className={cn("[padding-block-start:var(--space-app-section)] px-g-4 tablet:px-0", className)}>
            {title && (
                <div className="mb-g-3 flex items-end justify-between gap-g-3">
                    <h2 id={headingId} className="text-g-heading text-fg-primary">{title}</h2>
                    {trailing}
                </div>
            )}
            {children}
        </Tag>
    )
}

/** The month/tier-style group header — sentence case («Αυτοκίνητο · 3»); the app tier renders no uppercase Greek. */
export function GroupHeader({ children, count, className }: { children: ReactNode; count?: number; className?: string }) {
    return (
        <div className={cn("flex items-baseline gap-g-2 px-g-4 pb-g-2 pt-g-4 text-g-app-body-sm font-semibold text-fg-secondary tablet:px-0", className)}>
            <span>{children}</span>
            {typeof count === "number" && <span className="tabular-nums">· {count}</span>}
        </div>
    )
}

export function GroupedList({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
    return (
        <ul aria-label={label} className={cn("overflow-hidden rounded-g-card border border-border-hair bg-surface-raised shadow-g-raised", "[&>li+li]:border-t [&>li+li]:border-border-hair [&>li+li]:[border-top-width:0.5px]", className)}>
            {children}
        </ul>
    )
}

export interface RowProps {
    icon?: ReactNode
    /** Classes for the icon's BOX, not its contents — the box is what reserves
     *  space, so gating the icon itself would leave an empty square behind. */
    iconClassName?: string
    primary: ReactNode
    secondary?: ReactNode
    trailing?: ReactNode
    href?: string
    onClick?: () => void
    /** Icon-column indent so the hairline starts past the icon (70px). */
    className?: string
    ariaLabel?: string
}

/** One row, one target. With `href` it is a link; with `onClick` a button; otherwise static. */
export function Row({ icon, iconClassName, primary, secondary, trailing, href, onClick, className, ariaLabel }: RowProps) {
    const inner = (
        <>
            {icon && <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-g-control bg-surface-sunken text-fg-brand", iconClassName)}>{icon}</span>}
            <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-g-row text-fg-primary">{primary}</span>
                {secondary && <span className="mt-0.5 line-clamp-2 block text-g-app-body-sm text-fg-secondary">{secondary}</span>}
            </span>
            {trailing && <span className="flex shrink-0 items-center gap-g-2 text-g-app-body-sm tabular-nums text-fg-secondary">{trailing}</span>}
        </>
    )
    const base = cn(
        "flex min-h-16 w-full items-center gap-g-3 px-g-4 py-g-3 text-start",
        (href || onClick) && "g-nav-item g-row-press [-webkit-tap-highlight-color:transparent] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus",
        className
    )
    if (href) {
        return (
            <li>
                <Link href={href} aria-label={ariaLabel} className={base}>
                    {inner}
                    <span aria-hidden className="text-fg-faint">›</span>
                </Link>
            </li>
        )
    }
    if (onClick) {
        return (
            <li>
                <button type="button" aria-label={ariaLabel} onClick={onClick} className={base}>
                    {inner}
                </button>
            </li>
        )
    }
    return <li className={base}>{inner}</li>
}

export function Grid({ children, className, columns = "auto" }: { children: ReactNode; className?: string; columns?: "auto" | 2 | 3 | 4 }) {
    return (
        <div
            className={cn(
                "grid gap-g-3",
                columns === "auto" && "grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]",
                columns === 2 && "grid-cols-2",
                columns === 3 && "grid-cols-2 tablet:grid-cols-3",
                columns === 4 && "grid-cols-2 tablet:grid-cols-4",
                className
            )}
        >
            {children}
        </div>
    )
}
