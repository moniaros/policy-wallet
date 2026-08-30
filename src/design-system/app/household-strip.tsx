import Link from "next/link"
import { cn } from "@/lib/utils"
import { Avatar, StatusChip } from "../primitives"
import type { ProtectionState } from "@/lib/app/state"

export interface HouseholdPersonCard {
    id: string
    name: string
    state: ProtectionState
    /** «3 ασφαλιστήρια» — already pluralised. */
    countLabel: string
    href: string
}

/** HouseholdStrip (§5.3): people with a per-person state; the add action at the end. */
export function HouseholdStrip({ people, stateLabels, add, className }: { people: HouseholdPersonCard[]; stateLabels: Record<ProtectionState, string>; add: { href: string; label: string }; className?: string }) {
    return (
        <ul className={cn("pw-scroll-strip flex gap-g-3 overflow-x-auto px-g-4 pb-g-2 tablet:flex-wrap tablet:px-0", className)}>
            {people.map((p) => (
                <li key={p.id} className="shrink-0">
                    <Link href={p.href} className="g-row-press flex min-h-16 min-w-[11rem] items-center gap-g-3 rounded-g-card border border-border-hair bg-surface-raised px-g-3 py-g-2 shadow-g-raised focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus">
                        <Avatar name={p.name} size="sm" />
                        <span className="min-w-0">
                            <span className="block truncate text-g-app-body font-semibold text-fg-primary">{p.name}</span>
                            <span className="block text-g-app-caption text-fg-secondary">{p.countLabel}</span>
                        </span>
                        <StatusChip state={p.state} className="ms-auto">{stateLabels[p.state]}</StatusChip>
                    </Link>
                </li>
            ))}
            <li className="shrink-0">
                <Link href={add.href} className="g-row-press flex min-h-16 items-center rounded-g-card border border-dashed border-border-strong px-g-4 text-g-app-body font-medium text-fg-brand focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus">
                    + {add.label}
                </Link>
            </li>
        </ul>
    )
}
