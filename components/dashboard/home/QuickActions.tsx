import Link from "next/link"
import { Zap, type LucideIcon } from "lucide-react"
import { CardHead } from "./CardHead"

/**
 * «Γρήγορες ενέργειες» — shortcuts to things a person DOES, not places they
 * browse. The home filters out any action whose destination the next-step
 * banner already offers, so the page never asks for the same thing twice
 * (the §11 gated-duplicate measurement counted exactly that on the old home:
 * three uploads offers on a three-screen page).
 */
export interface QuickAction {
    id: string
    href: string
    label: string
    icon: LucideIcon
}

export function QuickActions({ title, actions }: { title: string; actions: QuickAction[] }) {
    if (actions.length === 0) return null
    return (
        <section className="pw-card pw-pad @container" aria-labelledby="quick-actions-heading">
            <CardHead icon={Zap} title={title} id="quick-actions-heading" />
            {/* Container query, not viewport. The card is a half column beside
                the preventive card on desktop (≈240px inside) and full width on
                a phone (≈330px). Below @xs the tiles are ROWS — icon beside
                label — because two icon-over-label tiles at 115px broke
                «υπενθυμίσεις» mid-word on the first capture; from @xs two tiles
                fit whole words, and from @lg four do. */}
            <ul className="mt-4 grid grid-cols-1 gap-2 @xs:grid-cols-2 @lg:grid-cols-4">
                {actions.map((action) => (
                    <li key={action.id} className="min-w-0">
                        <Link
                            href={action.href}
                            data-quick-action={action.id}
                            className="pw-subcard flex min-h-11 items-center gap-3 p-3 transition-colors @xs:min-h-[5.5rem] @xs:flex-col @xs:items-start @xs:justify-between"
                        >
                            <span className="pw-card-chip" aria-hidden="true">
                                <action.icon className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <span className="text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
                                {action.label}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
