import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge, StatusChip } from "../primitives"
import { GroupedList } from "../app-layout"
import type { FindingKind, ProtectionState } from "@/lib/app/state"

const KIND_STATE: Record<FindingKind, ProtectionState> = { gap: "gap", expiry: "gap", review: "review" }

/**
 * ActionRow (§5.3): a finding compressed to one row — verb-first sentence,
 * the source line, a trailing days figure or chevron. The whole row is the link.
 */
export function ActionRow({
    kind,
    sentence,
    source,
    trailing,
    href,
    className,
}: {
    kind: FindingKind
    sentence: string
    source: string
    /** «8 ημ.» or nothing (then a chevron). */
    trailing?: string
    href: string
    className?: string
}) {
    const state = KIND_STATE[kind]
    return (
        <li className={className}>
            <Link
                href={href}
                className="g-nav-item g-row-press flex min-h-16 items-center gap-g-3 px-g-4 py-g-3 text-start focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus [-webkit-tap-highlight-color:transparent]"
            >
                <span aria-hidden className={cn("mt-1 size-3 shrink-0 self-start rounded-g-pill", state === "gap" ? "bg-state-gap" : "bg-state-review")} />
                <span className="min-w-0 flex-1">
                    <span className="block text-g-row text-fg-primary">{sentence}</span>
                    <span className="mt-0.5 block text-g-app-body-sm text-fg-secondary">{source}</span>
                </span>
                <span className="shrink-0 text-g-app-body-sm tabular-nums text-fg-secondary">{trailing ?? <span aria-hidden className="text-fg-faint">›</span>}</span>
            </Link>
        </li>
    )
}

/** A list of ActionRows with the accessible name of the section. */
export function ActionRowList({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
    return <GroupedList label={label} className={className}>{children}</GroupedList>
}

/** TierHeader (§5.3): τώρα / αυτόν τον μήνα / όταν έχετε χρόνο with a one-line definition. */
export function TierHeader({ title, definition, count, id }: { title: string; definition: string; count?: number; id?: string }) {
    return (
        <div className="px-g-4 pb-g-3 pt-g-6 tablet:px-0">
            <h2 id={id} className="flex items-center gap-g-2 text-g-heading text-fg-primary">
                <span>{title}</span>
                {typeof count === "number" && <Badge>{count}</Badge>}
            </h2>
            <p className="mt-g-1 text-g-app-caption text-fg-faint">{definition}</p>
        </div>
    )
}

/** The three-state chip for a finding's kind — expiry renders in the gap colour but keeps its own word. */
export function KindChip({ kind, label }: { kind: FindingKind; label: string }) {
    return <StatusChip state={KIND_STATE[kind]}>{label}</StatusChip>
}
