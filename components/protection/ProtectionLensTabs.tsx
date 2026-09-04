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
 *
 * Direction A (2026-09-03): a segmented control on the sunken surface — the
 * active lens is the white segment, not a brand-green pill. Green is the
 * page's one primary action; a view switch is not an action. The recipe
 * (`.pw-segmented` / `.pw-segment`, app/globals.css) reads the active state
 * from aria-current, so the visual and the announced state are one fact.
 */
export function ProtectionLensTabs({ active, labels }: ProtectionLensTabsProps) {
    const base = "pw-segment min-h-11 px-4"

    return (
        <nav aria-label={labels.aria} className="pw-segmented">
            <Link
                href="/protection"
                aria-current={active === "branch" ? "page" : undefined}
                className={base}
            >
                {labels.byBranch}
            </Link>
            <Link
                href="/protection?lens=risk"
                aria-current={active === "risk" ? "page" : undefined}
                className={base}
            >
                {labels.byRisk}
            </Link>
        </nav>
    )
}
