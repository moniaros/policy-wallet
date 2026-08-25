import Link from "next/link"

export type ProtectionLens = "branch" | "risk"

export interface ProtectionLensTabsProps {
    active: ProtectionLens
    labels: { aria: string; byBranch: string; byRisk: string }
}

/**
 * The lens switcher of /protection — «ανά κλάδο» / «ανά κίνδυνο» (§4.2).
 *
 * Links, not client state: the lens is addressable (`/protection?lens=risk`),
 * the server renders exactly one lens per request, and only one lens's
 * data-count keys are ever in the DOM at a time — two lenses stating the same
 * fact in one DOM is exactly what the §6.7 count-consistency scan would flag.
 */
export function ProtectionLensTabs({ active, labels }: ProtectionLensTabsProps) {
    const base =
        "inline-flex min-h-11 flex-shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-caption font-semibold transition-colors"
    const activeStyle = "border-primary bg-primary text-white dark:text-[#1A2420]"
    const idleStyle =
        "border-black/12 text-black/65 hover:bg-black/4 dark:border-white/15 dark:text-white/65 dark:hover:bg-white/6"

    return (
        <nav aria-label={labels.aria} className="flex gap-2">
            <Link
                href="/protection"
                aria-current={active === "branch" ? "page" : undefined}
                className={`${base} ${active === "branch" ? activeStyle : idleStyle}`}
            >
                {labels.byBranch}
            </Link>
            <Link
                href="/protection?lens=risk"
                aria-current={active === "risk" ? "page" : undefined}
                className={`${base} ${active === "risk" ? activeStyle : idleStyle}`}
            >
                {labels.byRisk}
            </Link>
        </nav>
    )
}
