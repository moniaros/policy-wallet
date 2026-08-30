/**
 * Grafí layout. `Section` owns the vertical rhythm — ONE token, applied
 * identically everywhere, which is the whole fix for the inconsistent-rhythm
 * finding. Pages never set their own section padding.
 */
import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Section({
    children,
    wash = false,
    className,
    as,
    id,
    labelledBy,
}: {
    children: ReactNode
    /** green-100 band — used sparingly to alternate blocks. */
    wash?: boolean
    className?: string
    as?: ElementType
    id?: string
    labelledBy?: string
}) {
    const Tag: ElementType = as ?? "section"
    return (
        <Tag
            id={id}
            aria-labelledby={labelledBy}
            className={cn("[padding-block:var(--space-section)]", wash && "bg-surface-wash", className)}
        >
            {children}
        </Tag>
    )
}

export function Container({
    children,
    className,
    narrow = false,
}: {
    children: ReactNode
    className?: string
    /** prose width (66ch) instead of the 1180px grid */
    narrow?: boolean
}) {
    return (
        <div
            className={cn(
                "mx-auto w-full px-g-6 md:px-g-8",
                narrow ? "max-w-[66ch]" : "max-w-[1180px]",
                className
            )}
        >
            {children}
        </div>
    )
}

export function Stack({
    children,
    gap = "g-4",
    className,
}: {
    children: ReactNode
    gap?: "g-2" | "g-3" | "g-4" | "g-6" | "g-8"
    className?: string
}) {
    const gaps = { "g-2": "gap-g-2", "g-3": "gap-g-3", "g-4": "gap-g-4", "g-6": "gap-g-6", "g-8": "gap-g-8" } as const
    return <div className={cn("flex flex-col", gaps[gap], className)}>{children}</div>
}

/* ── Content atoms ──────────────────────────────────────────────────── */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
    // The `label` type step: uppercase is permitted ONLY here, only short words.
    return (
        <p className={cn("text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-fg-brand", className)}>
            {children}
        </p>
    )
}

export function SectionHeading({
    eyebrow,
    title,
    lead,
    id,
    className,
    align = "start",
}: {
    eyebrow?: ReactNode
    title: ReactNode
    lead?: ReactNode
    id?: string
    className?: string
    align?: "start" | "center"
}) {
    return (
        <header className={cn("max-w-[56ch]", align === "center" && "mx-auto text-center", className)}>
            {eyebrow && <Eyebrow className="mb-g-3">{eyebrow}</Eyebrow>}
            <h2 id={id} className="text-balance text-[clamp(1.85rem,3.4vw,2.85rem)] font-bold leading-[1.12] tracking-[-0.01em] text-fg-primary">
                {title}
            </h2>
            {lead && <p className="mt-g-4 text-[1.08rem] leading-[1.45] text-fg-secondary">{lead}</p>}
        </header>
    )
}

export function SourceNote({ children, className }: { children: ReactNode; className?: string }) {
    // Sources are named and dated, in the caption step — never buried in a title attribute.
    return <p className={cn("text-[0.83rem] leading-relaxed text-fg-secondary", className)}>{children}</p>
}
