import Link from "next/link"
import { ChevronRight, HelpCircle } from "lucide-react"

import { CardHead } from "@/components/dashboard/home/CardHead"
import type { UnknownFactorItemView } from "@/components/protection/area-detail-model"
import type { getTranslations } from "@/lib/i18n"

type NeedsCopy = ReturnType<typeof getTranslations>["protection"]["attention"]["needs"]

/**
 * «Τι χρειάζεται ακόμη να καταλάβουμε» — the engine's `factorsToResolve`
 * (docs/planning/PERSONAL_RISK_PROFILE.md §A: computed on every run and
 * rendered nowhere until now) as the question table's nouns, each naming the
 * area it unlocks and linking to that area's detail, where it is asked.
 */
export function UnknownFactorsCard({
    items,
    copy,
    headingId = "unknown-factors-heading",
}: {
    items: UnknownFactorItemView[]
    copy: NeedsCopy
    headingId?: string
}) {
    return (
        <section className="pw-card pw-pad" aria-labelledby={headingId}>
            <CardHead icon={HelpCircle} title={copy.title} id={headingId} />
            {items.length === 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-foreground">{copy.none}</p>
            ) : (
                <>
                    <p className="mt-3 text-caption leading-relaxed text-muted-foreground">{copy.lead}</p>
                    <ul className="mt-3 space-y-2">
                        {items.map((item) => (
                            <li key={item.factor}>
                                <Link
                                    href={item.href}
                                    data-factor={item.factor}
                                    className="pw-subcard flex min-h-11 items-center gap-3 px-3.5 py-2.5 transition-colors"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-foreground [overflow-wrap:anywhere]">{item.noun}</span>
                                        <span className="block text-caption text-muted-foreground">{copy.unlocks.replace("{area}", item.areaLabel)}</span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    )
}
