import Link from "next/link"
import { cn } from "@/lib/utils"
import { StatusChip } from "../primitives"
import type { ProtectionState } from "@/lib/app/state"

export interface ExpiryItem {
    id: string
    label: string
    /** «σε 8 ημέρες» / «8 Σεπ» — already formatted. */
    when: string
    state: ProtectionState
    href: string
}

/** ExpiryRail (§5.3): horizontal scroll-snap cards for the next expiries. Uses the strip primitive so it actually scrolls. */
export function ExpiryRail({ items, label, stateLabels, className }: { items: ExpiryItem[]; label: string; stateLabels: Record<ProtectionState, string>; className?: string }) {
    return (
        <ul aria-label={label} className={cn("pw-scroll-strip flex snap-x snap-mandatory gap-g-3 overflow-x-auto px-g-4 pb-g-2 tablet:px-0", className)}>
            {items.map((i) => (
                <li key={i.id} className="w-[72%] shrink-0 snap-start tablet:w-[16rem]">
                    <Link href={i.href} className="g-row-press flex min-h-20 flex-col justify-between rounded-g-card border border-border-hair bg-surface-raised p-g-3 shadow-g-raised focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus">
                        <span className="truncate text-g-app-body font-semibold text-fg-primary">{i.label}</span>
                        <span className="mt-g-2 flex items-center justify-between gap-g-2">
                            <span className="text-g-app-body-sm tabular-nums text-fg-secondary">{i.when}</span>
                            <StatusChip state={i.state}>{stateLabels[i.state]}</StatusChip>
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    )
}
